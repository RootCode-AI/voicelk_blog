import { Router } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { HttpError, badRequest, notFound } from '../lib/errors.js';
import { Blogger } from '../models/Blogger.js';
import { Post } from '../models/Post.js';

// Administrators manage blogger accounts here (mounted behind requireAdmin).
const router = Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const view = (b, posts = {}) => ({
  _id: b._id,
  email: b.email,
  name: b.name,
  createdBy: b.createdBy,
  createdAt: b.createdAt,
  published: posts.published ?? 0,
  drafts: posts.draft ?? 0,
});

router.get('/', async (_req, res) => {
  const [bloggers, counts] = await Promise.all([
    Blogger.find().sort({ createdAt: -1 }).lean(),
    Post.aggregate([
      { $match: { blogger: { $exists: true } } },
      { $group: { _id: { blogger: '$blogger', status: '$status' }, n: { $sum: 1 } } },
    ]),
  ]);
  const byBlogger = new Map();
  for (const { _id, n } of counts) {
    const key = String(_id.blogger);
    byBlogger.set(key, { ...byBlogger.get(key), [_id.status]: n });
  }
  res.json({ bloggers: bloggers.map((b) => view(b, byBlogger.get(String(b._id)))) });
});

router.post('/', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const name = String(req.body?.name ?? '').trim();
  const password = String(req.body?.password ?? '');
  const details = {};
  if (!EMAIL.test(email) || email.length > 200) details.email = 'Enter a valid email address.';
  if (!name) details.name = 'Add their name; it is shown as the author of their posts.';
  else if (name.length > 120) details.name = 'Keep the name under 120 characters.';
  if (password.length < 10) details.password = 'Use a password of at least 10 characters.';
  if (Object.keys(details).length) throw badRequest('Please check the form.', details);
  if (await Blogger.exists({ email })) throw new HttpError(409, 'A blogger with that email already exists.');

  const blogger = await Blogger.create({ email, name, passwordHash: await bcrypt.hash(password, 12), createdBy: req.admin.email });
  res.status(201).json({ blogger: view(blogger.toObject()) });
});

// Their posts stay on the site, under the name they wrote with; admins can still edit them.
router.delete('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('Blogger not found');
  const removed = await Blogger.findByIdAndDelete(req.params.id);
  if (!removed) throw notFound('Blogger not found');
  res.status(204).end();
});

export default router;
