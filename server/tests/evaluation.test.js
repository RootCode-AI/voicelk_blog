import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import express from 'express';
import {
  AUDIO_PATH,
  MAX_AUDIO_BYTES,
  hashIp,
  parseFeedback,
  parseSampleInput,
  parseUploadRequest,
  summarize,
} from '../src/lib/evaluation.js';
import {
  ALLOWED_AUDIO_MIME_TYPES,
  MAX_TEXT_FILE_BYTES,
  MAX_TRANSCRIPT_CHARS,
  audioSizeProblem,
  audioTypeOf,
  audioTypeProblem,
  textFileSizeProblem,
  transcriptProblem,
} from '../../shared/evaluation.js';
import { pageMetadata, renderSitemap } from '../src/lib/seo.js';
import { createSeoRouter } from '../src/routes/seo.js';

const valid = { overall: 4, clarity: 5, naturalness: 3, verdict: 'pass', comment: '  Clear, a little flat.  ' };

test('feedback needs three 1–5 ratings and a pass or fail verdict', () => {
  assert.deepEqual(parseFeedback(valid), { overall: 4, clarity: 5, naturalness: 3, passed: true, comment: 'Clear, a little flat.' });
  assert.equal(parseFeedback({ ...valid, verdict: 'FAIL', comment: undefined }).passed, false);

  for (const bad of [{ overall: 0 }, { clarity: 6 }, { naturalness: 2.5 }, { overall: '' }, { verdict: 'maybe' }, { comment: 'x'.repeat(2001) }]) {
    assert.throws(() => parseFeedback({ ...valid, ...bad }), (err) => err.status === 400 && Object.keys(err.details).length === 1);
  }
});

test('the IP hash is stable per address, keyed, and never the address itself', () => {
  const a = hashIp('203.0.113.7', 'secret');
  assert.equal(a, hashIp('::ffff:203.0.113.7', 'secret'));
  assert.notEqual(a, hashIp('203.0.113.8', 'secret'));
  assert.notEqual(a, hashIp('203.0.113.7', 'another secret'));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.ok(!a.includes('203'));
});

test('uploads are limited to audio of at most 10 MB', () => {
  assert.equal(MAX_AUDIO_BYTES, 10 * 1024 * 1024);
  assert.equal(parseUploadRequest({ filename: 'clip.wav', contentType: 'audio/wav', size: MAX_AUDIO_BYTES }).extension, 'wav');
  assert.throws(() => parseUploadRequest({ filename: 'clip.wav', contentType: 'audio/wav', size: MAX_AUDIO_BYTES + 1 }), /at most 10 MB/);
  assert.throws(() => parseUploadRequest({ filename: 'clip.mp4', contentType: 'video/mp4', size: 100 }), /video\/mp4 files can't be used/);
  assert.throws(() => parseUploadRequest({ filename: 'clip.wav', contentType: 'audio/wav', size: 0 }), /empty/);

  assert.match('samples/0b6f7c1e-7a7d-4a51-9d55-3f1f0f6f2a10.mp3', AUDIO_PATH);
  assert.doesNotMatch('samples/../secrets.mp3', AUDIO_PATH);
  assert.doesNotMatch('other/0b6f7c1e-7a7d-4a51-9d55-3f1f0f6f2a10.mp3', AUDIO_PATH);
});

test('the same size limits apply on both sides and reject a missing stored size', () => {
  // Exactly 10 MB is allowed; one byte more is not, and the message never claims "10.0 MB".
  assert.equal(audioSizeProblem(MAX_AUDIO_BYTES), null);
  assert.equal(audioSizeProblem(MAX_AUDIO_BYTES + 1), 'Audio files can be at most 10 MB; this one is 10.1 MB.');
  // Storage reporting no size must fail, not slip under the limit as zero.
  for (const missing of [undefined, null, Number.NaN, 0, -1]) assert.equal(audioSizeProblem(missing), 'That audio file is empty.');
  for (const declared of [1.5, null, 'ten']) {
    assert.throws(() => parseUploadRequest({ filename: 'clip.wav', contentType: 'audio/wav', size: declared }), /empty/);
  }
  // Rejections name the field, so the form can show them beside the audio picker.
  assert.throws(() => parseUploadRequest({ filename: 'clip.wav', contentType: 'audio/wav', size: MAX_AUDIO_BYTES + 1 }),
    (err) => err.status === 400 && err.details.audio === err.message);

  assert.equal(textFileSizeProblem(MAX_TEXT_FILE_BYTES), null);
  assert.match(textFileSizeProblem(MAX_TEXT_FILE_BYTES + 1), /keep it under 256 KB/);
  assert.equal(textFileSizeProblem(0), 'That text file is empty.');

  // The text limit counts characters, so Sinhala (3 bytes each in UTF-8) gets the full 20,000.
  assert.equal(transcriptProblem('අ'.repeat(MAX_TRANSCRIPT_CHARS)), null);
  assert.equal(transcriptProblem('අ'.repeat(MAX_TRANSCRIPT_CHARS + 1)), 'The text can be at most 20,000 characters; this has 20,001.');
  assert.throws(() => parseSampleInput({ title: 'Long', transcript: 'x'.repeat(MAX_TRANSCRIPT_CHARS + 1) }), (err) => /20,001/.test(err.details.transcript));
});

test('the Storage bucket allows exactly the MIME types the code accepts', async () => {
  const sql = await readFile(new URL('../supabase/evaluation.sql', import.meta.url), 'utf8');
  const bucketList = /array\[([^\]]+)\]/.exec(sql)[1].match(/'([^']+)'/g).map((t) => t.slice(1, -1));
  assert.deepEqual(bucketList, ALLOWED_AUDIO_MIME_TYPES);
  assert.ok(sql.includes('10485760'));
});

