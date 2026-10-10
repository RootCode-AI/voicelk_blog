import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import { Post } from '../src/models/Post.js';
import postRoutes from '../src/routes/posts.js';
import { sectionFilter } from '../src/lib/postSections.js';
import { errorHandler } from '../src/lib/errors.js';

// No dotenv or live database is used in these tests.
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/voicelk-test-unused';
process.env.JWT_SECRET = 'test-only-secret-not-used-for-production';
process.env.RESEND_API_KEY = '';
const { applyBody, default: adminRoutes } = await import('../src/routes/adminPosts.js');
const { requireAdmin } = await import('../src/middleware/auth.js');

test('section schema and edits support research, journey and legacy posts', async () => {
  const post = new Post({ title: 'A note', slug: 'a-note' });
  assert.equal(post.section, 'journey');
  await applyBody(post, { section: 'research', status: 'published' });
  assert.equal(post.toObject().section, 'research');
  assert.equal(post.status, 'published');
  await applyBody(post, { title: 'Updated results' });
  assert.equal(post.section, 'research');
  await applyBody(post, { section: 'journey' });
  assert.equal(post.section, 'journey');
  assert.equal(post.slug, 'a-note');
  for (const section of ['', null, 'unknown', ['research'], { $ne: '' }]) {
    await assert.rejects(applyBody(post, { section }), /Section must be journey or research/);
  }
  post.section = 'unknown';
  assert.ok(post.validateSync().errors.section);
  assert.deepEqual(sectionFilter('journey'), { $or: [{ section: 'journey' }, { section: { $exists: false } }, { section: null }] });
  assert.deepEqual(sectionFilter('research'), { section: 'research' });
});

test('public lists, counts, tags and related posts all use section filters; admin remains protected', async (t) => {
  const calls = [];
  const chain = (result) => ({
    select() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; },
    lean: async () => result,
  });
  t.mock.method(Post, 'find', (filter) => { calls.push(['list', filter]); return chain([]); });
  t.mock.method(Post, 'countDocuments', async (filter) => { calls.push(['count', filter]); return 0; });
  t.mock.method(Post, 'aggregate', async (pipeline) => { calls.push(['tags', pipeline[0].$match]); return []; });
  t.mock.method(Post, 'findOne', (filter) => {
    calls.push(['one', filter]);
    return chain(filter.slug ? { slug: 'result', section: 'research', publishedAt: new Date() } : null);
  });
  const app = express();
  app.use(express.json());
  app.use('/api/posts', postRoutes);
  app.use('/api/admin/posts', requireAdmin, adminRoutes);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const section of ['journey', 'research']) {
      const response = await fetch(`${base}/api/posts?section=${section}&q=voice&tag=tts&page=2`);
      assert.equal(response.status, 200);
      const expected = { status: 'published', ...sectionFilter(section), tags: 'tts', $text: { $search: 'voice' } };
      assert.deepEqual(calls.at(-2), ['list', expected]);
      assert.deepEqual(calls.at(-1), ['count', expected]);
      assert.equal((await fetch(`${base}/api/posts/tags?section=${section}`)).status, 200);
      assert.deepEqual(calls.at(-1), ['tags', { status: 'published', ...sectionFilter(section) }]);
    }
    assert.equal((await fetch(`${base}/api/posts?section=invalid`)).status, 400);
    assert.equal((await fetch(`${base}/api/posts/tags?section=invalid`)).status, 400);
    assert.equal((await fetch(`${base}/api/posts/result`)).status, 200);
    for (const [, filter] of calls.slice(-2)) {
      assert.equal(filter.section, 'research');
      assert.equal(filter.status, 'published');
    }
    for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
      assert.equal((await fetch(`${base}/api/admin/posts${method === 'PUT' || method === 'DELETE' ? '/example' : ''}`, { method })).status, 401);
    }
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
