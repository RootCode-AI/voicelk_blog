import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { once } from 'node:events';
import { DEFAULT_OPEN_CODE } from '../../shared/openCode.js';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/open-code-test-unused';
process.env.JWT_SECRET = 'open-code-test-secret-only';
process.env.RESEND_API_KEY = '';
const { OpenCode } = await import('../src/models/OpenCode.js');
const { Admin } = await import('../src/models/Admin.js');
const { publicOpenCodeRoutes, adminOpenCodeRoutes } = await import('../src/routes/openCode.js');
const { errorHandler } = await import('../src/lib/errors.js');
const adminId = '507f1f77bcf86cd799439011';
const cookie = `voicelk_session=${jwt.sign({ sub: adminId }, process.env.JWT_SECRET)}`;
let saved = null, server, base;
const query = value => ({ lean: async () => structuredClone(value) });
before(async () => {
  mock.method(Admin, 'findById', id => query(id === adminId ? { _id: adminId, email: 'admin@example.test' } : null));
  mock.method(OpenCode, 'findById', () => query(saved));
  mock.method(OpenCode, 'findOneAndUpdate', (filter, update, options) => ({ lean: async () => {
    if (saved && saved.revision !== filter.revision) {
      if (options.upsert) throw Object.assign(new Error('Duplicate ID'), { code: 11000 });
      return null;
    }
    if (!saved && !options.upsert) return null;
    saved = { _id: 'open-code', ...structuredClone(update.$set), revision: (saved?.revision || 0) + update.$inc.revision };
    return structuredClone(saved);
  } }));
  const app = express();
  app.use(express.json(), cookieParser());
  app.use('/api/open-code', publicOpenCodeRoutes);
  app.use('/api/admin/open-code', adminOpenCodeRoutes);
  app.use(errorHandler);
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server?.closeAllConnections(); server?.close(); mock.restoreAll(); });
const request = (path, body, auth = cookie) => fetch(base + path, {
  method: body === undefined ? 'GET' : 'PUT',
  headers: { ...(auth && { Cookie: auth }), ...(body !== undefined && { 'Content-Type': 'application/json' }) },
  ...(body !== undefined && { body: JSON.stringify(body) }),
});
const adminPath = '/api/admin/open-code';

test('only an authenticated administrator can read or change editable settings', async () => {
  for (const auth of ['', `voicelk_session=${jwt.sign({ sub: adminId, aud: 'voicelk-writer' }, process.env.JWT_SECRET)}`]) {
    assert.equal((await request(adminPath, undefined, auth)).status, 401);
    assert.equal((await request(adminPath, DEFAULT_OPEN_CODE, auth)).status, 401);
  }
  assert.equal(saved, null);
  const publicResponse = await request('/api/open-code', undefined, '');
  assert.equal(publicResponse.status, 200);
  assert.equal((await publicResponse.json()).repos.length, 4);
});

test('save persists edited cards, order and visibility; hidden cards are absent from the public response', async () => {
  const initial = await (await request(adminPath)).json();
  assert.deepEqual(initial, DEFAULT_OPEN_CODE);
  const first = { ...initial.repos[0], label: 'Updated speech engine', url: 'https://github.com/example/speech', description: '<script>displayed as text</script>' };
  const hidden = { ...initial.repos[1], label: 'PRIVATE_HIDDEN_CARD', visible: false };
  const response = await request(adminPath, { ...initial, repos: [hidden, first] });
  assert.equal(response.status, 200);
  const updated = await response.json();
  assert.equal(updated.revision, 1);
  assert.deepEqual((await (await request(adminPath)).json()).repos.map(repo => repo.id), [hidden.id, first.id]);
  const visible = await (await request('/api/open-code', undefined, '')).json();
  assert.equal(visible.repos.length, 1);
  assert.equal(visible.repos[0].label, first.label);
  assert.equal(visible.repos[0].url, first.url);
  assert.ok(!JSON.stringify(visible).includes(hidden.label));
  assert.equal(visible.revision, undefined);
});

test('invalid links, duplicate IDs, oversized lists and non-text fields cannot change saved content', async () => {
  const original = structuredClone(saved);
  const valid = await (await request(adminPath)).json();
  for (const url of ['javascript:alert(1)', 'data:text/html,test', '//example.com/code', 'https://user:secret@example.com', 'not-a-url']) {
    const body = structuredClone(valid);
    body.repos[0].url = url;
    const response = await request(adminPath, body);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).details['repos.0.url']);
  }
  for (const body of [
    { ...valid, repos: [valid.repos[0], valid.repos[0]] },
    { ...valid, repos: Array(25).fill(valid.repos[0]) },
    { ...valid, repos: [{ ...valid.repos[0], label: { $gt: '' } }] },
    { ...valid, enabled: 'true' },
  ]) assert.equal((await request(adminPath, body)).status, 400);
  assert.deepEqual(saved, original);
});

test('stale saves are rejected; disabling and removing all cards do not restore defaults', async () => {
  assert.equal((await request(adminPath, DEFAULT_OPEN_CODE)).status, 409);
  const current = await (await request(adminPath)).json();
  const off = await (await request(adminPath, { ...current, enabled: false })).json();
  assert.deepEqual(await (await request('/api/open-code')).json(), { enabled: false, repos: [] });
  assert.equal((await request(adminPath, current)).status, 409);
  const empty = await request(adminPath, { ...off, enabled: true, repos: [] });
  assert.equal(empty.status, 200);
  assert.deepEqual((await (await request(adminPath)).json()).repos, []);
  assert.deepEqual(await (await request('/api/open-code')).json(), { enabled: true, repos: [] });
});
