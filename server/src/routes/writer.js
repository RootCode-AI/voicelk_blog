import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { HttpError, badRequest } from '../lib/errors.js';
import { endBloggerSession, publicBlogger, requireBlogger, startBloggerSession } from '../middleware/blogger.js';
import { Blogger } from '../models/Blogger.js';
import { bloggerScope, createPostsRouter } from './adminPosts.js';

// The writing desk's API: bloggers sign in here and manage their own posts.
const router = Router();

// Compared against when the email is unknown, so every wrong guess takes as long.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });

router.post('/auth/login', loginLimiter, async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!email || !password) throw badRequest('Enter your email and password.');

  const blogger = await Blogger.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, blogger?.passwordHash ?? DUMMY_HASH);
  if (!blogger || !ok) throw new HttpError(401, 'That email and password do not match.');

  startBloggerSession(res, blogger);
  res.json({ user: publicBlogger(blogger) });
});

router.post('/auth/logout', (_req, res) => {
  endBloggerSession(res);
  res.status(204).end();
});

router.get('/auth/me', requireBlogger, (req, res) => {
  res.json({ user: publicBlogger(req.blogger) });
});

router.use('/posts', requireBlogger, createPostsRouter(bloggerScope));

export default router;
