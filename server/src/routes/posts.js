import { Router } from 'express';
import { Post } from '../models/Post.js';
import { notFound } from '../lib/errors.js';

const router = Router();

const LIST_FIELDS = 'title slug excerpt coverImage tags author publishedAt readingMinutes featured';

router.get('/', async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(req.query.limit, 10) || 9));
  const q = String(req.query.q ?? '').trim().slice(0, 100);
  const tag = String(req.query.tag ?? '').trim().toLowerCase();

  const filter = { status: 'published' };
  if (tag) filter.tags = tag;
  if (q) filter.$text = { $search: q };

  const sort = q ? { score: { $meta: 'textScore' }, publishedAt: -1 } : { publishedAt: -1 };
  const projection = q ? { score: { $meta: 'textScore' } } : {};

  const [posts, total] = await Promise.all([
    Post.find(filter, projection).select(LIST_FIELDS).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Post.countDocuments(filter),
  ]);

  res.json({ posts, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

router.get('/tags', async (req, res) => {
  const tags = await Post.aggregate([
    { $match: { status: 'published' } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 40 },
  ]);
  res.json({ tags: tags.map((t) => ({ tag: t._id, count: t.count })) });
});

router.get('/:slug', async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, status: 'published' }).lean();
  if (!post) throw notFound('That post does not exist or is not published yet.');

  const [newer, older] = await Promise.all([
    Post.findOne({ status: 'published', publishedAt: { $gt: post.publishedAt } })
      .sort({ publishedAt: 1 })
      .select('title slug')
      .lean(),
    Post.findOne({ status: 'published', publishedAt: { $lt: post.publishedAt } })
      .sort({ publishedAt: -1 })
      .select('title slug')
      .lean(),
  ]);

  res.json({ post, newer, older });
});

export default router;
