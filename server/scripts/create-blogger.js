// Creates a blogger account, or resets the password of an existing one. Admins can
// also add bloggers in the admin panel (Bloggers).
//   npm run create-blogger -- writer@example.com "a strong password" "Their Name"

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { Blogger } from '../src/models/Blogger.js';

const [email, password, name = ''] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: npm run create-blogger -- <email> <password> [name]');
  process.exit(1);
}
if (password.length < 10) {
  console.error('Use a password of at least 10 characters.');
  process.exit(1);
}

await mongoose.connect(config.mongoUri);
const passwordHash = await bcrypt.hash(password, 12);
const blogger = await Blogger.findOneAndUpdate(
  { email: email.toLowerCase() },
  { $set: { passwordHash, ...(name && { name }) }, $setOnInsert: { createdBy: 'cli' } },
  { upsert: true, returnDocument: 'after' },
);
console.info(`Blogger ready: ${blogger.email}`);
await mongoose.disconnect();
