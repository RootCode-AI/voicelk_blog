import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { Admin } from '../models/Admin.js';
import { HttpError } from '../lib/errors.js';
import { endSession, requireAdmin, startSession } from '../middleware/auth.js';

const router = Router();

// Compared against when the email is unknown, so a wrong email and a wrong
// password take the same time to answer.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

const publicAdmin = (a) => ({ id: a._id, email: a.email, name: a.name });

router.post('/login', loginLimiter, async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email || !password) throw new HttpError(400, 'Enter your email and password.');

  const admin = await Admin.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  if (!admin || !ok) throw new HttpError(401, 'That email and password do not match.');

  startSession(res, admin);
  res.json({ admin: publicAdmin(admin) });
});

router.post('/logout', (req, res) => {
  endSession(res);
  res.status(204).end();
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ admin: publicAdmin(req.admin) });
});

export default router;
