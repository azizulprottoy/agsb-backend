require('dotenv').config();
const { connectDB, client } = require('../config/db');
const planDescriptions = require('./data/planDescriptions');

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

const districts = [
  { divisionSlug: "chittagong", name_bn: "কক্সবাজার", name_en: "Cox's Bazar", slug: "coxs-bazar", tagline: "বিশ্বের দীর্ঘতম সমুদ্র সৈকত", best_time: "Nov–Mar", trip_type: "Beach", budget: "৳3,000–৳8,000", difficulty: 2, family: true, lat: 21.4272, lng: 92.0058, status: "complete", image: "https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=600", attractions: [
    { name: "Inani Beach", type: "nature", desc: "Crystal clear water and coral stones" },
    { name: "Himchari National Park", type: "nature", desc: "Waterfalls and tropical forest trails" },
    { name: "Teknaf", type: "nature", desc: "Southernmost tip of mainland Bangladesh" },
    { name: "Laboni Beach", type: "nature", desc: "Main beach with sunset views and activities" },
    { name: "Burmese Market", type: "market", desc: "Handicrafts, dry fish, and local goods" },
  ], food: ["Shutki (dry fish)", "Mezban beef", "Seafood platter", "Fresh coconut"], transport: "Bus from Dhaka (10-12h) or flight (1h)" },

  { divisionSlug: "sylhet", name_bn: "সিলেট", name_en: "Sylhet", slug: "sylhet", tagline: "চায়ের দেশ, সবুজের রাজ্য", best_time: "Oct–Mar", trip_type: "Nature", budget: "৳2,500–৳6,000", difficulty: 2, family: true, lat: 24.8949, lng: 91.8687, status: "complete", image: "https://images.unsplash.com/photo-1609946860441-a51ffcf22208?w=600", attractions: [
    { name: "Ratargul Swamp Forest", type: "nature", desc: "Only freshwater swamp forest in Bangladesh" },
    { name: "Jaflong", type: "nature", desc: "Stone collection point with mountain backdrop" },
    { name: "Lalakhal", type: "nature", desc: "Emerald green river surrounded by tea gardens" },
    { name: "Hazrat Shah Jalal Shrine", type: "religious", desc: "Historic Sufi shrine in the city center" },
  ], food: ["Sylheti 7-curry", "Shatkora beef", "Pitha", "Tea garden fresh tea"], transport: "Bus from Dhaka (5-6h) or flight (45min)" },

  { divisionSlug: "chittagong", name_bn: "বান্দরবান", name_en: "Bandarban", slug: "bandarban", tagline: "মেঘের রাজ্য, পাহাড়ের স্বর্গ", best_time: "Nov–Mar", trip_type: "Adventure", budget: "৳4,000–৳10,000", difficulty: 4, family: false, lat: 22.1953, lng: 92.2184, status: "complete", image: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600", attractions: [
    { name: "Nilgiri", type: "nature", desc: "Highest accessible hilltop resort at 2,200ft" },
    { name: "Boga Lake", type: "nature", desc: "Sacred crater lake at the mountain peak" },
    { name: "Nafakhum Waterfall", type: "nature", desc: "Largest waterfall by volume in Bangladesh" },
    { name: "Golden Temple", type: "religious", desc: "Largest Theravada Buddhist monastery" },
  ], food: ["Bamboo chicken", "Tribal jhuri", "Hill rice", "Bamboo shoot curry"], transport: "Bus from Chittagong (3h), then local jeep" },

  { divisionSlug: "chittagong", name_bn: "রাঙামাটি", name_en: "Rangamati", slug: "rangamati", tagline: "হ্রদের শহর, শান্তির নীলিমা", best_time: "Oct–Mar", trip_type: "Lake", budget: "৳3,000–৳7,000", difficulty: 3, family: true, lat: 22.6324, lng: 92.1036, status: "good", image: "https://images.unsplash.com/photo-1590579491624-f98f36d4c763?w=600", attractions: [
    { name: "Kaptai Lake", type: "nature", desc: "Largest artificial lake in Bangladesh" },
    { name: "Hanging Bridge", type: "cultural", desc: "Iconic suspension bridge over the lake" },
    { name: "Shuvolong Waterfall", type: "nature", desc: "Seasonal waterfall reachable by boat" },
  ], food: ["Tribal bamboo fish", "Kaptai fish curry", "Hill fruit"], transport: "Bus from Chittagong (3.5h)" },

  { divisionSlug: "khulna", name_bn: "বাগেরহাট", name_en: "Bagerhat", slug: "bagerhat", tagline: "মসজিদের শহর, সুন্দরবনের দুয়ার", best_time: "Nov–Feb", trip_type: "Heritage", budget: "৳2,000–৳5,000", difficulty: 2, family: true, lat: 22.6512, lng: 89.7851, status: "complete", image: "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=600", attractions: [
    { name: "Sixty Dome Mosque", type: "historical", desc: "UNESCO World Heritage Site from 15th century" },
    { name: "Sundarbans Entry Point", type: "nature", desc: "Gateway to the world's largest mangrove" },
    { name: "Khan Jahan Ali Tomb", type: "historical", desc: "Mausoleum of the city's founder saint" },
  ], food: ["Sundarban honey", "Golda chingri", "Bagda prawn"], transport: "Bus from Dhaka (7h) or Khulna (2h)" },

  { divisionSlug: "sylhet", name_bn: "মৌলভীবাজার", name_en: "Moulvibazar", slug: "moulvibazar", tagline: "চা বাগান আর হাওরের মিলনভূমি", best_time: "Oct–Mar", trip_type: "Nature", budget: "৳2,000–৳5,000", difficulty: 2, family: true, lat: 24.4829, lng: 91.7774, status: "good", image: "https://images.unsplash.com/photo-1566296524505-3d731d642fbe?w=600", attractions: [
    { name: "Lawachara National Park", type: "nature", desc: "Rainforest with hoolock gibbons" },
    { name: "Madhabpur Lake", type: "nature", desc: "Scenic lake amid tea gardens" },
    { name: "Srimangal Tea Gardens", type: "nature", desc: "Tea capital of Bangladesh" },
  ], food: ["7-layer tea", "Lemon tea", "Manipuri cuisine", "Paan"], transport: "Train from Dhaka to Srimangal (5h)" },

  { divisionSlug: "rajshahi", name_bn: "রাজশাহী", name_en: "Rajshahi", slug: "rajshahi", tagline: "রেশম ও আমের শহর", best_time: "Year-round", trip_type: "Heritage", budget: "৳1,500–৳4,000", difficulty: 1, family: true, lat: 24.3745, lng: 88.6042, status: "good", image: "https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=600", attractions: [
    { name: "Varendra Research Museum", type: "historical", desc: "Oldest museum in Bangladesh" },
    { name: "Puthia Temple Complex", type: "religious", desc: "Cluster of Hindu temples with terracotta art" },
    { name: "Padma Riverfront", type: "nature", desc: "Beautiful sunset views over the Padma" },
  ], food: ["Rajshahi mango", "Kalai roti", "Chapainawabganj mango"], transport: "Train from Dhaka (5-6h) or flight (45min)" },

  { divisionSlug: "rangpur", name_bn: "দিনাজপুর", name_en: "Dinajpur", slug: "dinajpur", tagline: "লিচু আর প্রত্নতত্ত্বের শহর", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,500–৳3,500", difficulty: 1, family: true, lat: 25.6279, lng: 88.6332, status: "good", image: "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=600", attractions: [
    { name: "Kantajew Temple", type: "religious", desc: "18th-century terracotta Hindu temple" },
    { name: "Ramsagar National Park", type: "nature", desc: "Largest man-made lake in Bangladesh" },
    { name: "Nayabad Mosque", type: "historical", desc: "Beautiful Mughal-era mosque" },
  ], food: ["Dinajpur litchi", "Chira & doi", "Pitha"], transport: "Train from Dhaka (8-10h)" },

  { divisionSlug: "dhaka", name_bn: "টাঙ্গাইল", name_en: "Tangail", slug: "tangail", tagline: "তাঁত শিল্প আর ইতিহাসের জনপদ", best_time: "Year-round", trip_type: "Cultural", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 24.2513, lng: 89.9168, status: "skeleton", image: "https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=600", attractions: [
    { name: "Atia Mosque", type: "historical", desc: "16th-century Mughal mosque" },
    { name: "Madhupur Forest", type: "nature", desc: "Sal forest with Garo tribal villages" },
  ], food: ["Tangail sari district food", "Cham cham sweets"], transport: "Bus from Dhaka (3h)" },

  { divisionSlug: "barishal", name_bn: "পটুয়াখালী", name_en: "Patuakhali", slug: "patuakhali", tagline: "কুয়াকাটা — সাগরকন্যা", best_time: "Nov–Mar", trip_type: "Beach", budget: "৳2,000–৳5,000", difficulty: 2, family: true, lat: 22.3596, lng: 90.3295, status: "good", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600", attractions: [
    { name: "Kuakata Beach", type: "nature", desc: "Only beach where you see both sunrise and sunset" },
    { name: "Fatrar Char", type: "nature", desc: "Mangrove island with red crabs" },
    { name: "Buddhist Temple", type: "religious", desc: "Rakhine community temple near the beach" },
  ], food: ["Shutki bhorta", "Sea fish curry", "Coconut sweets"], transport: "Bus from Dhaka (8-10h) or Barishal launch (4h)" },

  { divisionSlug: "chittagong", name_bn: "খাগড়াছড়ি", name_en: "Khagrachari", slug: "khagrachari", tagline: "পাহাড়ের কোলে আদিবাসী জনপদ", best_time: "Nov–Feb", trip_type: "Adventure", budget: "৳3,000–৳6,000", difficulty: 3, family: false, lat: 23.1193, lng: 91.9847, status: "skeleton", image: "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=600", attractions: [
    { name: "Alutila Cave", type: "nature", desc: "Mysterious dark cave with underground stream" },
    { name: "Richhang Waterfall", type: "nature", desc: "Multi-step waterfall in the hills" },
  ], food: ["Tribal bamboo chicken", "Hill vegetables"], transport: "Bus from Chittagong (4h)" },

  { divisionSlug: "dhaka", name_bn: "মুন্সীগঞ্জ", name_en: "Munshiganj", slug: "munshiganj", tagline: "বিক্রমপুরের ঐতিহ্য", best_time: "Year-round", trip_type: "Heritage", budget: "৳800–৳2,000", difficulty: 1, family: true, lat: 23.4981, lng: 90.4127, status: "skeleton", image: "https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=600", attractions: [
    { name: "Sonargaon", type: "historical", desc: "Ancient capital with Panam City ruins" },
    { name: "Idrakpur Fort", type: "historical", desc: "Mughal-era river fort" },
  ], food: ["Hilsa fish", "Munshiganj jackfruit"], transport: "Bus from Dhaka (1.5h)" },

  { divisionSlug: "khulna", name_bn: "সাতক্ষীরা", name_en: "Satkhira", slug: "satkhira", tagline: "সুন্দরবনের পশ্চিম দুয়ার", best_time: "Nov–Feb", trip_type: "Nature", budget: "৳2,000–৳4,000", difficulty: 2, family: true, lat: 22.7186, lng: 89.0699, status: "skeleton", image: "https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=600", attractions: [
    { name: "Sundarbans West", type: "nature", desc: "Western route to the mangrove forest" },
    { name: "Shyamnagar", type: "nature", desc: "Entry point for Sundarbans tours" },
  ], food: ["Bagda prawn", "Sundarbans honey", "Mola fish"], transport: "Bus from Khulna (3h)" },

  { divisionSlug: "sylhet", name_bn: "সুনামগঞ্জ", name_en: "Sunamganj", slug: "sunamganj", tagline: "হাওর আর বাউলের দেশ", best_time: "Jun–Sep (monsoon)", trip_type: "Haor", budget: "৳2,000–৳5,000", difficulty: 3, family: true, lat: 25.0715, lng: 91.3953, status: "good", image: "https://images.unsplash.com/photo-1609946860441-a51ffcf22208?w=600", attractions: [
    { name: "Tanguar Haor", type: "nature", desc: "Ramsar wetland with migratory birds" },
    { name: "Shimul Bagan", type: "nature", desc: "Red silk cotton tree garden" },
    { name: "Hasong Raja Museum", type: "cultural", desc: "Museum of the legendary folk poet" },
  ], food: ["Haor fish varieties", "Shunamgonj sweets"], transport: "Bus from Sylhet (2.5h)" },

  { divisionSlug: "rajshahi", name_bn: "চাঁপাইনবাবগঞ্জ", name_en: "Chapainawabganj", slug: "chapainawabganj", tagline: "আমের রাজধানী", best_time: "May–Jul (mango), Oct–Feb", trip_type: "Cultural", budget: "৳1,500–৳3,500", difficulty: 1, family: true, lat: 24.5965, lng: 88.2775, status: "skeleton", image: "https://images.unsplash.com/photo-1590077428593-a55bb07c4665?w=600", attractions: [
    { name: "Sona Mosque", type: "historical", desc: "Golden mosque from the sultanate era" },
    { name: "Mango Orchards", type: "nature", desc: "Vast mango gardens in summer" },
  ], food: ["Chapai mango (Himsagar, Langra, Fazli)", "Kalai roti"], transport: "Train from Rajshahi (2h)" },

  { divisionSlug: "mymensingh", name_bn: "নেত্রকোনা", name_en: "Netrokona", slug: "netrokona", tagline: "মেঘালয়ের পাদদেশে", best_time: "Oct–Mar", trip_type: "Nature", budget: "৳1,500–৳3,500", difficulty: 2, family: true, lat: 24.8703, lng: 90.7286, status: "skeleton", image: "https://images.unsplash.com/photo-1590579491624-f98f36d4c763?w=600", attractions: [
    { name: "Birishiri", type: "nature", desc: "White clay hills at the India border" },
    { name: "Durgapur", type: "cultural", desc: "Garo and Hajong tribal villages" },
  ], food: ["Hill fruits", "Local rice varieties"], transport: "Bus from Mymensingh (2.5h)" },
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

async function seed() {
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

  const planDocs = travelPlans.map((p) => ({
    ...p,
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
