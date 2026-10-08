// Fills district photos from Wikimedia Commons (freely licensed images only).
// For each district whose image is empty or an external stock URL (uploads
// made in the admin panel are never replaced), it takes the lead photo of the
// district's English Wikipedia article, falling back to the article of one of
// its attractions. Maps, flags and logos are skipped, as is any file that
// isn't on Commons under CC0 / public domain / CC BY / CC BY-SA. The photo is
// saved to uploads/districts and its credit (author, licence, source) stored
// in `image_credit`, which the site shows on the district page.
//   npm run images:districts [-- --dry-run] [-- --only=slug1,slug2]
//   npm run images:districts:stage ...
require('dotenv').config();
const path = require('path');
const { connectDB, client } = require('../config/db');
const { UPLOADS_DIR } = require('../utils/files');
const { sleep, leadImages, commonsInfo, savePhoto } = require('./wikimediaPhotos');

const OUT_DIR = path.join(UPLOADS_DIR, 'districts');

// Article titles where the English Wikipedia name differs from ours.
const WIKI_TITLES = {
  chittagong: 'Chittagong District',
  comilla: 'Comilla District',
  jashore: 'Jessore District',
  bogura: 'Bogra District',
  barishal: 'Barisal District',
  chapainawabganj: 'Chapai Nawabganj District',
  khagrachari: 'Khagrachari District',
  dhaka: 'Dhaka District',
};

// Better-known landmarks to try first where the district article's lead
// image is weak (an office building, a power plant, a generic view).
const PREFERRED_TITLES = {
  naogaon: 'Somapura Mahavihara',
  pabna: 'Hardinge Bridge',
  gazipur: 'Bhawal National Park',
};

// slug -> photo for every district, trying the district article first and
// then each attraction's article, one batched round per candidate position.
const findPhotos = async (districts, attractionNames) => {
  const candidates = new Map(districts.map((d) => [d.slug, [
    ...(PREFERRED_TITLES[d.slug] ? [PREFERRED_TITLES[d.slug]] : []),
    WIKI_TITLES[d.slug] || `${d.name_en} District`,
    ...(attractionNames.get(String(d._id)) || []).map((name) => String(name).split(',')[0].trim()).filter(Boolean),
  ]]));
  const photos = new Map();
  for (let round = 0; round < 5; round++) {
    const pending = [...candidates].filter(([slug, titles]) => !photos.has(slug) && titles[round]);
    if (!pending.length) break;
    const images = await leadImages(pending.map(([, titles]) => titles[round]));
    const infos = await commonsInfo([...images.values()]);
    for (const [slug, titles] of pending) {
      const info = infos.get(images.get(titles[round]));
      if (info) photos.set(slug, { ...info, via: titles[round] });
    }
  }
  return photos;
};

const needsImage = (image) => !image || /^https?:\/\//i.test(image);

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
  const { DistrictCollection, AttractionCollection } = await connectDB();
  const districts = await DistrictCollection.find(only ? { slug: { $in: only } } : {}).sort({ slug: 1 }).toArray();
  const todo = districts.filter((d) => needsImage(d.image));
  console.log(`${todo.length} of ${districts.length} districts need a photo${dryRun ? ' (dry run)' : ''}.`);

  const attractionNames = new Map();
  for (const a of await AttractionCollection.find({}, { projection: { district_id: 1, name: 1 } }).sort({ order: 1 }).toArray()) {
    const key = String(a.district_id);
    attractionNames.set(key, [...(attractionNames.get(key) || []), a.name]);
  }
  const photos = await findPhotos(todo, attractionNames);
  const missed = [];
  for (const district of todo) {
    const photo = photos.get(district.slug);
    if (!photo) {
      missed.push(district.slug);
      continue;
    }
    console.log(`  ${district.slug}: ${photo.credit.title} [${photo.credit.license}] via "${photo.via}"`);
    if (dryRun) continue;

    const fileName = await savePhoto(photo, OUT_DIR, district.slug);
    if (!fileName) {
      console.warn(`  ${district.slug}: download failed`);
      missed.push(district.slug);
      continue;
    }
    await DistrictCollection.updateOne(
      { _id: district._id },
      { $set: { image: `/uploads/districts/${fileName}`, image_credit: photo.credit } }
    );
    await sleep(300);
  }
  if (missed.length) console.log(`No free photo found for: ${missed.join(', ')} (upload one in the admin panel).`);
  await client.close();
}

run().catch((err) => {
  console.error('Fetching district images failed:', err);
  process.exit(1);
});
