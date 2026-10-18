import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { HttpError, badRequest, notFound } from '../lib/errors.js';
import {
  AUDIO_PATH,
  MAX_AUDIO_BYTES,
  UUID,
  audioSizeProblem,
  audioTypeProblem,
  hashIp,
  parseFeedback,
  parseSampleInput,
  parseUploadRequest,
  summarize,
} from '../lib/evaluation.js';
import {
  endEvaluatorSession,
  publicEvaluateUser,
  requireEvaluateAccess,
  requireEvaluateAdmin,
  startEvaluatorSession,
} from '../middleware/evaluate.js';
import { audioBucket, must, selectAll, supabase } from '../supabase.js';

const router = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
const SAMPLE_COLUMNS = 'id, title, transcript, transcript_filename, system, audio_path, audio_filename, audio_type, audio_size, active, uploaded_by, uploaded_by_role, uploaded_by_id, created_at, updated_at';
const SCORE_COLUMNS = 'sample_id, overall, clarity, naturalness, passed';

const limiter = (windowMinutes, limit) =>
  rateLimit({ windowMs: windowMinutes * 60 * 1000, limit, standardHeaders: 'draft-8', legacyHeaders: false });
const loginLimiter = limiter(15, 10);
const feedbackLimiter = limiter(60, 60);

const audioUrl = (path) => audioBucket().getPublicUrl(path).data.publicUrl;
const raterHash = (req) => hashIp(req.ip, config.feedbackIpSecret);

function consoleSample(row, feedback = []) {
  return {
    id: row.id,
    title: row.title,
    transcript: row.transcript,
    transcriptFilename: row.transcript_filename,
    system: row.system,
    audioUrl: audioUrl(row.audio_path),
    audioFilename: row.audio_filename,
    audioType: row.audio_type,
    audioSize: row.audio_size,
    active: row.active,
    uploadedBy: row.uploaded_by,
    uploadedByRole: row.uploaded_by_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    summary: summarize(feedback),
  };
}

// Evaluators look after the clips they uploaded; administrators look after all of them.
function canManage(user, sample) {
  return user.role === 'admin' || (sample.uploaded_by_role === 'evaluator' && sample.uploaded_by_id === user.id);
}

async function findSample(id) {
  if (!UUID.test(id)) throw notFound('Clip not found');
  const sample = must(await supabase().from('evaluation_samples').select(SAMPLE_COLUMNS).eq('id', id).maybeSingle());
  if (!sample) throw notFound('Clip not found');
  return sample;
}

// ── Public listening test ──────────────────────────────────────────────────

router.get('/samples', async (req, res) => {
  const db = supabase();
  const samples = must(
    await db.from('evaluation_samples').select('id, title, transcript, audio_path, created_at').eq('active', true).order('created_at'),
  );
  const rated = new Set();
  if (samples.length) {
    const mine = must(await db.from('evaluation_feedback').select('sample_id').eq('ip_hash', raterHash(req)));
    mine.forEach((row) => rated.add(row.sample_id));
  }
  res.set('Cache-Control', 'private, no-store').json({
    samples: samples.map((s) => ({
      id: s.id,
      title: s.title,
      transcript: s.transcript,
      audioUrl: audioUrl(s.audio_path),
      rated: rated.has(s.id),
    })),
  });
});

router.post('/samples/:id/feedback', feedbackLimiter, async (req, res) => {
  // Bots fill every field; people never see this one.
  if (req.body?.website) return res.status(202).json({ ok: true });
  const feedback = parseFeedback(req.body);
  const sample = await findSample(req.params.id);
  if (!sample.active) throw notFound('This clip is no longer part of the evaluation.');

  const { error } = await supabase()
    .from('evaluation_feedback')
    .insert({ sample_id: sample.id, ip_hash: raterHash(req), ...feedback });
  if (error?.code === '23505') throw new HttpError(409, 'A response for this clip has already been sent from your network. Thank you!');
  must({ error });
  res.status(201).json({ ok: true });
});

// ── Evaluator sign-in ──────────────────────────────────────────────────────

router.post('/auth/login', loginLimiter, async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email || !password) throw badRequest('Enter your email and password.');

  const evaluator = must(
    await supabase().from('evaluators').select('id, email, name, password_hash').eq('email', email).maybeSingle(),
  );
  const ok = await bcrypt.compare(password, evaluator?.password_hash ?? DUMMY_HASH);
  if (!evaluator || !ok) throw new HttpError(401, 'That email and password do not match.');

  startEvaluatorSession(res, evaluator);
  res.json({ user: publicEvaluateUser({ ...evaluator, role: 'evaluator' }) });
});

