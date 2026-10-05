require('dotenv').config();
const { connectDB, client } = require('../config/db');
const planDescriptions = require('./data/planDescriptions');
const districts = require('./data/districts');

const divisions = [
  { name_bn: "ঢাকা", name_en: "Dhaka", slug: "dhaka", color: "#4CAF50", districtCount: 13 },
  { name_bn: "চট্টগ্রাম", name_en: "Chittagong", slug: "chittagong", color: "#2196F3", districtCount: 11 },
  { name_bn: "খুলনা", name_en: "Khulna", slug: "khulna", color: "#FF9800", districtCount: 10 },
  { name_bn: "রাজশাহী", name_en: "Rajshahi", slug: "rajshahi", color: "#9C27B0", districtCount: 8 },
  { name_bn: "রংপুর", name_en: "Rangpur", slug: "rangpur", color: "#F44336", districtCount: 8 },
  { name_bn: "বরিশাল", name_en: "Barishal", slug: "barishal", color: "#00BCD4", districtCount: 6 },
  { name_bn: "সিলেট", name_en: "Sylhet", slug: "sylhet", color: "#8BC34A", districtCount: 4 },
  { name_bn: "ময়মনসিংহ", name_en: "Mymensingh", slug: "mymensingh", color: "#E91E63", districtCount: 4 },
];