test('audio types are checked by MIME type, with the extension as a fallback', () => {
  for (const type of ALLOWED_AUDIO_MIME_TYPES) assert.equal(audioTypeProblem(type), null);
  assert.equal(audioTypeProblem('audio/x-ms-wma'), "audio/x-ms-wma files can't be used. Upload MP3, WAV, OGG, WebM, FLAC, M4A or AAC audio.");
  assert.match(audioTypeProblem('video/mp4'), /can't be used/);
  assert.match(audioTypeProblem(''), /^Upload MP3/);

  assert.equal(audioTypeOf({ type: 'audio/x-m4a', name: 'a.m4a' }), 'audio/x-m4a');
  assert.equal(audioTypeOf({ type: '', name: 'Take 3.FLAC' }), 'audio/flac');
  assert.equal(audioTypeOf({ type: '', name: 'notes.wma' }), '');
  assert.throws(() => parseUploadRequest({ filename: 'a.wma', contentType: 'audio/x-ms-wma', size: 10 }),
    (err) => err.status === 400 && /can't be used/.test(err.details.audio));
});

test('clip text keeps Sinhala intact and drops a byte-order mark', () => {
  const sample = parseSampleInput({ title: ' Greeting ', transcript: '\uFEFFමම office එකට යනවා.\r\n', system: 'pathnirwana' });
  assert.equal(sample.title, 'Greeting');
  assert.equal(sample.transcript, 'මම office එකට යනවා.');
  assert.throws(() => parseSampleInput({ title: '', transcript: '' }), (err) => Boolean(err.details.title && err.details.transcript));
  // A partial update only touches the fields it names.
  assert.deepEqual(parseSampleInput({ active: false }, { partial: true }), { active: false });
});

test('summaries report mean opinion scores, t-based 95% intervals, spread and pass rate', () => {
  const rows = [
    { overall: 5, clarity: 4, naturalness: 4, passed: true },
    { overall: 4, clarity: 4, naturalness: 3, passed: true },
    { overall: 3, clarity: 5, naturalness: 2, passed: false },
    { overall: 4, clarity: 3, naturalness: 3, passed: true },
  ];
  const summary = summarize(rows);
  assert.equal(summary.count, 4);
  assert.equal(summary.passRate, 0.75);
  assert.equal(summary.criteria.overall.mean, 4);
  assert.deepEqual(summary.criteria.overall.distribution, [0, 0, 1, 2, 1]);
  // sd = sqrt(2/3); t(3) = 3.182
  assert.ok(Math.abs(summary.criteria.overall.ci95 - 3.182 * (Math.sqrt(2 / 3) / 2)) < 1e-9);

  const one = summarize([rows[0]]);
  assert.equal(one.criteria.overall.mean, 5);
  assert.equal(one.criteria.overall.ci95, null);

  const none = summarize([]);
  assert.equal(none.passRate, null);
  assert.equal(none.criteria.clarity.mean, null);
});

test('the listening page renders publicly but stays out of search and the sitemap', async () => {
  const meta = pageMetadata({ path: '/evaluate' });
  assert.equal(meta.noIndex, true);
  assert.match(meta.title, /Rate VoiceLK speech/);
  assert.equal(pageMetadata({ path: '/evaluate/console' }).noIndex, true);
  assert.doesNotMatch(renderSitemap([]), /evaluate/);

  const template = await readFile(new URL('../../client/index.html', import.meta.url), 'utf8');
  const app = express();
  app.use(createSeoRouter({
    findPost: async () => null,
    listPosts: async () => ({ posts: [], hasMore: false }),
    sitemapPosts: async () => [],
    getTemplate: async () => template,
    preview: false,
  }));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const path of ['/evaluate', '/evaluate/login', '/evaluate/console', '/evaluate/console/clips/abc']) {
      const res = await fetch(base + path);
      assert.equal(res.status, 200, path);
      assert.equal(res.headers.get('x-robots-tag'), 'noindex, follow', path);
    }
    assert.match(await (await fetch(`${base}/evaluate`)).text(), /Rate VoiceLK speech/);
    assert.equal((await fetch(`${base}/evaluatex`)).status, 404);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
