// Applies server/supabase/evaluation.sql to the Supabase database, then reports
// what is there. Safe to run again: the schema only adds what is missing and
// brings the audio bucket's settings up to date.
//   npm run db:setup
//
// Needs SUPABASE_DB_URL in server/.env: Supabase Dashboard > Connect > Session
// pooler. The API keys cannot run SQL, so this is the database password itself.
// Keep it local; the running site never needs it.

import { readFile } from 'node:fs/promises';
import pg from 'pg';

const sqlFile = new URL('../supabase/evaluation.sql', import.meta.url);
const raw = process.env.SUPABASE_DB_URL?.trim() ?? '';

if (!raw || /YOUR-PASSWORD|\[YOUR|replace/i.test(raw)) {
  console.error(`Set SUPABASE_DB_URL in server/.env first.
  Supabase Dashboard > your project > Connect (top bar) > Session pooler, then copy the URI:
  postgresql://postgres.<project-ref>:<database-password>@aws-0-<region>.pooler.supabase.com:5432/postgres`);
  process.exit(1);
}

let connectionString;
let directRef = null;
try {
  const url = new URL(raw);
  // db.<ref>.supabase.co only has an IPv6 address; most home networks need the pooler.
  directRef = /^db\.([a-z0-9]+)\.supabase\.co$/.exec(url.hostname)?.[1] ?? null;
  // TLS is configured below; a sslmode in the URL would override it.
  url.searchParams.delete('sslmode');
  connectionString = url.toString();
} catch {
  console.error('SUPABASE_DB_URL is not a valid URL. If the password has characters like @ # / ? %, URL-encode them.');
  process.exit(1);
}

// Supabase signs its database certificates with its own CA. Download it from
// Dashboard > Database settings > SSL configuration and point SUPABASE_DB_CA at it to
// verify the server; without it the connection is still encrypted, just not verified.
const caPath = process.env.SUPABASE_DB_CA?.trim();
const ssl = caPath ? { ca: await readFile(caPath, 'utf8'), rejectUnauthorized: true } : { rejectUnauthorized: false };
if (!caPath) console.info('Connecting with TLS (set SUPABASE_DB_CA to also verify the certificate).');

const HINTS = {
  ENOTFOUND: 'The host was not found. Copy the "Session pooler" string; the direct db.<ref>.supabase.co host needs IPv6.',
  ENETUNREACH: 'The network is unreachable. Use the "Session pooler" string, which works over IPv4.',
  ETIMEDOUT: 'The connection timed out. Check your internet connection, or a firewall blocking port 5432.',
  '28P01': 'Wrong database password. Reset it under Database settings > Database password.',
  XX000: 'Supabase did not recognise the user. With the pooler the user is postgres.<project-ref>, not just postgres.',
};

const client = new pg.Client({ connectionString, ssl, connectionTimeoutMillis: 15000 });

try {
  await client.connect();
  const schema = await readFile(sqlFile, 'utf8');
  // One simple query: Postgres runs every statement in a single transaction, so a
  // failure part-way leaves the database exactly as it was.
  await client.query(schema);
  console.info('Applied server/supabase/evaluation.sql.');

  const tables = await client.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name in ('evaluators', 'evaluation_samples', 'evaluation_feedback')
     order by table_name`,
  );
  const bucket = await client.query(
    `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'evaluation-audio'`,
  );
  console.info(`Tables: ${tables.rows.map((r) => r.table_name).join(', ')}`);
  const b = bucket.rows[0];
  console.info(
    `Bucket evaluation-audio: ${b.public ? 'public' : 'PRIVATE'}, ${b.file_size_limit / 1024 / 1024} MB limit, ${b.allowed_mime_types.length} audio types`,
  );
} catch (err) {
  console.error(`Setup failed: ${err.message}`);
  const hint = HINTS[err.code] ?? (/Tenant or user not found/i.test(err.message) ? HINTS.XX000 : null);
  if (directRef && ['ENOTFOUND', 'ENETUNREACH', 'EHOSTUNREACH'].includes(err.code)) {
    console.error(`SUPABASE_DB_URL uses the direct host db.${directRef}.supabase.co, which is IPv6-only and this network cannot reach it.
In the dashboard: Connect > "Session pooler" (not "Direct connection"), and copy that URI instead. Two things change; the password and port 5432 stay:
  user:  postgres  ->  postgres.${directRef}
  host:  db.${directRef}.supabase.co  ->  aws-0-<region>.pooler.supabase.com (shown in the dialog)`);
  } else if (hint) {
    console.error(hint);
  }
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
