// One-off migration: premium frames uploaded before originals were kept
// private still have their full image in the public uploads/frames folder.
// Moves each one to private-uploads/frames and replaces it with a watermarked
// preview. Safe to re-run: frames that already have an `original` are skipped.
// Premium frames whose image is an external URL can't be protected; they are
// listed so the admin can upload the file instead.
require('dotenv').config();
const { connectDB, client } = require('../config/db');
const { makePremium } = require('../utils/frameFiles');
const { removeUpload } = require('../utils/files');

async function run() {
  const { FrameCollection } = await connectDB();
  const frames = await FrameCollection.find({ premium: true, original: { $in: [null, ''] } }).toArray();
  let moved = 0;
  for (const frame of frames) {
    const result = await makePremium(frame);
    if (!result) {
      console.warn(`Skipped "${frame.name}" (${frame._id}): image is not a local upload (${frame.image || 'none'})`);
      continue;
    }
    await FrameCollection.updateOne({ _id: frame._id }, { $set: result });
    await removeUpload(frame.image); // already moved; no-op unless a copy remains
    moved += 1;
  }
  console.log(`Protected ${moved} of ${frames.length} premium frame(s).`);
  await client.close();
}

run().catch((err) => {
  console.error('Protecting premium frames failed:', err);
  process.exit(1);
});
