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
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const { connectDB, client } = require('../config/db');
const { UPLOADS_DIR } = require('../utils/files');

const USER_AGENT = "AGSB-district-images/1.0 (Bangladesh travel site; one-off import of district photos)";
const WIDTH = 1600;
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

const NOT_A_PHOTO = /map|locator|location|flag|seal|logo|emblem|coat[_ ]of[_ ]arms|division|upazila|\.svg$|\.gif$|\.tiff?$/i;
const FREE_LICENSE = /^(cc0|public domain|pd\b|pd-|cc[ -]by(-sa)?([ -][\d.]+)?)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GET a MediaWiki API; waits and retries when rate limited (HTTP 429).
const api = async (host, params, attempt = 0) => {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 429 && attempt < 5) {
    const wait = (Number(res.headers.get('retry-after')) || 5 * 2 ** attempt) * 1000;
    await sleep(wait);
    return api(host, params, attempt + 1);
  }
  if (!res.ok) throw new Error(`${host} API ${res.status}`);
  return res.json();
};

const stripHtml = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

// Article title -> lead image file name (photos only), 50 titles per request.
const leadImages = async (titles) => {
  const found = new Map();
  for (const batch of chunks([...new Set(titles)], 50)) {
    const data = await api('en.wikipedia.org', { action: 'query', prop: 'pageimages', piprop: 'name', pilimit: '50', redirects: '1', titles: batch.join('|') });
    // Map requested titles through normalisation and redirects to the final page.
    const finalTitle = new Map(batch.map((t) => [t, t]));
    for (const { from, to } of [...(data.query?.normalized || []), ...(data.query?.redirects || [])]) {
      for (const [req, cur] of finalTitle) if (cur === from) finalTitle.set(req, to);
    }
    const imageOf = new Map((data.query?.pages || []).map((p) => [p.title, p.pageimage]));
    for (const [req, cur] of finalTitle) {
      const name = imageOf.get(cur);
      if (name && !NOT_A_PHOTO.test(name)) found.set(req, name);
    }
    await sleep(500);
  }
  return found;
};

// File name -> { thumbUrl, credit } for freely licensed Commons files.
const commonsInfo = async (fileNames) => {
  const found = new Map();
  for (const batch of chunks([...new Set(fileNames)], 50)) {
    const data = await api('commons.wikimedia.org', {
      action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: String(WIDTH),
      titles: batch.map((f) => `File:${f}`).join('|'),
    });
    const titleFor = new Map(batch.map((f) => [`File:${f}`, f]));
    for (const { from, to } of data.query?.normalized || []) {
      if (titleFor.has(from)) titleFor.set(to, titleFor.get(from));
    }
    for (const page of data.query?.pages || []) {
      const info = !page.missing && page.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) continue;
      const meta = info.extmetadata || {};
      const license = stripHtml(meta.LicenseShortName?.value);
      if (!FREE_LICENSE.test(license)) continue;
      found.set(titleFor.get(page.title), {
        thumbUrl: info.thumburl || info.url,
        credit: {
          title: page.title.replace(/^File:/, ''),
          author: stripHtml(meta.Artist?.value) || 'Unknown',
          license,
          license_url: meta.LicenseUrl?.value || '',
          source_url: info.descriptionurl,
        },
      });
    }
    await sleep(500);
  }
  return found;
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
  fs.mkdirSync(OUT_DIR, { recursive: true });

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

    const res = await fetch(photo.thumbUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (!res.ok) {
      console.warn(`  ${district.slug}: download failed (${res.status})`);
      missed.push(district.slug);
      continue;
    }
    const fileName = `${district.slug}-${crypto.randomBytes(4).toString('hex')}.jpg`;
    await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize({ width: WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toFile(path.join(OUT_DIR, fileName));
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
