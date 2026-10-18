import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
import { HttpError } from './lib/errors.js';

// The listening evaluation is the only part of the blog stored in Supabase. The
// secret key never leaves the server; browsers only ever see signed upload URLs and
// public audio URLs, so the publishable key and the JWKS URL are not needed here.
const { url, secretKey } = config.supabase;

// A publishable key would pass every request through row level security, which
// allows nothing on these tables; say so plainly instead of failing every query.
const publishableKeyByMistake = secretKey.startsWith('sb_publishable_');
if (publishableKeyByMistake) {
  console.error('[evaluate] SUPABASE_SECRET_KEY holds a publishable key (sb_publishable_…). Use the secret key (sb_secret_…); the listening evaluation stays off until then.');
}

export const supabaseEnabled = Boolean(url && secretKey && !publishableKeyByMistake);

let client;

export function supabase() {
  if (!supabaseEnabled) {
    throw new HttpError(503, 'The listening evaluation is not configured on this server yet.');
  }
  client ??= createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

export const audioBucket = () => supabase().storage.from(config.supabase.audioBucket);

// Unwraps a Supabase { data, error } result so failures reach the error handler.
export function must({ data, error }) {
  if (error) throw Object.assign(new Error(`Supabase: ${error.message}`), { code: error.code, cause: error });
  return data;
}

// PostgREST caps a response at 1000 rows, so long result sets are read in pages.
export async function selectAll(build, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const page = must(await build().range(from, from + pageSize - 1));
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
