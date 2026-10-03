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

  // Case-insensitive match (same collation as the unique email index), so a
  // differently capitalised ADMIN_EMAIL resets the existing admin instead of
  // failing to insert a duplicate. Bumping tokenVersion logs out every
  // session issued before the reset.
  const result = await AdminCollection.updateOne(
    { email },
    {
      $set: { name, passwordHash, role: 'admin' },
      $setOnInsert: { email },
      $inc: { tokenVersion: 1 },
    },
    { upsert: true, collation: { locale: 'en', strength: 2 } }
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
