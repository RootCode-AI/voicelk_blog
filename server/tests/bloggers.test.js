// What a blogger can and cannot do. Runs the real auth, writer, admin-post, blogger
// and media routes against in-memory stand-ins for the MongoDB models, so no
// database is needed.
import test, { after, before, mock } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import bcrypt from 'bcryptjs';
import express from 'express';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/bloggers-test-unused';
process.env.JWT_SECRET = 'bloggers-test-only-not-a-production-secret';
process.env.RESEND_API_KEY = '';

const ADMIN = { email: 'admin@example.com', password: 'admin-password-123', name: 'Admin' };
const ANNA = { email: 'anna@example.com', password: 'anna-password-123', name: 'Anna' };
const BEN = { email: 'ben@example.com', password: 'ben-password-123', name: 'Ben' };

let base;
let server;
const posts = [];
const bloggers = [];

const { Admin } = await import('../src/models/Admin.js');
const { Blogger } = await import('../src/models/Blogger.js');
const { Post } = await import('../src/models/Post.js');

// A query-like result: awaitable, and with .lean()/.select()/.sort() like Mongoose.
const query = (value) => {
  const q = {
    lean: async () => (Array.isArray(value) ? value.map((d) => d.toObject?.() ?? d) : value?.toObject?.() ?? value),
    select: () => q,
    sort: () => q,
    then: (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  };
  return q;
};
const matches = (doc, filter) =>
  Object.entries(filter).every(([key, want]) => {
    if (key === '_id' && want?.$ne !== undefined) return String(doc._id) !== String(want.$ne);
    if (want?.$exists !== undefined) return (doc[key] != null) === want.$exists;
    return String(doc[key]) === String(want);
  });

before(async () => {
  const adminDoc = { _id: new mongoose.Types.ObjectId(), ...ADMIN, passwordHash: await bcrypt.hash(ADMIN.password, 4) };
  mock.method(Admin, 'findOne', ({ email }) => query(email === ADMIN.email ? adminDoc : null));
  mock.method(Admin, 'findById', (id) => query(String(id) === String(adminDoc._id) ? adminDoc : null));

  for (const b of [ANNA, BEN]) {
    bloggers.push(new Blogger({ email: b.email, name: b.name, passwordHash: await bcrypt.hash(b.password, 4) }));
  }
  mock.method(Blogger, 'findOne', ({ email }) => query(bloggers.find((b) => b.email === email) ?? null));
  mock.method(Blogger, 'findById', (id) => query(bloggers.find((b) => String(b._id) === String(id)) ?? null));
  mock.method(Blogger, 'exists', async ({ email }) => bloggers.some((b) => b.email === email));
  mock.method(Blogger, 'create', async (fields) => {
    const doc = new Blogger(fields);
    bloggers.push(doc);
    return doc;
  });
  mock.method(Blogger, 'find', () => query([...bloggers]));
  mock.method(Blogger, 'findByIdAndDelete', async (id) => {
    const i = bloggers.findIndex((b) => String(b._id) === String(id));
    return i < 0 ? null : bloggers.splice(i, 1)[0];
  });

  mock.method(Post, 'find', (filter) => query(posts.filter((p) => matches(p, filter))));
  mock.method(Post, 'findOne', (filter) => query(posts.find((p) => matches(p, filter)) ?? null));
  mock.method(Post, 'exists', async (filter) => posts.some((p) => matches(p, filter)));
  mock.method(Post, 'findOneAndDelete', async (filter) => {
    const i = posts.findIndex((p) => matches(p, filter));
    return i < 0 ? null : posts.splice(i, 1)[0];
  });
  mock.method(Post, 'aggregate', async () => []);
  mock.method(Post.prototype, 'save', async function save() {
    if (!posts.includes(this)) posts.push(this);
    return this;
  });

  const { default: authRoutes } = await import('../src/routes/auth.js');
  const { default: writerRoutes } = await import('../src/routes/writer.js');
  const { default: adminPostRoutes } = await import('../src/routes/adminPosts.js');
  const { default: bloggerRoutes } = await import('../src/routes/bloggers.js');
  const { default: mediaRoutes } = await import('../src/routes/media.js');
  const { requireAdmin } = await import('../src/middleware/auth.js');
  const { errorHandler } = await import('../src/lib/errors.js');

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.get('/api/admin/stats', requireAdmin, (_req, res) => res.json({ ok: true }));
  app.use('/api/admin/posts', requireAdmin, adminPostRoutes);
  app.use('/api/admin/bloggers', requireAdmin, bloggerRoutes);
  app.use('/api/write', writerRoutes);
  app.use('/api/media', mediaRoutes);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.closeAllConnections();
  server?.close();
  mock.restoreAll();
});

function browser() {
  const jar = new Map();
  const request = async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: {
        ...(body && { 'Content-Type': 'application/json' }),
        ...(jar.size && { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }),
      },
      body: body && JSON.stringify(body),
    });
    for (const cookie of res.headers.getSetCookie()) {
      const [name, value] = cookie.split(';')[0].split('=');
      if (value) jar.set(name, value);
      else jar.delete(name);
    }
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    return { status: res.status, data };
  };
  return { jar, request };
}

