import test, { mock } from 'node:test';
import { once } from 'node:events';
import express from 'express';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/emails-test-unused';
process.env.JWT_SECRET = 'emails-test-only-not-a-production-secret';
process.env.PUBLIC_URL = 'https://voicelk.dev';
// Never send real email from a test: without a key the mailer prints instead.
process.env.RESEND_API_KEY = '';
const { confirmSubscriptionEmail, contactEmail, newPostEmail, welcomeEmail } = await import('../src/lib/emails.js');

const post = { title: 'Code-switching <in> VITS', slug: 'code-switching', excerpt: 'Word by word.' };
const emails = {
  confirm: confirmSubscriptionEmail('token-1'),
  post: newPostEmail(post, 'unsub-1'),
  contact: contactEmail({ name: 'Nimal <b>', email: 'nimal@example.com', message: 'Hi <script>x</script>' }),
  welcome: welcomeEmail('unsub-2'),
};

test('every email carries the VoiceLK logo from the live site and the brand footer', () => {
  for (const [name, email] of Object.entries(emails)) {
    assert.match(email.html, /<img src="https:\/\/voicelk\.dev\/brand\/voicelk-logo\.png"[^>]*alt="VoiceLK"/, name);
    assert.match(email.html, /VoiceLK<\/span> &middot; Sinhala&ndash;English text to speech/, name);
    assert.doesNotMatch(email.html + email.text, /Journal|the VoiceLK\b/, name);
  }
});

test('what people type stays text, and the new-post email keeps its unsubscribe link', () => {
  assert.match(emails.post.html, /Code-switching &lt;in&gt; VITS/);
  assert.doesNotMatch(emails.contact.html, /<script>/);
  assert.equal(emails.post.headers['List-Unsubscribe'], '<https://voicelk.dev/newsletter/unsubscribe?token=unsub-1>');
  assert.match(emails.post.html, /Unsubscribe<\/a>/);
});

test('the Resend welcome template is rebranded and keeps its variables', async () => {
  const html = await readFile(new URL('../templates/voicelk-welcome.html', import.meta.url), 'utf8');
  assert.match(html, /<title>Welcome to VoiceLK<\/title>/);
  assert.match(html, /src="https:\/\/voicelk\.dev\/brand\/voicelk-logo\.png"/);
  assert.match(html, /\{\{\{READER_NAME\}\}\}/);
  assert.match(html, /href="\{\{\{ACTION_URL\}\}\}"/);
  assert.doesNotMatch(html, /Journal/);
});

test('subscribing sends one welcome email, at most once a day per address, and never loses a subscription', async (t) => {
  const { Subscriber } = await import('../src/models/Subscriber.js');
  const { default: subscriberRoutes } = await import('../src/routes/subscribers.js');
  const { errorHandler } = await import('../src/lib/errors.js');

  // A stand-in for the subscribers collection.
  const store = new Map();
  t.mock.method(Subscriber, 'findOne', async ({ email }) => store.get(email) ?? null);
  t.mock.method(Subscriber.prototype, 'save', async function save() {
    store.set(this.email, this);
    return this;
  });
  // The mailer prints each email it would send; collect them.
  const sent = [];
  let mailDown = false;
  t.mock.method(console, 'info', (line) => {
    if (!String(line).includes('[mail:dev]')) return;
    if (mailDown) throw new Error('mail provider down');
    sent.push(/to=(\S+)\s+subject="([^"]+)"/.exec(line).slice(1));
  });
  t.mock.method(console, 'error', () => {});

  const app = express();
  app.use(express.json());
  app.use('/api/subscribers', subscriberRoutes);
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const subscribe = async (email) => {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/api/subscribers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }),
    });
    return { ...(await res.json()), code: res.status };
  };

  // A new subscriber gets the welcome email.
  let res = await subscribe('Reader@Example.com');
  assert.equal(res.code, 201);
  assert.equal(res.message, 'You are subscribed. A welcome email is on its way.');
  assert.deepEqual(sent, [['reader@example.com', 'Welcome to VoiceLK']]);
  assert.ok(store.get('reader@example.com').welcomedAt);

  // Already subscribed: nothing is sent.
  res = await subscribe('reader@example.com');
  assert.equal(res.message, 'You are already subscribed.');
  assert.equal(sent.length, 1);

  // Unsubscribed and back within a day: subscribed again, but no second email.
  store.get('reader@example.com').status = 'unsubscribed';
  res = await subscribe('reader@example.com');
  assert.equal(res.code, 201);
  assert.equal(res.message, 'You are subscribed.');
  assert.equal(sent.length, 1);

  // A day later, a returning subscriber is welcomed again.
  const reader = store.get('reader@example.com');
  reader.status = 'unsubscribed';
  reader.welcomedAt = new Date(Date.now() - 25 * 60 * 60 * 1000);
  await subscribe('reader@example.com');
  assert.equal(sent.length, 2);

  // If the email provider fails, the subscription still stands.
  mailDown = true;
  res = await subscribe('second@example.com');
  assert.equal(res.code, 201);
  assert.equal(res.message, 'You are subscribed.');
  assert.equal(store.get('second@example.com').status, 'active');
  assert.equal(store.get('second@example.com').welcomedAt, undefined);
});
