// Converts every stored image in uploads/ and private-uploads/ to WebP and
// rewrites the paths saved in the database to match:
//   '/uploads/<dir>/<name>.jpg' -> '/uploads/<dir>/<name>.webp' in any string
//   field of any collection (including HTML such as blog bodies), and the
//   bare file names in frames.original (private premium originals).
// Old files are deleted only after the database is updated. Files already in
// WebP are skipped, so it is safe to re-run. Pass --dry-run to only report.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, client } = require('../config/db');
const { toWebp } = require('../utils/webp');

const ROOT = path.resolve(__dirname, '..', '..');
const DIRS = [
  { abs: path.join(ROOT, 'uploads'), publicPrefix: '/uploads/' },
  { abs: path.join(ROOT, 'private-uploads'), publicPrefix: null },
];
const CONVERTIBLE = /\.(jpe?g|png|gif)$/i;
const DRY_RUN = process.argv.includes('--dry-run');

const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [])
  .flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));

// Free path for <name>.webp next to the file (another upload could already
// use that name).
const webpPathFor = (file) => {
  const { dir, name } = path.parse(file);
  let candidate = path.join(dir, `${name}.webp`);
  for (let i = 1; fs.existsSync(candidate); i += 1) candidate = path.join(dir, `${name}-${i}.webp`);
  return candidate;
};

// Returns the value with every mapped path replaced, or undefined if nothing
// changed. Walks nested objects and arrays.
const rewrite = (value, publicMap) => {
  if (typeof value === 'string') {
    const next = value.replace(/\/uploads\/[A-Za-z0-9._\/-]+\.(?:jpe?g|png|gif)/gi, (m) => publicMap.get(m) || m);
    return next === value ? undefined : next;
  }
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => {
      const r = rewrite(v, publicMap);
      if (r !== undefined) changed = true;
      return r === undefined ? v : r;
    });
    return changed ? out : undefined;
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    let changed = false;
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const r = rewrite(v, publicMap);
      if (r !== undefined) changed = true;
      out[k] = r === undefined ? v : r;
    }
    return changed ? out : undefined;
  }
  return undefined;
};

async function run() {
  // 1. Convert files (old ones are kept until the database points elsewhere).
  const publicMap = new Map(); // '/uploads/a/x.jpg' -> '/uploads/a/x.webp'
  const privateMap = new Map(); // 'x.jpg' -> 'x.webp' (frames.original)
  const converted = [];
  let failed = 0;
  for (const { abs, publicPrefix } of DIRS) {
    for (const file of walk(abs).filter((f) => CONVERTIBLE.test(f))) {
      const out = webpPathFor(file);
      try {
        if (!DRY_RUN) await toWebp(file, out);
      } catch (err) {
        failed += 1;
        console.error(`Could not convert ${path.relative(ROOT, file)}: ${err.message}`);
        continue;
      }
      converted.push({ file, out });
      if (publicPrefix) {
        const toPublic = (p) => publicPrefix + path.relative(abs, p).split(path.sep).join('/');
        publicMap.set(toPublic(file), toPublic(out));
      } else {
        privateMap.set(path.basename(file), path.basename(out));
      }
    }
  }
  console.log(`${DRY_RUN ? 'Would convert' : 'Converted'} ${converted.length} file(s)${failed ? `, ${failed} failed` : ''}.`);

  // 2. Point the database at the new files.
  const collections = await connectDB();
  let updatedDocs = 0;
  for (const [key, collection] of Object.entries(collections)) {
    for await (const doc of collection.find({})) {
      const { _id, ...fields } = doc;
      const set = {};
      for (const [field, value] of Object.entries(fields)) {
        const r = rewrite(value, publicMap);
        if (r !== undefined) set[field] = r;
      }
      if (key === 'FrameCollection' && privateMap.has(doc.original)) set.original = privateMap.get(doc.original);
      if (!Object.keys(set).length) continue;
      updatedDocs += 1;
      if (DRY_RUN) console.log(`${collection.collectionName} ${_id}: ${Object.keys(set).join(', ')}`);
      else await collection.updateOne({ _id }, { $set: set });
    }
  }
  console.log(`${DRY_RUN ? 'Would update' : 'Updated'} ${updatedDocs} document(s).`);

  // 3. Remove the originals.
  if (!DRY_RUN) {
    for (const { file } of converted) await fs.promises.unlink(file);
    console.log(`Removed ${converted.length} original file(s).`);
  }
  await client.close();
}

run().catch(async (err) => {
  console.error('Converting uploads to WebP failed:', err);
  await client.close().catch(() => {});
  process.exit(1);
});
