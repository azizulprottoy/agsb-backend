// Adds the starter travel-gear catalog (categories + products) to a database.
// Only categories and products whose slug is missing are added. Existing ones
// are left alone, except that an empty image / image list gets the starter
// photos from data/productImages.js (uploaded images are never replaced).
//   npm run seed:products            (database from .env)
//   npm run seed:products:stage      (database from .env.stage)
require('dotenv').config();
const { connectDB, client } = require('../config/db');
const { PRODUCT_IMAGES, CATEGORY_IMAGES } = require('./data/productImages');

const CATEGORIES = [
  { name: 'Camping', name_bn: 'ক্যাম্পিং', slug: 'camping', order: 1 },
  { name: 'Bags & Backpacks', name_bn: 'ব্যাগ ও ব্যাকপ্যাক', slug: 'bags', order: 2 },
  { name: 'Rain & Water', name_bn: 'বৃষ্টি ও পানি', slug: 'rain-water', order: 3 },
  { name: 'Electronics', name_bn: 'ইলেকট্রনিক্স', slug: 'electronics', order: 4 },
];

// [categorySlug, product]
const PRODUCTS = [
  ['camping', { name: '2-Person Dome Tent', name_bn: '২ জনের তাঁবু', slug: '2-person-dome-tent', summary: 'Waterproof two-person tent with rain fly, sets up in about ten minutes.', salePrice: 4500, saleStock: 5, rentPerDay: 350, rentDeposit: 1500, rentStock: 8, options: [{ name: 'Color', values: ['Green', 'Orange'] }], tags: ['tent', 'bandarban', 'camping'], featured: true }],
  ['camping', { name: 'Sleeping Bag', name_bn: 'স্লিপিং ব্যাগ', slug: 'sleeping-bag', summary: 'Light sleeping bag for hill nights down to about 10°C.', salePrice: 1800, saleStock: 10, rentPerDay: 120, rentDeposit: 500, rentStock: 12, tags: ['camping', 'winter'] }],
  ['camping', { name: 'Headlamp', name_bn: 'হেডল্যাম্প', slug: 'headlamp', summary: 'Rechargeable LED headlamp for night treks and campsites.', salePrice: 650, saleStock: 20, tags: ['light', 'trek'] }],
  ['bags', { name: '45L Trekking Backpack', name_bn: '৪৫ লিটার ট্রেকিং ব্যাকপ্যাক', slug: '45l-trekking-backpack', summary: 'Padded 45-litre pack with rain cover, sized for 3-5 day treks.', salePrice: 3200, saleStock: 6, rentPerDay: 200, rentDeposit: 1000, rentStock: 6, options: [{ name: 'Color', values: ['Black', 'Blue', 'Red'] }], tags: ['backpack', 'trek'], featured: true }],
  ['bags', { name: 'Dry Bag 20L', name_bn: 'ড্রাই ব্যাগ ২০ লিটার', slug: 'dry-bag-20l', summary: 'Roll-top waterproof bag for boat trips in the haor and Sundarbans.', salePrice: 900, saleStock: 15, rentPerDay: 60, rentDeposit: 300, rentStock: 10, tags: ['boat', 'waterproof'] }],
  ['rain-water', { name: 'Life Jacket', name_bn: 'লাইফ জ্যাকেট', slug: 'life-jacket', summary: 'Adult life jacket for river, haor and sea trips.', rentPerDay: 80, rentDeposit: 500, rentStock: 20, options: [{ name: 'Size', values: ['M', 'L', 'XL'] }], tags: ['boat', 'safety'], featured: true }],
  ['rain-water', { name: 'Hooded Raincoat', name_bn: 'রেইনকোট', slug: 'hooded-raincoat', summary: 'Breathable monsoon raincoat that packs into its own pocket.', salePrice: 1200, saleStock: 12, options: [{ name: 'Size', values: ['M', 'L', 'XL', 'XXL'] }], tags: ['monsoon', 'rain'] }],
  ['camping', { name: 'Mosquito Net (Pop-up)', name_bn: 'মশারি (পপ-আপ)', slug: 'pop-up-mosquito-net', summary: 'Folding single-bed mosquito net that stands on its own; no hooks or poles needed.', description: '<p>Opens in seconds on a bed, a cot or the floor of a cottage and folds flat into a round bag. Fine mesh keeps out mosquitoes in the Sundarbans, haor boats and hill cottages.</p><ul><li>Fits a single bed (about 190 × 90 cm)</li><li>Zip door on one side</li><li>Weighs under 1 kg</li></ul>', salePrice: 950, saleStock: 15, rentPerDay: 50, rentDeposit: 300, rentStock: 10, tags: ['sundarbans', 'haor', 'mosquito'] }],
  ['camping', { name: 'Camping Hammock with Bug Net', name_bn: 'মশারিসহ হ্যামক', slug: 'camping-hammock-bug-net', summary: 'Parachute-nylon hammock with a zip-on mosquito net and tree straps.', description: '<p>A light hammock for jungle camps and riverside rests. The net zips closed for the night and flips underneath during the day.</p><ul><li>Holds up to 150 kg</li><li>Tree straps and carabiners included</li><li>Packs to the size of a water bottle</li></ul>', salePrice: 2400, saleStock: 6, rentPerDay: 150, rentDeposit: 800, rentStock: 6, options: [{ name: 'Color', values: ['Olive', 'Navy'] }], tags: ['camping', 'jungle', 'bandarban'] }],
  ['rain-water', { name: 'Anti-Leech Socks', name_bn: 'জোঁক-রোধী মোজা', slug: 'anti-leech-socks', summary: 'Tightly woven over-socks that keep leeches off on monsoon hill treks.', description: '<p>Worn over your normal socks and tucked under your trousers. Essential for Bandarban, Khagrachari and Sylhet forest trails in the rainy season.</p><ul><li>Knee-high with a drawcord top</li><li>Dries quickly</li><li>One size fits most</li></ul>', salePrice: 450, saleStock: 30, tags: ['leech', 'monsoon', 'trek', 'bandarban'], featured: true }],
  ['rain-water', { name: 'Trekking Sandals', name_bn: 'ট্রেকিং স্যান্ডেল', slug: 'trekking-sandals', summary: 'Grippy strap sandals for jhiri walks, stream crossings and wet rocks.', description: '<p>Rubber soles that hold on slippery stones and adjustable straps that stay on in water. Good for Nafakhum, Amiakhum and the jhiri trails of the hill tracts.</p><ul><li>Quick-dry webbing straps</li><li>Heel strap with buckle</li></ul>', salePrice: 1500, saleStock: 20, options: [{ name: 'Size', values: ['39', '40', '41', '42', '43', '44'] }], tags: ['trek', 'water', 'jhiri'] }],
  ['electronics', { name: 'Compact Binoculars 10x25', name_bn: 'বাইনোকুলার ১০x২৫', slug: 'binoculars-10x25', summary: 'Pocket binoculars for birding in the haor and spotting wildlife in the Sundarbans.', description: '<p>Ten-times magnification in a folding body that fits a jacket pocket. Comes with a neck strap and pouch.</p><ul><li>10× magnification, 25 mm lenses</li><li>Weighs about 300 g</li></ul>', salePrice: 2800, saleStock: 4, rentPerDay: 150, rentDeposit: 1500, rentStock: 4, tags: ['birding', 'tanguar-haor', 'sundarbans'] }],
  ['electronics', { name: '20,000 mAh Power Bank', name_bn: '২০,০০০ mAh পাওয়ার ব্যাংক', slug: 'power-bank-20000', summary: 'Charges a phone four to five times; useful where there is no power.', salePrice: 2200, saleStock: 8, rentPerDay: 100, rentDeposit: 1000, rentStock: 5, tags: ['charging'] }],
];