const blogPosts = [
  { title_bn: "কক্সবাজার ভ্রমণ গাইড ২০২৬", title_en: "Cox's Bazar Travel Guide 2026", slug: "coxs-bazar-travel-guide-2026", category: "Guide", image: "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=600", excerpt: "Complete budget breakdown, best hotels, food spots, and a 3-day itinerary for Cox's Bazar.", date: "2026-08-05", readTime: "8 min", districtSlug: "coxs-bazar" },
  { title_bn: "সিলেটে ৫ দিনে কী কী দেখবেন", title_en: "5 Days in Sylhet: Complete Itinerary", slug: "5-days-sylhet-itinerary", category: "Itinerary", image: "https://images.unsplash.com/photo-1609946860441-a51ffcf22208?w=600", excerpt: "Tea gardens, waterfalls, haors, and hidden gems — day-by-day plan with costs.", date: "2026-08-12", readTime: "10 min", districtSlug: "sylhet" },
  { title_bn: "বাংলাদেশের সেরা ১০ ঝর্ণা", title_en: "Top 10 Waterfalls in Bangladesh", slug: "top-10-waterfalls-bangladesh", category: "Top List", image: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600", excerpt: "From Nafakhum to Madhabkunda — the most stunning waterfalls you must visit.", date: "2026-08-20", readTime: "6 min", districtSlug: "bandarban" },
  { title_bn: "সুন্দরবন ভ্রমণ: যা জানা দরকার", title_en: "Sundarbans: Everything You Need to Know", slug: "sundarbans-complete-guide", category: "Guide", image: "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=600", excerpt: "Permits, boat options, safety, best season, and 3-day tour plan for the Sundarbans.", date: "2026-09-02", readTime: "12 min", districtSlug: "bagerhat" },
  { title_bn: "কম বাজেটে বান্দরবান ভ্রমণ", title_en: "Budget Travel to Bandarban", slug: "budget-bandarban-guide", category: "Budget", image: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600", excerpt: "How to explore Nilgiri, Golden Temple, and Chimbuk under ৳4,000.", date: "2026-09-15", readTime: "7 min", districtSlug: "bandarban" },
  { title_bn: "হাওরের দেশ সুনামগঞ্জ", title_en: "Sunamganj: Land of Haors", slug: "sunamganj-haor-guide", category: "Guide", image: "https://images.unsplash.com/photo-1609946860441-a51ffcf22208?w=600", excerpt: "Tanguar Haor, Shimul Bagan, and the best monsoon boat trips in Sunamganj.", date: "2026-09-25", readTime: "9 min", districtSlug: "sunamganj" },
];

const travelPlans = [
  { title_bn: "কক্সবাজার উইকেন্ড প্ল্যান", title_en: "Cox's Bazar Weekend Getaway", slug: "coxs-bazar-weekend", duration: "2 days", type: "Weekend", districts: ["Cox's Bazar"], cost: "৳3,500–৳5,000", image: "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=600", highlights: ["Laboni Beach sunset", "Inani Beach morning", "Burmese Market shopping", "Fresh seafood dinner"] },
  { title_bn: "সিলেট ৩ দিনের প্ল্যান", title_en: "Sylhet 3-Day Nature Trip", slug: "sylhet-3-day", duration: "3 days", type: "Nature", districts: ["Sylhet", "Moulvibazar"], cost: "৳4,000–৳6,500", image: "https://images.unsplash.com/photo-1609946860441-a51ffcf22208?w=600", highlights: ["Ratargul boat ride", "Jaflong stone garden", "Srimangal tea tasting", "Lawachara forest walk"] },
  { title_bn: "বান্দরবান অ্যাডভেঞ্চার", title_en: "Bandarban Adventure Trek", slug: "bandarban-adventure", duration: "5 days", type: "Adventure", districts: ["Bandarban"], cost: "৳6,000–৳10,000", image: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600", highlights: ["Nilgiri hilltop sunrise", "Boga Lake trek", "Nafakhum waterfall", "Tribal village visit"] },
  { title_bn: "ঐতিহ্যবাহী রাজশাহী", title_en: "Rajshahi Heritage Tour", slug: "rajshahi-heritage", duration: "2 days", type: "Heritage", districts: ["Rajshahi", "Chapainawabganj"], cost: "৳2,500–৳4,000", image: "https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=600", highlights: ["Puthia temples", "Varendra Museum", "Padma sunset", "Sona Mosque day trip"] },
  { title_bn: "কুয়াকাটা ফ্যামিলি ট্রিপ", title_en: "Kuakata Family Trip", slug: "kuakata-family", duration: "3 days", type: "Family", districts: ["Patuakhali"], cost: "৳3,000–৳5,500", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600", highlights: ["Sunrise AND sunset from one beach", "Fatrar Char boat trip", "Buddhist temple visit", "Red crab island"] },
  { title_bn: "সুন্দরবন অভিযান", title_en: "Sundarbans Expedition", slug: "sundarbans-expedition", duration: "3 days", type: "Nature", districts: ["Bagerhat", "Satkhira"], cost: "৳5,000–৳8,000", image: "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=600", highlights: ["Royal Bengal Tiger habitat", "Mangrove boat safari", "Karamjal wildlife center", "Honey collection experience"] },
];

const partners = [
  { name: "Sea Pearl Beach Resort", type: "hotel", district: "Cox's Bazar", rating: 4.5, price: "৳3,500/night", discount: "15% AGSB member", image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400", verified: true },
  { name: "Srimangal Tea Resort", type: "resort", district: "Moulvibazar", rating: 4.2, price: "৳2,800/night", discount: "10% AGSB member", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400", verified: true },
  { name: "Hillside Bandarban Lodge", type: "hotel", district: "Bandarban", rating: 4.0, price: "৳2,200/night", discount: "12% AGSB member", image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400", verified: true },
  { name: "Adventure Gear BD", type: "gear", district: "Dhaka", rating: 4.3, price: "৳500–৳1,500/day", discount: "20% for members", image: "https://images.unsplash.com/photo-1501555088652-021faa106b9b?w=400", verified: true },
];

const membershipPlans = [
  { name: "Explorer", price: "Free", period: "", desc: "Start your 64-district journey", features: ["64-district badge tracker", "3 free frames/month (watermarked)", "Save trip plans", "Basic district guides", "Community access"], cta: "Sign Up Free", popular: false, order: 0 },
  { name: "Premium", price: "৳199", period: "/month", desc: "For serious Bangladesh travellers", features: ["Everything in Explorer", "Unlimited HD frames (no watermark)", "Exclusive premium guides", "15% partner hotel discounts", "Early access to new districts", "64-district completion certificate"], cta: "Start Premium", popular: true, order: 1 },
  { name: "Annual", price: "৳999", period: "/year", desc: "Best value — save ৳1,389", features: ["Everything in Premium", "2 months free", "Exclusive annual member badge", "20% partner discounts", "Featured traveller spotlight"], cta: "Go Annual", popular: false, order: 2 },
];

// Lower bound of a cost range like "৳3,500–৳5,000" -> 3500 (null if none).
const startingPrice = (cost) => {
  const match = String(cost || '').match(/\d[\d,]*/);
  return match ? Number(match[0].replace(/,/g, '')) : null;
};

const SEED_SEATS = 20;

// This script deletes every division, district, blog post, travel plan,
// partner and membership plan before inserting the demo content.
const assertSafeToRun = () => {
  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed: NODE_ENV=production. This script wipes content collections.');
    process.exit(1);
  }
  if (!process.argv.includes('--force')) {
    console.error(`This deletes all divisions, districts, blog posts, travel plans, partners and membership plans in database "${process.env.MONGO_DB_NAME || '(default)'}".`);
    console.error('Re-run with --force to continue:  npm run seed:content -- --force');
    process.exit(1);
  }
};

async function seed() {
  assertSafeToRun();
  const {
    DivisionCollection,
    DistrictCollection,
    BlogCollection,
    TravelPlanCollection,
    PartnerCollection,
    MembershipPlanCollection,
  } = await connectDB();

  await Promise.all([
    DivisionCollection.deleteMany({}),
    DistrictCollection.deleteMany({}),
    BlogCollection.deleteMany({}),
    TravelPlanCollection.deleteMany({}),
    PartnerCollection.deleteMany({}),
    MembershipPlanCollection.deleteMany({}),
  ]);

  const divisionResult = await DivisionCollection.insertMany(divisions);
  const slugToDivisionId = {};
  divisions.forEach((d, i) => { slugToDivisionId[d.slug] = divisionResult.insertedIds[i]; });

  const districtDocs = districts.map(({ divisionSlug, ...d }) => ({
    ...d,
    division_id: slugToDivisionId[divisionSlug],
  }));
  const districtResult = await DistrictCollection.insertMany(districtDocs);

  const blogDocs = blogPosts.map((b) => ({ ...b, content: b.excerpt }));
  const blogResult = await BlogCollection.insertMany(blogDocs);

  // Booking fields so seeded plans can actually be booked (no dates = no
  // start-date restriction).
  const planDocs = travelPlans.map((p) => ({
    ...p,
    price: startingPrice(p.cost),
    status: 'open',
    seats_available: SEED_SEATS,
    start_date: '',
    end_date: '',
    description_bn: planDescriptions[p.slug]?.bn.trim() || '',
    description_en: planDescriptions[p.slug]?.en.trim() || '',
  }));
  const planResult = await TravelPlanCollection.insertMany(planDocs);
  const partnerResult = await PartnerCollection.insertMany(partners);
  const membershipResult = await MembershipPlanCollection.insertMany(membershipPlans);

  console.log('Seeded:');
  console.log(`  divisions:        ${Object.keys(divisionResult.insertedIds).length}`);
  console.log(`  districts:        ${Object.keys(districtResult.insertedIds).length}`);
  console.log(`  blog posts:       ${Object.keys(blogResult.insertedIds).length}`);
  console.log(`  travel plans:     ${Object.keys(planResult.insertedIds).length}`);
  console.log(`  partners:         ${Object.keys(partnerResult.insertedIds).length}`);
  console.log(`  membership plans: ${Object.keys(membershipResult.insertedIds).length}`);

  await client.close();
}

seed().catch((err) => {
  console.error('Seeding content failed:', err);
  process.exit(1);
});
