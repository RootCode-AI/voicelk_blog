// Who can open which panel: evaluators reach the evaluation console only; blog
// administrators reach both. Runs the real auth and evaluate routes against a
// stand-in for Supabase's REST API and a stubbed Admin model, so no database is needed.
import test, { after, before, mock } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import express from 'express';
import cookieParser from 'cookie-parser';

const EVALUATOR = {
  id: '6f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f',
  email: 'rater@example.com',
  name: 'Rater',
  password: 'rater-password-123',
};
const ADMIN = { _id: '64b7f0c2a1b2c3d4e5f60718', email: 'admin@example.com', name: 'Admin', password: 'admin-password-123' };

let supabaseServer;
let app;
let base;

before(async () => {
  const evaluatorRow = { ...EVALUATOR, password_hash: await bcrypt.hash(EVALUATOR.password, 4) };
  delete evaluatorRow.password;
  // Answers the few PostgREST reads these routes make.
  supabaseServer = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let rows = [];
    if (url.pathname === '/rest/v1/evaluators') {
      const email = url.searchParams.get('email')?.replace(/^eq\./, '');
      const id = url.searchParams.get('id')?.replace(/^eq\./, '');
      rows = [evaluatorRow].filter((row) => (email ? row.email === email : true) && (id ? row.id === id : true));
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Range': `0-${rows.length}/*` }).end(JSON.stringify(rows));
  });
  supabaseServer.listen(0, '127.0.0.1');
  await once(supabaseServer, 'listening');

  process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/access-test-unused';
  process.env.JWT_SECRET = 'access-test-only-not-a-production-secret';
  process.env.SUPABASE_URL = `http://127.0.0.1:${supabaseServer.address().port}`;
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_access_test';

  const { Admin } = await import('../src/models/Admin.js');
  const adminDoc = { ...ADMIN, passwordHash: await bcrypt.hash(ADMIN.password, 4) };
  delete adminDoc.password;
  mock.method(Admin, 'findOne', ({ email }) => ({ select: async () => (email === ADMIN.email ? adminDoc : null) }));
  mock.method(Admin, 'findById', (id) => ({ lean: async () => (String(id) === ADMIN._id ? adminDoc : null) }));

  const { default: authRoutes } = await import('../src/routes/auth.js');
  const { default: evaluateRoutes } = await import('../src/routes/evaluate.js');
  const { requireAdmin } = await import('../src/middleware/auth.js');
  const { errorHandler } = await import('../src/lib/errors.js');

  app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use('/api/evaluate', evaluateRoutes);
  // Stands in for every /api/admin route: they all sit behind requireAdmin.
  app.get('/api/admin/stats', requireAdmin, (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
  app.server = server;
});

after(() => {
  app?.server?.closeAllConnections();
  app?.server?.close();
  supabaseServer?.close();
  mock.restoreAll();
});

// A tiny cookie jar, so each test acts like one browser.
function browser() {
  const jar = new Map();
  return {
    jar,
    async request(path, { method = 'GET', body } = {}) {
      const res = await fetch(base + path, {
        method,
        headers: {
          ...(body && { 'Content-Type': 'application/json' }),
          ...(jar.size && { Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') }),
        },
        body: body && JSON.stringify(body),
      });
      for (const cookie of res.headers.getSetCookie()) {
        const [pair] = cookie.split(';');
        const [name, value] = pair.split('=');
        if (value) jar.set(name, value);
        else jar.delete(name);
      }
      return res;
    },
  };
}

test('an evaluator can use the evaluation console but never the admin panel', async () => {
  const b = browser();
  const login = await b.request('/api/evaluate/auth/login', { method: 'POST', body: { email: EVALUATOR.email, password: EVALUATOR.password } });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).user.role, 'evaluator');
  assert.ok(b.jar.has('voicelk_evaluator'));
  assert.ok(!b.jar.has('voicelk_session'), 'an evaluator never receives an admin session');

  assert.equal((await (await b.request('/api/evaluate/auth/me')).json()).user.role, 'evaluator');
  assert.equal((await b.request('/api/admin/stats')).status, 401);
  assert.equal((await b.request('/api/auth/me')).status, 401);
  // Managing evaluator accounts is for administrators only.
  assert.equal((await b.request('/api/evaluate/console/evaluators')).status, 403);
});

test('an evaluator token cannot be passed off as an admin session', async () => {
  const b = browser();
  await b.request('/api/evaluate/auth/login', { method: 'POST', body: { email: EVALUATOR.email, password: EVALUATOR.password } });
  b.jar.set('voicelk_session', b.jar.get('voicelk_evaluator'));
  assert.equal((await b.request('/api/admin/stats')).status, 401);
  assert.equal((await b.request('/api/auth/me')).status, 401);
});

test('evaluator credentials do not work on the admin sign-in', async () => {
  const b = browser();
  const login = await b.request('/api/auth/login', { method: 'POST', body: { email: EVALUATOR.email, password: EVALUATOR.password } });
  assert.equal(login.status, 401);
  assert.equal(b.jar.size, 0);
});

test('an administrator signed in to the admin panel can also use the evaluation console', async () => {
  const b = browser();
  const login = await b.request('/api/auth/login', { method: 'POST', body: { email: ADMIN.email, password: ADMIN.password } });
  assert.equal(login.status, 200);
  assert.equal((await b.request('/api/admin/stats')).status, 200);

  const me = await (await b.request('/api/evaluate/auth/me')).json();
  assert.equal(me.user.role, 'admin');
  assert.equal((await b.request('/api/evaluate/console/evaluators')).status, 200);
});

test('an administrator can sign in on the evaluator page and gets both panels', async () => {
  const b = browser();
  const login = await b.request('/api/evaluate/auth/login', { method: 'POST', body: { email: ADMIN.email, password: ADMIN.password } });
  assert.equal(login.status, 200);
  assert.equal((await login.json()).user.role, 'admin');
  assert.ok(b.jar.has('voicelk_session'));
  assert.ok(!b.jar.has('voicelk_evaluator'));
  assert.equal((await b.request('/api/admin/stats')).status, 200);
  assert.equal((await b.request('/api/evaluate/console/evaluators')).status, 200);
});

test('wrong passwords are refused on both sign-in pages', async () => {
  for (const [path, email] of [['/api/evaluate/auth/login', EVALUATOR.email], ['/api/evaluate/auth/login', ADMIN.email], ['/api/auth/login', ADMIN.email]]) {
    const b = browser();
    const res = await b.request(path, { method: 'POST', body: { email, password: 'not-the-password' } });
    assert.equal(res.status, 401, `${path} ${email}`);
    assert.equal(b.jar.size, 0);
  }
});
