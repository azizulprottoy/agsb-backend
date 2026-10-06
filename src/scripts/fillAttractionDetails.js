// Fills the written content from data/attractionDetails.js into attractions
// already in the database (matched by slug). Only blank fields are set, and
// desc only while it is still the short seeded text, so edits made in the
// admin panel are kept. Safe to re-run.
//   npm run fill:attractions            (database from .env)
//   npm run fill:attractions:stage      (database from .env.stage)
//   ... -- --dry-run                    list what would change, write nothing
require('dotenv').config();
const { connectDB, client } = require('../config/db');
const districts = require('./data/districts');
const attractionDetails = require('./data/attractionDetails');
const { slugify } = require('../utils/attractions');

const FIELDS = ['name_bn', 'location', 'details'];

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const { AttractionCollection } = await connectDB();

  // slug -> the short desc the district data seeded it with.
  const seededDesc = new Map(districts.flatMap((d) => (d.attractions || []).map((a) => [slugify(a.name), a.desc])));

  const attractions = await AttractionCollection.find(
    { slug: { $in: Object.keys(attractionDetails) } },
    { projection: { slug: 1, desc: 1, ...Object.fromEntries(FIELDS.map((f) => [f, 1])) } }
  ).toArray();

  let changed = 0;
  for (const attraction of attractions) {
    const extra = attractionDetails[attraction.slug];
    const update = {};
    for (const field of FIELDS) {
      const value = String(extra[field] || '').trim();
      if (value && !String(attraction[field] || '').trim()) update[field] = value;
    }
    const desc = String(attraction.desc || '').trim();
    if (extra.desc && (!desc || desc === seededDesc.get(attraction.slug))) update.desc = extra.desc.trim();
    if (!Object.keys(update).length) continue;

    changed++;
    if (dryRun) console.log(`  ${attraction.slug}: ${Object.keys(update).join(', ')}`);
    else await AttractionCollection.updateOne({ _id: attraction._id }, { $set: update });
  }
  console.log(`${dryRun ? 'Would update' : 'Updated'} ${changed} of ${attractions.length} matching attraction(s) in "${process.env.MONGO_DB_NAME || 'agsb'}".`);
  await client.close();
}

run().catch((err) => {
  console.error('Filling attraction details failed:', err);
  process.exit(1);
});