router.post('/auth/logout', (_req, res) => {
  endEvaluatorSession(res);
  res.status(204).end();
});

router.get('/auth/me', requireEvaluateAccess, (req, res) => {
  res.json({ user: publicEvaluateUser(req.evaluateUser) });
});

// ── Console: clips ─────────────────────────────────────────────────────────

const consoleRouter = Router();
consoleRouter.use(requireEvaluateAccess);

// Clips can be up to 10 MB, more than a serverless request may carry, so the
// browser uploads straight to Supabase Storage with a one-off signed URL.
consoleRouter.post('/uploads', async (req, res) => {
  const upload = parseUploadRequest(req.body);
  const path = `samples/${crypto.randomUUID()}.${upload.extension}`;
  const signed = must(await audioBucket().createSignedUploadUrl(path));
  res.status(201).json({ path, signedUrl: signed.signedUrl, contentType: upload.contentType, maxBytes: MAX_AUDIO_BYTES });
});

// By the time a clip is registered its audio is already in Storage, so every
// rejection from here on removes the upload rather than leaving it orphaned.
async function discardUpload(audioPath) {
  const { error } = await audioBucket().remove([audioPath]);
  if (error) console.warn(`[evaluate] could not remove rejected upload ${audioPath}`, error);
}

consoleRouter.post('/samples', async (req, res) => {
  const user = req.evaluateUser;
  const audioPath = String(req.body?.audioPath ?? '');
  if (!AUDIO_PATH.test(audioPath)) throw badRequest('Upload the audio file first.');
  // A path already in use belongs to a live clip; never touch its audio.
  const existing = must(await supabase().from('evaluation_samples').select('id').eq('audio_path', audioPath).maybeSingle());
  if (existing) throw new HttpError(409, 'This upload has already been saved as a clip.');

  let fields;
  try {
    fields = parseSampleInput(req.body);
  } catch (err) {
    await discardUpload(audioPath);
    throw err;
  }

  // Trust what Storage holds, not what the browser says it sent.
  const { data: info, error } = await audioBucket().info(audioPath);
  if (error || !info) throw badRequest('The audio upload did not finish. Please upload it again.');
  const size = Number(info.size ?? info.metadata?.size);
  const type = String(info.contentType ?? info.metadata?.mimetype ?? req.body?.audioType ?? '').toLowerCase();
  const problem = audioSizeProblem(size) ?? audioTypeProblem(type);
  if (problem) {
    await discardUpload(audioPath);
    throw badRequest(problem, { audio: problem });
  }

  const inserted = await supabase()
    .from('evaluation_samples')
    .insert({
      ...fields,
      audio_path: audioPath,
      audio_filename: String(req.body?.audioFilename ?? '').trim().slice(0, 200) || audioPath.split('/').pop(),
      audio_type: type,
      audio_size: size,
      uploaded_by: user.email,
      uploaded_by_role: user.role,
      uploaded_by_id: user.id,
    })
    .select(SAMPLE_COLUMNS)
    .single();
  // A unique-path conflict means a simultaneous request saved this upload first.
  if (inserted.error?.code === '23505') throw new HttpError(409, 'This upload has already been saved as a clip.');
  if (inserted.error) await discardUpload(audioPath);
  const row = must(inserted);
  res.status(201).json({ sample: consoleSample(row) });
});

consoleRouter.get('/samples', async (req, res) => {
  const db = supabase();
  const [samples, scores] = await Promise.all([
    selectAll(() => db.from('evaluation_samples').select(SAMPLE_COLUMNS).order('created_at', { ascending: false })),
    selectAll(() => db.from('evaluation_feedback').select(SCORE_COLUMNS).order('created_at')),
  ]);
  const bySample = Map.groupBy(scores, (row) => row.sample_id);
  res.json({
    samples: samples.map((s) => ({ ...consoleSample(s, bySample.get(s.id)), canManage: canManage(req.evaluateUser, s) })),
  });
});

