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
