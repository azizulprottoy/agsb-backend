// Marks the popular districts as "complete" so they show in the home page's
// Popular Districts carousel (which lists complete districts, A-Z, up to 12).
// Pass slugs as arguments to override the default list:
//   node src/scripts/markPopularDistricts.js dhaka sylhet ...
// Safe to re-run; districts already complete are left as they are.
require('dotenv').config();
const { connectDB, client } = require('../config/db');

const DEFAULT_SLUGS = [
  'bagerhat', 'bandarban', 'chittagong', 'coxs-bazar', 'dhaka', 'khagrachari',
  'khulna', 'moulvibazar', 'patuakhali', 'rangamati', 'sunamganj', 'sylhet',
];

async function run() {
  const slugs = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SLUGS;
  const { DistrictCollection } = await connectDB();
  const found = await DistrictCollection.find({ slug: { $in: slugs } }, { projection: { slug: 1 } }).toArray();
  const missing = slugs.filter((s) => !found.some((d) => d.slug === s));
  if (missing.length) console.warn(`Not found: ${missing.join(', ')}`);
  const result = await DistrictCollection.updateMany({ slug: { $in: slugs } }, { $set: { status: 'complete' } });
  console.log(`Marked ${result.modifiedCount} district(s) complete (${result.matchedCount} matched).`);
  const complete = await DistrictCollection.countDocuments({ status: 'complete' });
  console.log(`${complete} district(s) are now complete.`);
  await client.close();
}

run().catch((err) => {
  console.error('Marking popular districts failed:', err);
  process.exit(1);
});
