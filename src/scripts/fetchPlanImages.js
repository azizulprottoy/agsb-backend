// Fills travel plan cover photos from Wikimedia Commons (freely licensed
// images only), replacing empty images and external stock URLs; photos
// uploaded in the admin panel are never replaced. Each plan tries the
// articles in PLAN_TITLES first (the place the trip is really about), then its
// districts' articles. The photo is saved to uploads/plans and its credit
// (author, licence, source) stored in `image_credit`.
//   npm run images:plans [-- --dry-run] [-- --only=slug1,slug2]
//   npm run images:plans:stage ...
require('dotenv').config();
const path = require('path');
const { connectDB, client } = require('../config/db');
const { UPLOADS_DIR } = require('../utils/files');
const { sleep, leadImages, commonsInfo, savePhoto } = require('./wikimediaPhotos');

const OUT_DIR = path.join(UPLOADS_DIR, 'plans');

// Plan slug -> Wikipedia articles whose lead photo fits the trip, best first.
const PLAN_TITLES = {
  'sundarbans-expedition': ['Sundarbans', 'Sundarbans National Park'],
  'kuakata-family': ['Kuakata', 'Kuakata National Park'],
  'rajshahi-heritage': ['Puthia Temple Complex', 'Varendra Research Museum', 'Rajshahi'],
  'bandarban-adventure': ['Nilgiri (Bandarban)', 'Nafakhum', 'Bandarban District'],
  'sylhet-3-day': ['Ratargul Swamp Forest', 'Jaflong', 'Sylhet'],
  'coxs-bazar-weekend': ["Cox's Bazar Beach", "Cox's Bazar"],
};

// Older district spellings used in plans -> Wikipedia article.
const DISTRICT_TITLES = {
  Chattogram: 'Chittagong District',
  Chittagong: 'Chittagong District',
  Cumilla: 'Comilla District',
  Comilla: 'Comilla District',
  Jashore: 'Jessore District',
  Bogura: 'Bogra District',
  Barishal: 'Barisal District',
  Barisal: 'Barisal District',
};

const needsImage = (image) => !image || /^https?:\/\//i.test(image);

// slug -> photo, one batched round per candidate position.
const findPhotos = async (plans) => {
  const candidates = new Map(plans.map((p) => [p.slug, [
    ...(PLAN_TITLES[p.slug] || []),
    ...(Array.isArray(p.districts) ? p.districts : []).map((d) => DISTRICT_TITLES[d] || `${d} District`),
  ]]));
  const photos = new Map();
  for (let round = 0; round < 6; round++) {
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

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
  const { TravelPlanCollection } = await connectDB();
  const plans = await TravelPlanCollection.find(only ? { slug: { $in: only } } : {}).sort({ slug: 1 }).toArray();
  const todo = plans.filter((p) => needsImage(p.image));
  console.log(`${todo.length} of ${plans.length} plans need a photo${dryRun ? ' (dry run)' : ''}.`);

  const photos = await findPhotos(todo);
  const missed = [];
  for (const plan of todo) {
    const photo = photos.get(plan.slug);
    if (!photo) {
      missed.push(plan.slug);
      continue;
    }
    console.log(`  ${plan.slug}: ${photo.credit.title} [${photo.credit.license}] via "${photo.via}"`);
    if (dryRun) continue;

    const fileName = await savePhoto(photo, OUT_DIR, plan.slug);
    if (!fileName) {
      console.warn(`  ${plan.slug}: download failed`);
      missed.push(plan.slug);
      continue;
    }
    await TravelPlanCollection.updateOne(
      { _id: plan._id },
      { $set: { image: `/uploads/plans/${fileName}`, image_credit: photo.credit } }
    );
    await sleep(300);
  }
  if (missed.length) console.log(`No free photo found for: ${missed.join(', ')} (upload one in the admin panel).`);
  await client.close();
}

run().catch((err) => {
  console.error('Fetching plan images failed:', err);
  process.exit(1);
});
