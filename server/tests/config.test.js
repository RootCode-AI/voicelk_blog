import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// config.js reads the environment once on import, so each case runs in its own process.
const configUrl = new URL('../src/config.js', import.meta.url).href;
function supabaseUrl(SUPABASE_URL) {
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', `const { config } = await import(${JSON.stringify(configUrl)}); console.log(JSON.stringify(config.supabase.url));`], {
    env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:1/x', JWT_SECRET: 'config-test', SUPABASE_URL },
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(out.toString().trim().split('\n').pop());
}

test('only an https project URL is accepted, and only its origin is kept', () => {
  assert.equal(supabaseUrl('https://abc123.supabase.co/'), 'https://abc123.supabase.co');
  assert.equal(supabaseUrl('https://abc123.supabase.co/rest/v1'), 'https://abc123.supabase.co');
  // A local Supabase (its CLI) runs on plain http; that is allowed for this machine only.
  assert.equal(supabaseUrl('http://127.0.0.1:54321'), 'http://127.0.0.1:54321');
});

test('a connection string is refused, so its password can never reach a response header', () => {
  for (const bad of [
    'postgresql://postgres.abc:secret@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
    'https://user:secret@abc123.supabase.co',
    'http://abc123.supabase.co',
    'not a url',
  ]) {
    assert.equal(supabaseUrl(bad), '', bad);
  }
});

test('in production, plain http is redirected to https and https is served', () => {
  // A separate process, because the redirect is chosen from NODE_ENV when app.js loads.
  const appUrl = new URL('../src/app.js', import.meta.url).href;
  const script = `
    const { default: app } = await import(${JSON.stringify(appUrl)});
    const server = app.listen(0, '127.0.0.1');
    await new Promise((r) => server.once('listening', r));
    const { request } = await import('node:http');
    // fetch() drops a custom Host header, so ask the way Heroku's router does: raw HTTP.
    const ask = (proto, path, method = 'GET') => new Promise((resolve, reject) => {
      const req = request({ host: '127.0.0.1', port: server.address().port, path, method,
        headers: { 'X-Forwarded-Proto': proto, Host: 'voicelk.dev' } }, (res) => { res.resume(); resolve(res); });
      req.on('error', reject).end();
    });
    const plain = await ask('http', '/about?x=1');
    const post = await ask('http', '/api/contact', 'POST');
    const secure = await ask('https', '/robots.txt');
    console.log(JSON.stringify({ plain: [plain.statusCode, plain.headers.location], post: post.statusCode, secure: secure.statusCode }));
    server.closeAllConnections(); server.close();`;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
    env: { ...process.env, NODE_ENV: 'production', MONGODB_URI: 'mongodb://127.0.0.1:1/x', JWT_SECRET: 'config-test', RESEND_API_KEY: '' },
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const result = JSON.parse(out.toString().trim().split('\n').pop());
  assert.deepEqual(result.plain, [308, 'https://voicelk.dev/about?x=1']);
  assert.equal(result.post, 308);
  assert.equal(result.secure, 200);
});

test("health reports when mail goes through Resend's test sender, which only reaches the account owner", () => {
  const mailerUrl = new URL('../src/lib/mailer.js', import.meta.url).href;
  const mode = (MAIL_FROM, RESEND_API_KEY = 're_test_not_a_real_key') => {
    const out = execFileSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(mailerUrl)}); console.log(m.mailMode);`], {
      env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:1/x', JWT_SECRET: 'config-test', RESEND_API_KEY, MAIL_FROM },
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.toString().trim().split('\n').pop();
  };
  assert.equal(mode('VoiceLK <onboarding@resend.dev>'), 'resend-test-sender');
  assert.equal(mode('VoiceLK <hello@voicelk.dev>'), 'resend');
  assert.equal(mode('VoiceLK <hello@voicelk.dev>', ''), 'console');
});

test('with a Gmail app password set, mail goes out through SMTP from that Gmail address', async () => {
  const { createServer } = await import('node:net');
  const { once } = await import('node:events');
  // A minimal SMTP server that accepts one login and one message, and records it.
  const received = { auth: '', from: '', to: [], data: '' };
  const smtpServer = createServer((socket) => {
    let inData = false;
    let buffer = '';
    socket.write('220 test ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      let i;
      while ((i = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 2);
        if (inData) {
          if (line === '.') { inData = false; socket.write('250 queued\r\n'); } else received.data += `${line}\n`;
        } else if (/^(EHLO|HELO)/i.test(line)) socket.write('250-test\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (/^AUTH PLAIN/i.test(line)) { received.auth = Buffer.from(line.split(' ')[2], 'base64').toString(); socket.write('235 ok\r\n'); }
        else if (/^MAIL FROM/i.test(line)) { received.from = line; socket.write('250 ok\r\n'); }
        else if (/^RCPT TO/i.test(line)) { received.to.push(line); socket.write('250 ok\r\n'); }
        else if (/^DATA/i.test(line)) { inData = true; socket.write('354 go\r\n'); }
        else if (/^QUIT/i.test(line)) { socket.end('221 bye\r\n'); }
        else socket.write('250 ok\r\n');
      }
    });
  }).listen(0, '127.0.0.1');
  await once(smtpServer, 'listening');

  const mailerUrl = new URL('../src/lib/mailer.js', import.meta.url).href;
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, ['--input-type=module', '-e', `
    const m = await import(${JSON.stringify(mailerUrl)});
    console.log(JSON.stringify({ mode: m.mailMode, from: m.fromAddress }));
    await m.sendMail({ to: 'reader@example.com', subject: 'Welcome to VoiceLK', text: 'Hello', html: '<p>Hello</p>', replyTo: 'rootcode.projects@gmail.com' });
    console.log('sent');`], {
    env: { ...process.env, MONGODB_URI: 'mongodb://127.0.0.1:1/x', JWT_SECRET: 'config-test', RESEND_API_KEY: 're_should_be_ignored',
      MAIL_FROM: 'VoiceLK <onboarding@resend.dev>', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(smtpServer.address().port),
      SMTP_USER: 'rootcode.projects@gmail.com', SMTP_PASS: 'abcd efgh ijkl mnop' },
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  await once(child, 'exit');
  smtpServer.close();

  const info = JSON.parse(out.split('\n').find((l) => l.startsWith('{')));
  assert.equal(info.mode, 'smtp', 'SMTP wins over Resend when both are set');
  assert.equal(info.from, 'VoiceLK <rootcode.projects@gmail.com>');
  assert.match(out, /^sent$/m, out);
  // The app password is used without the spaces Google shows it with.
  assert.equal(received.auth, '\u0000rootcode.projects@gmail.com\u0000abcdefghijklmnop');
  assert.match(received.from, /<rootcode\.projects@gmail\.com>/);
  assert.match(received.to[0], /<reader@example\.com>/);
  assert.match(received.data, /^From: VoiceLK <rootcode\.projects@gmail\.com>$/m);
  assert.match(received.data, /^Reply-To: rootcode\.projects@gmail\.com$/m);
  assert.match(received.data, /^Subject: Welcome to VoiceLK$/m);
});
