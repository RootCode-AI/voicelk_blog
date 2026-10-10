import { Router } from 'express';
import { Post } from '../models/Post.js';
import { blocksToText, readingMinutes, sanitizeBlocks } from '../lib/blocks.js';
import { HttpError, badRequest, notFound } from '../lib/errors.js';
import { notifySubscribers } from '../lib/notify.js';
import { assertPublishedImageAlt } from '../lib/imageAlt.js';
import { sectionFilter } from '../lib/postSections.js';
import { postSections } from '../../../shared/postSections.js';

const router = Router();

export function slugify(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

async function uniqueSlug(base, excludeId) {
  // A title written only in Sinhala slugifies to nothing, so fall back to a stamp.
  const root = base || `post-${Date.now().toString(36)}`;
  for (let n = 1; ; n += 1) {
    const candidate = n === 1 ? root : `${root}-${n}`;
    const clash = await Post.exists({ slug: candidate, _id: { $ne: excludeId } });
    if (!clash) return candidate;
  }
}

function cleanTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags ?? '').split(',');
  const cleaned = list.map((t) => String(t).trim().toLowerCase().replace(/\s+/g, '-').slice(0, 40)).filter(Boolean);
  return [...new Set(cleaned)].slice(0, 12);
}

export async function applyBody(post, body) {
  if (body.section !== undefined) {
    if (typeof body.section !== 'string' || !Object.hasOwn(postSections, body.section)) throw badRequest('Section must be journey or research');
    post.section = body.section;
  }
  if (body.title !== undefined) post.title = String(body.title);
  if (body.excerpt !== undefined) post.excerpt = String(body.excerpt);
  if (body.author !== undefined) post.author = String(body.author);
  if (body.tags !== undefined) post.tags = cleanTags(body.tags);
  if (body.featured !== undefined) post.featured = Boolean(body.featured);
  if (body.coverImage !== undefined) {
    const url = String(body.coverImage?.url ?? '').trim();
    if (url && !/^(https?:\/\/|\/api\/media\/[a-f0-9]{24}$)/i.test(url)) throw badRequest('Cover image URL is not valid');
    post.coverImage = { url, alt: String(body.coverImage?.alt ?? '').slice(0, 300) };
  }
  if (body.blocks !== undefined) {
    post.blocks = sanitizeBlocks(body.blocks);
    post.plainText = blocksToText(post.blocks);
    post.readingMinutes = readingMinutes(post.blocks);
  }
  if (body.status !== undefined) {
    if (!['draft', 'published'].includes(body.status)) throw badRequest('Status must be draft or published');
    post.status = body.status;
    if (post.status === 'published' && !post.publishedAt) post.publishedAt = new Date();
  }

  assertPublishedImageAlt(post);
  const requestedSlug = body.slug !== undefined ? slugify(body.slug) : undefined;
  if (requestedSlug || !post.slug) {
    post.slug = await uniqueSlug(requestedSlug || slugify(post.title), post._id);
  }
}

router.get('/', async (req, res) => {
  const filter = { ...sectionFilter(req.query.section), ...(['draft', 'published'].includes(req.query.status) ? { status: req.query.status } : {}) };
  const posts = await Post.find(filter)
    .select('title slug status section featured tags publishedAt updatedAt notifiedAt readingMinutes coverImage')
    .sort({ updatedAt: -1 })
    .lean();
  res.json({ posts });
});

router.get('/:id', async (req, res) => {
  const post = await Post.findById(req.params.id).lean();
  if (!post) throw notFound('Post not found');
  res.json({ post });
});

router.post('/', async (req, res) => {
  const post = new Post({ author: req.admin.name });
  await applyBody(post, req.body ?? {});
  await post.save();
  res.status(201).json({ post: post.toObject() });
});

router.put('/:id', async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw notFound('Post not found');
  await applyBody(post, req.body ?? {});
  await post.save();
  res.json({ post: post.toObject() });
});

router.delete('/:id', async (req, res) => {
  const result = await Post.findByIdAndDelete(req.params.id);
  if (!result) throw notFound('Post not found');
  res.status(204).end();
});

router.post('/:id/notify', async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw notFound('Post not found');
  if (post.status !== 'published') throw new HttpError(409, 'Publish the post before emailing subscribers.');

  const sent = await notifySubscribers(post);
  post.notifiedAt = new Date();
  await post.save();
  res.json({ sent, notifiedAt: post.notifiedAt });
});

export default router;
