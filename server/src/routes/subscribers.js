import { Router } from 'express';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { Subscriber } from '../models/Subscriber.js';
import { badRequest, notFound } from '../lib/errors.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const token = () => crypto.randomBytes(24).toString('hex');

const subscribeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false });

router.post('/', subscribeLimiter, async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  if (!EMAIL.test(email) || email.length > 200) throw badRequest('Enter a valid email address.');

  let subscriber = await Subscriber.findOne({ email });
  if (subscriber?.status === 'active') {
    return res.json({ status: 'active', message: 'You are already subscribed.' });
  }
  subscriber ??= new Subscriber({ email, unsubscribeToken: token() });
  subscriber.unsubscribeToken ||= token();
  subscriber.status = 'active';
  subscriber.confirmedAt = new Date();
  subscriber.confirmToken = undefined;
  subscriber.lastConfirmSentAt = undefined;
  await subscriber.save();

  res.status(201).json({ status: 'active', message: 'You are subscribed.' });
});

router.post('/confirm', async (req, res) => {
  const confirmToken = String(req.body?.token ?? '');
  if (!confirmToken) throw badRequest('Missing token');
  const subscriber = await Subscriber.findOne({ confirmToken });
  if (!subscriber) throw notFound('This confirmation link is invalid or has already been used.');

  subscriber.status = 'active';
  subscriber.confirmedAt = new Date();
  subscriber.confirmToken = undefined;
  await subscriber.save();
  res.json({ status: 'active', email: subscriber.email });
});

router.post('/unsubscribe', async (req, res) => {
  const unsubscribeToken = String(req.body?.token ?? '');
  if (!unsubscribeToken) throw badRequest('Missing token');
  const subscriber = await Subscriber.findOneAndUpdate({ unsubscribeToken }, { status: 'unsubscribed' });
  if (!subscriber) throw notFound('This unsubscribe link is invalid.');
  res.json({ status: 'unsubscribed', email: subscriber.email });
});

// Admin
router.get('/', requireAdmin, async (req, res) => {
  const subscribers = await Subscriber.find().select('email status confirmedAt createdAt').sort({ createdAt: -1 }).lean();
  res.json({ subscribers });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const result = await Subscriber.findByIdAndDelete(req.params.id);
  if (!result) throw notFound('Subscriber not found');
  res.status(204).end();
});

export default router;
