// One-off migration: attractions used to be an array inside each district.
// Copies every embedded attraction into the `attractions` collection (slug
// from its name; details kept) and then removes the array from the district.
// Safe to re-run: districts without an embedded array are skipped.
//   npm run migrate:attractions [-- --dry-run]
//   npm run migrate:attractions:stage
require('dotenv').config();
const { connectDB, client } = require('../config/db');
const { docsFromEmbedded } = require('../utils/attractions');

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const { DistrictCollection, AttractionCollection } = await connectDB();
  const taken = new Set((await AttractionCollection.find({}, { projection: { slug: 1 } }).toArray()).map((a) => a.slug));
  const districts = await DistrictCollection.find({ attractions: { $exists: true } }).sort({ slug: 1 }).toArray();

  let moved = 0;
  for (const district of districts) {
    const docs = docsFromEmbedded(district, taken);
    if (dryRun) {
      console.log(`  ${district.slug}: ${docs.map((d) => d.slug).join(', ') || '(none)'}`);
    } else {
      if (docs.length) await AttractionCollection.insertMany(docs);
      await DistrictCollection.updateOne({ _id: district._id }, { $unset: { attractions: '' } });
    }
    moved += docs.length;
  }
  console.log(`${dryRun ? 'Would move' : 'Moved'} ${moved} attraction(s) from ${districts.length} district(s) in "${process.env.MONGO_DB_NAME || 'agsb'}".`);
  await client.close();
}

run().catch((err) => {
  console.error('Migrating attractions failed:', err);
  process.exit(1);
});
