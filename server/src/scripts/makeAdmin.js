import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from '../models.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: npm run make-admin -- user@example.com');
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is missing. Configure server/.env first.');
  process.exit(1);
}
try {
  await mongoose.connect(process.env.MONGODB_URI);
  const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true }).select('name email role');
  if (!user) {
    console.error(`No account found for ${email}. Sign up through the app first, then run this command.`);
    process.exitCode = 1;
  } else {
    console.log(`Admin role granted to ${user.email}.`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