consoleRouter.get('/samples/:id', async (req, res) => {
  const sample = await findSample(req.params.id);
  const feedback = await selectAll(() =>
    supabase()
      .from('evaluation_feedback')
      .select('id, overall, clarity, naturalness, passed, comment, created_at')
      .eq('sample_id', sample.id)
      .order('created_at', { ascending: false }),
  );
  res.json({
    sample: { ...consoleSample(sample, feedback), canManage: canManage(req.evaluateUser, sample) },
    feedback: feedback.map((f) => ({
      id: f.id,
      overall: f.overall,
      clarity: f.clarity,
      naturalness: f.naturalness,
      passed: f.passed,
      comment: f.comment,
      createdAt: f.created_at,
    })),
  });
});

consoleRouter.patch('/samples/:id', async (req, res) => {
  const sample = await findSample(req.params.id);
  if (!canManage(req.evaluateUser, sample)) throw new HttpError(403, 'You can only change clips you uploaded.');
  const fields = parseSampleInput(req.body, { partial: true });
  const row = must(
    await supabase()
      .from('evaluation_samples')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', sample.id)
      .select(SAMPLE_COLUMNS)
      .single(),
  );
  res.json({ sample: consoleSample(row) });
});

consoleRouter.delete('/samples/:id', async (req, res) => {
  const sample = await findSample(req.params.id);
  if (!canManage(req.evaluateUser, sample)) throw new HttpError(403, 'You can only delete clips you uploaded.');
  // Feedback rows go with the clip (on delete cascade).
  must(await supabase().from('evaluation_samples').delete().eq('id', sample.id));
  const { error } = await audioBucket().remove([sample.audio_path]);
  if (error) console.warn(`[evaluate] clip ${sample.id} deleted but its audio could not be removed`, error);
  res.status(204).end();
});

// Every response, one row each, for analysis outside the console. The rater
// column is a truncated IP hash: it groups one listener's answers, nothing more.
consoleRouter.get('/export', async (_req, res) => {
  const rows = await selectAll(() =>
    supabase()
      .from('evaluation_feedback')
      .select('id, sample_id, ip_hash, overall, clarity, naturalness, passed, comment, created_at, evaluation_samples(title, system)')
      .order('created_at'),
  );
  res.set('Cache-Control', 'private, no-store').json({
    rows: rows.map((r) => ({
      sampleId: r.sample_id,
      title: r.evaluation_samples?.title ?? '',
      system: r.evaluation_samples?.system ?? '',
      rater: r.ip_hash.slice(0, 12),
      overall: r.overall,
      clarity: r.clarity,
      naturalness: r.naturalness,
      verdict: r.passed ? 'pass' : 'fail',
      comment: r.comment,
      createdAt: r.created_at,
    })),
  });
});

// ── Console: evaluator accounts (administrators only) ──────────────────────

consoleRouter.get('/evaluators', requireEvaluateAdmin, async (_req, res) => {
  const evaluators = must(
    await supabase().from('evaluators').select('id, email, name, created_by, created_at').order('created_at', { ascending: false }),
  );
  res.json({
    evaluators: evaluators.map((e) => ({ id: e.id, email: e.email, name: e.name, createdBy: e.created_by, createdAt: e.created_at })),
  });
});

consoleRouter.post('/evaluators', requireEvaluateAdmin, async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const name = String(req.body?.name ?? '').trim();
  const password = String(req.body?.password ?? '');
  const details = {};
  if (!EMAIL.test(email) || email.length > 200) details.email = 'Enter a valid email address.';
  if (name.length > 120) details.name = 'Keep the name under 120 characters.';
  if (password.length < 10) details.password = 'Use a password of at least 10 characters.';
  if (Object.keys(details).length) throw badRequest('Please check the form.', details);

  const { data, error } = await supabase()
    .from('evaluators')
    .insert({ email, name, password_hash: await bcrypt.hash(password, 12), created_by: req.evaluateUser.email })
    .select('id, email, name, created_by, created_at')
    .single();
  if (error?.code === '23505') throw new HttpError(409, 'An evaluator with that email already exists.');
  must({ error });
  res.status(201).json({
    evaluator: { id: data.id, email: data.email, name: data.name, createdBy: data.created_by, createdAt: data.created_at },
  });
});

consoleRouter.delete('/evaluators/:id', requireEvaluateAdmin, async (req, res) => {
  if (!UUID.test(req.params.id)) throw notFound('Evaluator not found');
  const removed = must(await supabase().from('evaluators').delete().eq('id', req.params.id).select('id'));
  if (!removed.length) throw notFound('Evaluator not found');
  res.status(204).end();
});

router.use('/console', consoleRouter);

export default router;
