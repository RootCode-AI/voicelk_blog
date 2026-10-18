// Creates an evaluator account for the listening evaluation console, or resets
// the password of an existing one. Administrators can do the same from the console.
//   npm run create-evaluator -- rater@example.com "a strong password" "Their Name"

import bcrypt from 'bcryptjs';
import { must, supabase, supabaseEnabled } from '../src/supabase.js';

const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: npm run create-evaluator -- <email> <password> [name]');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Use a password of at least 10 characters.');
  process.exit(1);
}
if (!supabaseEnabled) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY (sb_secret_…) in server/.env first.');
  process.exit(1);
}

const row = { email: email.trim().toLowerCase(), password_hash: await bcrypt.hash(password, 12), created_by: 'cli' };
if (name) row.name = name;
const evaluator = must(await supabase().from('evaluators').upsert(row, { onConflict: 'email' }).select('email').single());
console.info(`Evaluator ready: ${evaluator.email}`);
