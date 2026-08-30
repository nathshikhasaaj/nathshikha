import 'dotenv/config';
import readline from 'node:readline';
import mongoose from 'mongoose';
import { connectDB } from './config/db.js';
import { User } from './models/User.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

async function run() {
  await connectDB();

  const email = (await ask('Admin email: ')).trim().toLowerCase();
  const name = (await ask('Admin name [Nathshikha Admin]: ')).trim() || 'Nathshikha Admin';
  const password = await ask('Admin password (min 8 chars): ');
  rl.close();

  if (!email || password.length < 8) {
    console.error('Email and an 8+ character password are required.');
    process.exit(1);
  }

  const existing = await User.findOne({ email });
  const hash = User.hashPassword(password);

  if (existing) {
    existing.name = name;
    existing.passwordHash = hash;
    existing.role = 'admin';
    await existing.save();
    console.log(`✓ Admin account updated: ${email}`);
  } else {
    await User.create({
      name,
      email,
      passwordHash: hash,
      role: 'admin'
    });
    console.log(`✓ Admin account created: ${email}`);
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to create admin:', err);
  process.exit(1);
});