async function signIn(who, path = '/api/write/auth/login') {
  const b = browser();
  const res = await b.request(path, { method: 'POST', body: { email: who.email, password: who.password } });
  assert.equal(res.status, 200, `${who.email} signs in at ${path}`);
  return b;
}

const draft = (title) => ({
  title,
  section: 'journey',
  status: 'draft',
  blocks: [{ id: 'a', type: 'text', data: { markdown: 'Hello' } }],
});

test('a blogger writes, publishes, edits and deletes their own posts', async () => {
  const anna = await signIn(ANNA);
  const created = await anna.request('/api/write/posts', { method: 'POST', body: draft('Anna on G2P') });
  assert.equal(created.status, 201);
  const id = created.data.post._id;
  assert.equal(created.data.post.author, 'Anna');
  assert.equal(String(created.data.post.blogger), String(bloggers[0]._id));

  const published = await anna.request(`/api/write/posts/${id}`, { method: 'PUT', body: { status: 'published' } });
  assert.equal(published.status, 200);
  assert.equal(published.data.post.status, 'published');

  const list = await anna.request('/api/write/posts');
  assert.deepEqual(list.data.posts.map((p) => p.title), ['Anna on G2P']);
  assert.equal((await anna.request(`/api/write/posts/${id}`, { method: 'DELETE' })).status, 204);
});

test("a blogger cannot see, change or delete anyone else's post", async () => {
  const ben = await signIn(BEN);
  const own = await ben.request('/api/write/posts', { method: 'POST', body: draft("Ben's note") });
  const anna = await signIn(ANNA);
  const id = own.data.post._id;

  assert.deepEqual((await anna.request('/api/write/posts')).data.posts, []);
  assert.equal((await anna.request(`/api/write/posts/${id}`)).status, 404);
  assert.equal((await anna.request(`/api/write/posts/${id}`, { method: 'PUT', body: { title: 'Hijacked' } })).status, 404);
  assert.equal((await anna.request(`/api/write/posts/${id}`, { method: 'DELETE' })).status, 404);
  assert.equal(posts.find((p) => String(p._id) === id).title, "Ben's note");
});

test('a blogger cannot feature posts, email subscribers or reach any admin route', async () => {
  const anna = await signIn(ANNA);
  const created = await anna.request('/api/write/posts', { method: 'POST', body: { ...draft('Featured?'), featured: true } });
  assert.equal(created.data.post.featured, false);
  const id = created.data.post._id;
  await anna.request(`/api/write/posts/${id}`, { method: 'PUT', body: { status: 'published', featured: true } });
  assert.equal(posts.find((p) => String(p._id) === id).featured, false);
  assert.equal((await anna.request(`/api/write/posts/${id}/notify`, { method: 'POST' })).status, 404);

  for (const path of ['/api/admin/stats', '/api/admin/posts', '/api/admin/bloggers', '/api/auth/me']) {
    assert.equal((await anna.request(path)).status, 401, path);
  }
  // Nor by copying the writer token into the admin cookie.
  anna.jar.set('voicelk_session', anna.jar.get('voicelk_writer'));
  assert.equal((await anna.request('/api/admin/posts')).status, 401);
});

test('blogger and admin sign-ins are separate', async () => {
  for (const [who, path] of [[ANNA, '/api/auth/login'], [ADMIN, '/api/write/auth/login']]) {
    const res = await browser().request(path, { method: 'POST', body: { email: who.email, password: who.password } });
    assert.equal(res.status, 401, `${who.email} at ${path}`);
  }
});

test('administrators see every post with its blogger, and manage blogger accounts', async () => {
  const admin = await signIn(ADMIN, '/api/auth/login');
  const all = await admin.request('/api/admin/posts');
  assert.ok(all.data.posts.some((p) => p.author === 'Ben' && p.blogger));

  const added = await admin.request('/api/admin/bloggers', { method: 'POST', body: { email: 'cara@example.com', name: 'Cara', password: 'cara-password-123' } });
  assert.equal(added.status, 201);
  assert.equal((await admin.request('/api/admin/bloggers', { method: 'POST', body: { email: 'cara@example.com', name: 'Cara', password: 'cara-password-123' } })).status, 409);
  const invalid = await admin.request('/api/admin/bloggers', { method: 'POST', body: { email: 'nope', name: '', password: 'short' } });
  assert.deepEqual(Object.keys(invalid.data.details).sort(), ['email', 'name', 'password']);

  const cara = await signIn({ email: 'cara@example.com', password: 'cara-password-123' });
  assert.equal((await admin.request(`/api/admin/bloggers/${added.data.blogger._id}`, { method: 'DELETE' })).status, 204);
  // A removed blogger is signed out at once.
  assert.equal((await cara.request('/api/write/posts')).status, 401);
});

test('bloggers may upload media for their posts; signed-out visitors may not', async () => {
  // A request without a file gets past sign-in and fails on the missing file (400).
  const anna = await signIn(ANNA);
  assert.equal((await anna.request('/api/media', { method: 'POST' })).status, 400);
  assert.equal((await browser().request('/api/media', { method: 'POST' })).status, 401);
  // Deleting stored files stays with administrators.
  assert.equal((await anna.request(`/api/media/${new mongoose.Types.ObjectId()}`, { method: 'DELETE' })).status, 401);
});