async function run() {
  const { ProductCategoryCollection, ProductCollection } = await connectDB();
  const ids = {};
  let addedCategories = 0;
  let filled = 0;
  for (const c of CATEGORIES) {
    const image = CATEGORY_IMAGES[c.slug] || '';
    const existing = await ProductCategoryCollection.findOne({ slug: c.slug });
    if (existing) {
      ids[c.slug] = existing._id;
      if (!existing.image && image) {
        await ProductCategoryCollection.updateOne({ _id: existing._id }, { $set: { image } });
        filled += 1;
      }
    } else {
      ids[c.slug] = (await ProductCategoryCollection.insertOne({ ...c, image })).insertedId;
      addedCategories += 1;
    }
  }

  const existing = await ProductCollection.find({}, { projection: { slug: 1, images: 1 } }).toArray();
  const have = new Set(existing.map((p) => p.slug));
  for (const p of existing) {
    const images = PRODUCT_IMAGES[p.slug];
    if (images?.length && !(p.images || []).length) {
      await ProductCollection.updateOne({ _id: p._id }, { $set: { images } });
      filled += 1;
    }
  }

  const missing = PRODUCTS.map(([slug, p], order) => [slug, p, order]).filter(([, p]) => !have.has(p.slug));
  if (missing.length) {
    const now = new Date().toISOString();
    await ProductCollection.insertMany(missing.map(([slug, p, order]) => ({
      salePrice: null, saleStock: 0, rentPerDay: null, rentDeposit: 0, rentStock: 0, options: [], tags: [], featured: false,
      description: '', deliveryTime: '1-3 days in Dhaka', images: PRODUCT_IMAGES[p.slug] || [], active: true, order,
      ...p, category_id: ids[slug], createdAt: now,
    })));
  }
  console.log(`"${process.env.MONGO_DB_NAME || 'agsb'}": added ${addedCategories} categories and ${missing.length} product(s); filled images on ${filled} existing record(s).`);
  await client.close();
}

run().catch((err) => {
  console.error('Seeding products failed:', err);
  process.exit(1);
});
