// Lists admin accounts, or deletes one. A deleted admin is signed out at once:
// every request checks that the account still exists.
//   npm run delete-admin -- --list
//   npm run delete-admin -- you@example.com

import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { Admin } from '../src/models/Admin.js';

const [arg] = process.argv.slice(2);

if (!arg) {
  console.error('Usage: npm run delete-admin -- <email>   (or --list to see every admin)');
  process.exit(1);
}

await mongoose.connect(config.mongoUri);
try {
  const admins = await Admin.find().select('email name createdAt').sort({ createdAt: 1 }).lean();

  if (arg === '--list') {
    if (!admins.length) console.info('No admin accounts.');
    for (const a of admins) console.info(`${a.email}${a.name ? `  (${a.name})` : ''}  created ${a.createdAt?.toISOString().slice(0, 10)}`);
  } else {
    const email = arg.trim().toLowerCase();
    const admin = admins.find((a) => a.email === email);
    if (!admin) {
      console.error(`No admin with the email ${email}. Run npm run delete-admin -- --list to see them.`);
      process.exitCode = 1;
    } else if (admins.length === 1) {
      // Deleting the only account would lock everyone out of /admin.
      console.error(`${email} is the only admin. Create another first: npm run create-admin -- <email> <password> [name]`);
      process.exitCode = 1;
    } else {
      await Admin.deleteOne({ _id: admin._id });
      console.info(`Deleted admin ${email}. ${admins.length - 1} admin account(s) remain.`);
    }
  }
} finally {
  await mongoose.disconnect();
}
