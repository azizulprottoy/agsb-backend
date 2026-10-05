// Adds every district from data/districts.js that the database doesn't have
// yet (matched by slug). Existing districts are never changed, so edits made
// in the admin panel are kept. Safe to re-run.
//   npm run seed:districts            (database from .env)
//   npm run seed:districts:stage      (database from .env.stage)
//   ... -- --dry-run                  list what would be added, write nothing
require('dotenv').config();
const { connectDB, client } = require('../config/db');
const districts = require('./data/districts');

// Division slugs used in the data -> slugs a database may store them under.
const DIVISION_ALIASES = {
  chittagong: ['chittagong', 'chattogram'],
  barishal: ['barishal', 'barisal'],
};

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const { DivisionCollection, DistrictCollection } = await connectDB();

  const divisions = await DivisionCollection.find({}, { projection: { slug: 1 } }).toArray();
  const divisionId = (slug) => {
    const accepted = DIVISION_ALIASES[slug] || [slug];
    return divisions.find((d) => accepted.includes(d.slug))?._id;
  };

  // find() rather than distinct(): the client uses the strict Stable API, which excludes distinct.
  const stored = await DistrictCollection.find({}, { projection: { slug: 1 } }).toArray();
  const existing = new Set(stored.map((d) => String(d.slug)));
  const missing = districts.filter((d) => !existing.has(d.slug));

  const docs = [];
  const unplaced = [];
  for (const { divisionSlug, ...district } of missing) {
    const id = divisionId(divisionSlug);
    if (!id) {
      unplaced.push(`${district.slug} (division "${divisionSlug}" not found)`);
      continue;
    }
    docs.push({ ...district, division_id: id });
  }

  console.log(`Database "${process.env.MONGO_DB_NAME || 'agsb'}": ${existing.size} districts exist, ${missing.length} missing.`);
  if (unplaced.length) console.warn(`Skipped (create the division first):\n  ${unplaced.join('\n  ')}`);
  if (!docs.length) {
    console.log('Nothing to add.');
  } else if (dryRun) {
    console.log(`Would add ${docs.length}: ${docs.map((d) => d.slug).join(', ')}`);
  } else {
    const result = await DistrictCollection.insertMany(docs, { ordered: false });
    console.log(`Added ${result.insertedCount}: ${docs.map((d) => d.slug).join(', ')}`);
  }
  await client.close();
}

run().catch((err) => {
  console.error('Seeding districts failed:', err);
  process.exit(1);
});
