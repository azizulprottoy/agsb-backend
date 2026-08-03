require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB, client } = require('../config/db');

async function seedAdmin() {
  const { AdminCollection } = await connectDB();

  const name = process.env.ADMIN_NAME || 'Admin';
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before seeding.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await AdminCollection.updateOne(
    { email },
    { $set: { name, email, passwordHash, role: 'admin' } },
    { upsert: true }
  );

  console.log(
    result.upsertedCount
      ? `Admin created: ${email}`
      : `Admin already existed, password reset: ${email}`
  );

  await client.close();
}

seedAdmin().catch((err) => {
  console.error('Seeding admin failed:', err);
  process.exit(1);
});
