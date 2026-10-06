// Adds placeholder mobile-banking payment methods to a database. Only methods
// whose name is missing are added; existing ones are never changed.
// The numbers are dummies for development: replace them with the real
// account numbers from the admin panel before taking real payments.
//   npm run seed:payment-methods            (database from .env)
//   npm run seed:payment-methods:stage      (database from .env.stage)
require('dotenv').config();
const { connectDB, client } = require('../config/db');

const METHODS = [
  { method: 'bKash', number: '01700000000', extradetails: 'TEST NUMBER - do not send money. Use "Send Money" and put your booking or order ID as the reference.' },
  { method: 'Nagad', number: '01800000000', extradetails: 'TEST NUMBER - do not send money. Use "Send Money" and put your booking or order ID as the reference.' },
  { method: 'Rocket', number: '01900000000', extradetails: 'TEST NUMBER - do not send money. Use "Send Money" and put your booking or order ID as the reference.' },
];

async function run() {
  const { PaymentMethodCollection } = await connectDB();
  const have = new Set((await PaymentMethodCollection.find({}, { projection: { method: 1 } }).toArray()).map((m) => m.method));
  const missing = METHODS.filter((m) => !have.has(m.method));
  if (missing.length) await PaymentMethodCollection.insertMany(missing.map((m) => ({ ...m, active: true })));
  console.log(`"${process.env.MONGO_DB_NAME || 'agsb'}": added ${missing.length} payment method(s).`);
  await client.close();
}

run().catch((err) => {
  console.error('Seeding payment methods failed:', err);
  process.exit(1);
});
