import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { Message } from '../models/Message.js';
import { badRequest, notFound } from '../lib/errors.js';
import { contactEmail } from '../lib/emails.js';
import { sendMail } from '../lib/mailer.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false });

router.post('/', contactLimiter, async (req, res) => {
  const name = String(req.body?.name ?? '').trim();
  const email = String(req.body?.email ?? '').trim();
  const message = String(req.body?.message ?? '').trim();
  // Bots fill every field; people never see this one.
  if (req.body?.website) return res.status(202).json({ ok: true });

  const details = {};
  if (!name) details.name = 'Tell us your name.';
  if (!EMAIL.test(email)) details.email = 'Enter a valid email address.';
  if (message.length < 10) details.message = 'Write a little more — at least 10 characters.';
  if (Object.keys(details).length) throw badRequest('Please check the form.', details);

  // Stored first, so a message is never lost if the email provider is down.
  const saved = await Message.create({ name, email, message });
  if (config.mail.contactTo) {
    try {
      await sendMail({ to: config.mail.contactTo, replyTo: email, ...contactEmail(saved) });
      saved.delivered = true;
      await saved.save();
    } catch (err) {
      console.error('[contact] email delivery failed; the message is kept in the database', err);
    }
  }
  res.status(202).json({ ok: true });
});

router.get('/', requireAdmin, async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 }).limit(200).lean();
  res.json({ messages });
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const message = await Message.findByIdAndUpdate(req.params.id, { read: Boolean(req.body?.read) }, { returnDocument: 'after' }).lean();
  if (!message) throw notFound('Message not found');
  res.json({ message });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const result = await Message.findByIdAndDelete(req.params.id);
  if (!result) throw notFound('Message not found');
  res.status(204).end();
});

export default router;
