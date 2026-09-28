// Creates an admin account, or resets the password of an existing one.
//   npm run create-admin -- you@example.com "a strong password" "Your Name"

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { Admin } from '../src/models/Admin.js';

const [email, password, name = ''] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: npm run create-admin -- <email> <password> [name]');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Use a password of at least 10 characters.');
  process.exit(1);
}

await mongoose.connect(config.mongoUri);
const passwordHash = await bcrypt.hash(password, 12);
const admin = await Admin.findOneAndUpdate(
  { email: email.toLowerCase() },
  { $set: { passwordHash, ...(name && { name }) } },
  { upsert: true, returnDocument: 'after' },
);
console.info(`Admin ready: ${admin.email}`);
await mongoose.disconnect();
