// All 64 districts of Bangladesh, shared by seedContent.js (fresh setup) and
// seedDistricts.js (adds missing ones to an existing database).
// divisionSlug is resolved to the division's _id when seeding; "chittagong"
// also matches a division stored as "chattogram". District slugs match the
// public site's map (agsb/src/data/allDistricts.js), including the older
// "chittagong" and "comilla" slugs that users' saved check-ins rely on.
// Districts without a photo have image: ''; upload one from the admin panel.
module.exports = [
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

  // ── Dhaka division ──
  { divisionSlug: "dhaka", name_bn: "ঢাকা", name_en: "Dhaka", slug: "dhaka", tagline: "মসজিদ আর রিকশার নগরী", best_time: "Oct–Mar", trip_type: "City", budget: "৳2,000–৳6,000", difficulty: 1, family: true, lat: 23.8103, lng: 90.4125, status: "good", image: "", attractions: [
    { name: "Lalbagh Fort", type: "historical", desc: "Unfinished 17th-century Mughal fort in Old Dhaka" },
    { name: "Ahsan Manzil", type: "historical", desc: "The Pink Palace of the Dhaka Nawabs, now a museum" },
    { name: "Star Mosque", type: "religious", desc: "Mosque covered in star-patterned mosaic tiles" },
    { name: "Sadarghat", type: "cultural", desc: "Busy river port on the Buriganga" },
  ], food: ["Old Dhaka kacchi biryani", "Bakarkhani", "Borhani"], transport: "The capital: Hazrat Shahjalal International Airport, Kamalapur railway station, and bus terminals at Gabtoli, Sayedabad and Mohakhali." },
  { divisionSlug: "dhaka", name_bn: "ফরিদপুর", name_en: "Faridpur", slug: "faridpur", tagline: "পল্লীকবি জসীমউদ্দীনের জন্মভূমি", best_time: "Oct–Mar", trip_type: "Cultural", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 23.607, lng: 89.8429, status: "good", image: "", attractions: [
    { name: "Jasimuddin's House, Ambikapur", type: "cultural", desc: "Home and museum of the Palli Kobi" },
    { name: "Mathurapur Deul", type: "historical", desc: "Tall 17th-century terracotta temple tower in Madhukhali" },
    { name: "Padma riverbank", type: "nature", desc: "Wide river views and char lands" },
  ], food: ["Padma hilsa", "Khejur gur (date molasses)"], transport: "About 3 hours by bus from Dhaka over the Padma Bridge; trains also run via the Padma rail link." },
  { divisionSlug: "dhaka", name_bn: "গাজীপুর", name_en: "Gazipur", slug: "gazipur", tagline: "শালবন আর সাফারি পার্কের জেলা", best_time: "Year-round", trip_type: "Forest", budget: "৳1,000–৳4,000", difficulty: 1, family: true, lat: 23.9999, lng: 90.4203, status: "good", image: "", attractions: [
    { name: "Bhawal National Park", type: "nature", desc: "Sal forest with picnic spots near Dhaka" },
    { name: "Bangabandhu Sheikh Mujib Safari Park", type: "nature", desc: "Large safari park in Sreepur" },
    { name: "Nuhash Polli", type: "cultural", desc: "Writer Humayun Ahmed's garden estate" },
  ], food: ["Jackfruit", "Pitha"], transport: "1–2 hours by road from Dhaka on the Dhaka–Mymensingh highway, or commuter trains to Joydebpur." },
  { divisionSlug: "dhaka", name_bn: "গোপালগঞ্জ", name_en: "Gopalganj", slug: "gopalganj", tagline: "মধুমতির তীরে", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 23.005, lng: 89.8266, status: "good", image: "", attractions: [
    { name: "Bangabandhu Mausoleum, Tungipara", type: "historical", desc: "Tomb complex of Sheikh Mujibur Rahman" },
    { name: "Orakandi Thakurbari", type: "religious", desc: "Pilgrimage centre of the Matua community" },
    { name: "Madhumati River", type: "nature", desc: "Boat rides along the Madhumati" },
  ], food: ["Madhumati river fish", "Khejur gur sweets"], transport: "About 3 hours by bus from Dhaka over the Padma Bridge." },
  { divisionSlug: "dhaka", name_bn: "কিশোরগঞ্জ", name_en: "Kishoreganj", slug: "kishoreganj", tagline: "হাওরের বুকে অল-ওয়েদার সড়ক", best_time: "Jun–Oct (monsoon)", trip_type: "Haor", budget: "৳1,500–৳4,000", difficulty: 2, family: true, lat: 24.4449, lng: 90.7766, status: "good", image: "", attractions: [
    { name: "Nikli Haor", type: "nature", desc: "Vast seasonal wetland, best in the monsoon" },
    { name: "Itna–Mithamoin–Austagram road", type: "nature", desc: "All-weather road running through the haor" },
    { name: "Sholakia Eidgah", type: "religious", desc: "Home of the country's largest Eid congregation" },
    { name: "Jangalbari Fort", type: "historical", desc: "Stronghold of Isa Khan" },
  ], food: ["Haor fish", "Pitha"], transport: "Intercity trains (Egarosindhur, Kishoreganj Express) from Dhaka in about 4 hours, or buses from Mohakhali." },
  { divisionSlug: "dhaka", name_bn: "মাদারীপুর", name_en: "Madaripur", slug: "madaripur", tagline: "আড়িয়াল খাঁর তীরে খেজুর গুড়ের দেশ", best_time: "Nov–Feb", trip_type: "River", budget: "৳1,000–৳2,500", difficulty: 1, family: true, lat: 23.1641, lng: 90.1897, status: "good", image: "", attractions: [
    { name: "Shakuni Lake", type: "nature", desc: "Lake in the heart of town" },
    { name: "Charmuguria Eco Park", type: "nature", desc: "Riverside park known for its monkeys" },
    { name: "Awliapur Neelkuthi", type: "historical", desc: "Ruins of a British-era indigo house" },
  ], food: ["Khejur gur (date molasses)", "Hilsa"], transport: "About 2 hours by bus from Dhaka over the Padma Bridge." },
  { divisionSlug: "dhaka", name_bn: "মানিকগঞ্জ", name_en: "Manikganj", slug: "manikganj", tagline: "পদ্মা-যমুনার মোহনায় জমিদারবাড়ির জেলা", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳800–৳2,500", difficulty: 1, family: true, lat: 23.8644, lng: 90.0047, status: "good", image: "", attractions: [
    { name: "Baliati Zamindar Bari", type: "historical", desc: "Grand 19th-century palace complex" },
    { name: "Teota Zamindar Bari", type: "historical", desc: "Estate linked to Nazrul's wife Pramila" },
    { name: "Aricha Ghat", type: "nature", desc: "Jamuna riverbank and ferry ghat" },
  ], food: ["Jhitka hazari gur", "River fish"], transport: "1.5–2 hours by bus from Gabtoli, Dhaka on the Dhaka–Aricha highway." },
  { divisionSlug: "dhaka", name_bn: "নারায়ণগঞ্জ", name_en: "Narayanganj", slug: "narayanganj", tagline: "সোনারগাঁওয়ের প্রাচীন রাজধানী", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳800–৳2,000", difficulty: 1, family: true, lat: 23.6238, lng: 90.499, status: "good", image: "", attractions: [
    { name: "Panam City, Sonargaon", type: "historical", desc: "Street of 19th-century merchant houses" },
    { name: "Folk Art and Crafts Museum", type: "cultural", desc: "Bangladesh Lok O Karushilpa Foundation in Sonargaon" },
    { name: "Hajiganj Fort", type: "historical", desc: "Mughal river fort on the Shitalakshya" },
    { name: "Kadam Rasul Dargah", type: "religious", desc: "Shrine across the Shitalakshya" },
  ], food: ["Pitha", "Shitalakshya river fish"], transport: "45–60 minutes from Dhaka by road, or the Dhaka–Narayanganj commuter train." },
  { divisionSlug: "dhaka", name_bn: "নরসিংদী", name_en: "Narsingdi", slug: "narsingdi", tagline: "উয়ারী-বটেশ্বরের প্রাচীন জনপদ", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳800–৳2,000", difficulty: 1, family: true, lat: 23.9322, lng: 90.7151, status: "good", image: "", attractions: [
    { name: "Wari-Bateshwar", type: "historical", desc: "About 2,500-year-old fortified settlement ruins" },
    { name: "Meghna riverside", type: "nature", desc: "Sunset over the Meghna" },
    { name: "Drim Holiday Park", type: "nature", desc: "Family amusement park" },
  ], food: ["Sagor kola (bananas)", "Lotkon"], transport: "About 1.5 hours by road from Dhaka, or by train on the Dhaka–Sylhet line." },
  { divisionSlug: "dhaka", name_bn: "রাজবাড়ী", name_en: "Rajbari", slug: "rajbari", tagline: "পদ্মার কোলে", best_time: "Oct–Mar", trip_type: "River", budget: "৳800–৳2,000", difficulty: 1, family: true, lat: 23.7574, lng: 89.6445, status: "good", image: "", attractions: [
    { name: "Daulatdia Ghat", type: "nature", desc: "Historic Padma ferry crossing" },
    { name: "Godar Bazar", type: "nature", desc: "Padma riverbank promenade" },
    { name: "Nalia Jor Bangla Temple", type: "historical", desc: "Twin-hut terracotta temple in Baliakandi" },
  ], food: ["Padma hilsa", "Khejur gur"], transport: "About 3 hours by bus via the Paturia–Daulatdia ferry, or by train from Dhaka." },
  { divisionSlug: "dhaka", name_bn: "শরীয়তপুর", name_en: "Shariatpur", slug: "shariatpur", tagline: "পদ্মা সেতুর দক্ষিণ প্রান্ত", best_time: "Oct–Mar", trip_type: "River", budget: "৳800–৳2,000", difficulty: 1, family: true, lat: 23.2423, lng: 90.4348, status: "good", image: "", attractions: [
    { name: "Padma Bridge view, Jajira", type: "nature", desc: "The bridge from its southern end" },
    { name: "Dhanuka Manasa Bari", type: "historical", desc: "Centuries-old Hindu manor and temple" },
    { name: "Padma char lands", type: "nature", desc: "Boat trips to the river islands" },
  ], food: ["Padma hilsa", "Doi (yoghurt)"], transport: "1.5–2 hours by road from Dhaka over the Padma Bridge." },

  // ── Chattogram division ──
  { divisionSlug: "chittagong", name_bn: "ব্রাহ্মণবাড়িয়া", name_en: "Brahmanbaria", slug: "brahmanbaria", tagline: "সুরের শহর", best_time: "Oct–Mar", trip_type: "Cultural", budget: "৳1,000–৳2,500", difficulty: 1, family: true, lat: 23.9571, lng: 91.1119, status: "good", image: "", attractions: [
    { name: "Ustad Alauddin Khan Sangeetangan", type: "cultural", desc: "Memorial to the great musician" },
    { name: "Kalbhairab Temple", type: "religious", desc: "Temple with a tall Bhairab idol" },
    { name: "Akhaura border", type: "cultural", desc: "Border crossing towards Agartala" },
  ], food: ["Chhanamukhi", "Rosmalai"], transport: "About 2.5–3 hours by intercity train or bus from Dhaka." },
  { divisionSlug: "chittagong", name_bn: "চাঁদপুর", name_en: "Chandpur", slug: "chandpur", tagline: "ইলিশের বাড়ি", best_time: "Jul–Oct (hilsa season)", trip_type: "River", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 23.2333, lng: 90.6713, status: "good", image: "", attractions: [
    { name: "Boro Station Molhead", type: "nature", desc: "Confluence of the Padma, Meghna and Dakatia" },
    { name: "Ilish Chattar", type: "cultural", desc: "Hilsa monument in town" },
    { name: "Hajiganj Boro Mosque", type: "religious", desc: "One of the country's large historic mosques" },
  ], food: ["Hilsa", "Fried hilsa at Boro Station"], transport: "Launch from Sadarghat (3–4 hours) or bus from Dhaka." },
  { divisionSlug: "chittagong", name_bn: "চট্টগ্রাম", name_en: "Chattogram", slug: "chittagong", tagline: "বন্দর নগরী", best_time: "Oct–Mar", trip_type: "City", budget: "৳2,500–৳7,000", difficulty: 2, family: true, lat: 22.3569, lng: 91.7832, status: "good", image: "", attractions: [
    { name: "Patenga Beach", type: "nature", desc: "Sea beach near the Karnaphuli mouth" },
    { name: "Foy's Lake", type: "nature", desc: "Hill-ringed lake with an amusement park" },
    { name: "Shah Amanat Dargah", type: "religious", desc: "Shrine of the city's patron saint" },
    { name: "Ethnological Museum", type: "cultural", desc: "Life of Bangladesh's ethnic communities" },
  ], food: ["Mezban beef", "Kala bhuna", "Shutki"], transport: "Trains (Subarna, Sonar Bangla; 5–6 hours) and buses from Dhaka, or a 45-minute flight to Shah Amanat Airport." },
  { divisionSlug: "chittagong", name_bn: "কুমিল্লা", name_en: "Cumilla", slug: "comilla", tagline: "শালবন বিহার আর রসমালাইয়ের শহর", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 23.4607, lng: 91.1809, status: "good", image: "", attractions: [
    { name: "Shalban Vihara", type: "historical", desc: "8th-century Buddhist monastery at Mainamati" },
    { name: "Mainamati War Cemetery", type: "historical", desc: "Commonwealth WWII cemetery" },
    { name: "Dharmasagar", type: "nature", desc: "Large 18th-century reservoir in town" },
  ], food: ["Rosmalai", "Peda"], transport: "About 2 hours by bus on the Dhaka–Chattogram highway, or by train." },
  { divisionSlug: "chittagong", name_bn: "ফেনী", name_en: "Feni", slug: "feni", tagline: "মুহুরী নদীর দেশ", best_time: "Oct–Mar", trip_type: "Nature", budget: "৳1,000–৳2,500", difficulty: 1, family: true, lat: 23.0159, lng: 91.3976, status: "good", image: "", attractions: [
    { name: "Muhuri Project", type: "nature", desc: "Irrigation dam, lake and bird-watching" },
    { name: "Bijoy Singh Dighi", type: "nature", desc: "Old reservoir on the highway" },
    { name: "Chandgazi Bhuiyan Mosque", type: "religious", desc: "Mughal-era mosque" },
  ], food: ["Muhuri river fish", "Pitha"], transport: "3–4 hours by bus or train from Dhaka on the Chattogram route." },
  { divisionSlug: "chittagong", name_bn: "লক্ষ্মীপুর", name_en: "Lakshmipur", slug: "lakshmipur", tagline: "নারকেল আর সুপারির দেশ", best_time: "Oct–Mar", trip_type: "River", budget: "৳1,000–৳2,500", difficulty: 1, family: true, lat: 22.9447, lng: 90.8282, status: "good", image: "", attractions: [
    { name: "Meghna riverside, Kamalnagar", type: "nature", desc: "Wide Meghna estuary views" },
    { name: "Khoa Sagar Dighi", type: "nature", desc: "Historic large pond" },
    { name: "Dalal Bazar Zamindar Bari", type: "historical", desc: "Ruins of a zamindar palace" },
  ], food: ["Coconut", "Hilsa"], transport: "4–5 hours by bus from Dhaka." },
  { divisionSlug: "chittagong", name_bn: "নোয়াখালী", name_en: "Noakhali", slug: "noakhali", tagline: "নিঝুম দ্বীপের প্রবেশদ্বার", best_time: "Nov–Mar", trip_type: "Island", budget: "৳2,000–৳6,000", difficulty: 3, family: true, lat: 22.8696, lng: 91.0995, status: "good", image: "", attractions: [
    { name: "Nijhum Dwip", type: "nature", desc: "Island national park with spotted deer" },
    { name: "Gandhi Ashram", type: "historical", desc: "Where Gandhi stayed in 1946" },
    { name: "Bajra Shahi Mosque", type: "religious", desc: "18th-century Mughal mosque" },
  ], food: ["Buffalo-milk yoghurt", "Hilsa"], transport: "Bus or train (Upakul Express) from Dhaka to Maijdee; Nijhum Dwip via Hatiya by launch or speedboat." },

  // ── Khulna division ──
  { divisionSlug: "khulna", name_bn: "চুয়াডাঙ্গা", name_en: "Chuadanga", slug: "chuadanga", tagline: "সীমান্তের সবুজ জনপদ", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,000–৳2,500", difficulty: 1, family: true, lat: 23.6401, lng: 88.8418, status: "good", image: "", attractions: [
    { name: "Carew & Co, Darshana", type: "historical", desc: "Sugar mill and distillery from the British era" },
    { name: "Gholdari Mosque", type: "historical", desc: "Old mosque in Alamdanga" },
    { name: "Mathabhanga River", type: "nature", desc: "Quiet riverside villages" },
  ], food: ["Khejur gur", "Pitha"], transport: "5–6 hours by train or bus from Dhaka." },
  { divisionSlug: "khulna", name_bn: "যশোর", name_en: "Jashore", slug: "jashore", tagline: "খেজুর গুড় আর ফুলের রাজ্য", best_time: "Nov–Feb", trip_type: "Cultural", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 23.1664, lng: 89.2081, status: "good", image: "", attractions: [
    { name: "Gadkhali flower fields", type: "nature", desc: "The country's flower-growing capital" },
    { name: "Madhusudan's house, Sagardari", type: "cultural", desc: "Birthplace of poet Michael Madhusudan Dutt" },
    { name: "Benapole border", type: "cultural", desc: "Main land crossing to India" },
  ], food: ["Khejur gur (date molasses)", "Jamtola rosogolla"], transport: "Flight to Jashore Airport, or about 4 hours by bus or train from Dhaka over the Padma Bridge." },
  { divisionSlug: "khulna", name_bn: "ঝিনাইদহ", name_en: "Jhenaidah", slug: "jhenaidah", tagline: "বারোবাজারের প্রাচীন মসজিদের জনপদ", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,000–৳2,500", difficulty: 1, family: true, lat: 23.545, lng: 89.1726, status: "good", image: "", attractions: [
    { name: "Barobazar mosques", type: "historical", desc: "Sultanate-era mosques including Galakata" },
    { name: "Shailkupa Shahi Mosque", type: "historical", desc: "Multi-domed old mosque" },
    { name: "Naldanga Temple complex", type: "religious", desc: "Group of zamindari-era temples" },
  ], food: ["Pitha", "Khejur gur"], transport: "4–5 hours by bus from Dhaka." },
  { divisionSlug: "khulna", name_bn: "খুলনা", name_en: "Khulna", slug: "khulna", tagline: "সুন্দরবনের প্রবেশদ্বার", best_time: "Nov–Feb", trip_type: "Nature", budget: "৳2,000–৳6,000", difficulty: 2, family: true, lat: 22.8456, lng: 89.5403, status: "good", image: "", attractions: [
    { name: "Sundarbans boat trips", type: "nature", desc: "Multi-day mangrove tours start from Khulna" },
    { name: "Rupsha riverside", type: "nature", desc: "River views by the Rupsha Bridge" },
    { name: "Dakshindihi", type: "cultural", desc: "Ancestral home of Tagore's wife Mrinalini Devi" },
  ], food: ["Chui jhal", "Golda chingri (prawn)"], transport: "Trains (Sundarban, Chitra Express) and buses from Dhaka over the Padma Bridge, 4–6 hours." },
  { divisionSlug: "khulna", name_bn: "কুষ্টিয়া", name_en: "Kushtia", slug: "kushtia", tagline: "লালনের তীর্থভূমি", best_time: "Oct–Mar", trip_type: "Cultural", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 23.9013, lng: 89.1205, status: "good", image: "", attractions: [
    { name: "Lalon Shah Mazar, Chheuria", type: "cultural", desc: "Shrine of the Baul saint Lalon" },
    { name: "Shilaidaha Kuthibari", type: "historical", desc: "Tagore's estate house on the Padma" },
    { name: "Hardinge Bridge view", type: "historical", desc: "1915 rail bridge over the Padma" },
  ], food: ["Tilkhaja", "Kulfi malai"], transport: "About 5 hours by bus or train from Dhaka." },
  { divisionSlug: "khulna", name_bn: "মাগুরা", name_en: "Magura", slug: "magura", tagline: "নবগঙ্গার তীরে", best_time: "Oct–Mar", trip_type: "River", budget: "৳800–৳2,000", difficulty: 1, family: true, lat: 23.4855, lng: 89.4198, status: "good", image: "", attractions: [
    { name: "Raja Sitaram Roy's palace, Mohammadpur", type: "historical", desc: "Ruins of an 18th-century raja's capital" },
    { name: "Nabaganga River", type: "nature", desc: "Riverside walks through town" },
  ], food: ["Rosogolla", "Khejur gur"], transport: "About 4 hours by bus from Dhaka over the Padma Bridge." },
  { divisionSlug: "khulna", name_bn: "মেহেরপুর", name_en: "Meherpur", slug: "meherpur", tagline: "মুজিবনগর — স্বাধীনতার সূতিকাগার", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,000–৳2,500", difficulty: 1, family: true, lat: 23.7622, lng: 88.6318, status: "good", image: "", attractions: [
    { name: "Mujibnagar Memorial", type: "historical", desc: "Where the 1971 provisional government took oath" },
    { name: "Amjhupi Neelkuthi", type: "historical", desc: "British-era indigo planter's house" },
  ], food: ["Pitha", "Khejur gur"], transport: "6–7 hours by bus from Dhaka." },
  { divisionSlug: "khulna", name_bn: "নড়াইল", name_en: "Narail", slug: "narail", tagline: "শিল্পী এস এম সুলতানের শহর", best_time: "Oct–Mar", trip_type: "Cultural", budget: "৳1,000–৳2,500", difficulty: 1, family: true, lat: 23.1725, lng: 89.5127, status: "good", image: "", attractions: [
    { name: "S M Sultan Memorial Museum", type: "cultural", desc: "Home and gallery of the painter S M Sultan" },
    { name: "Chitra River", type: "nature", desc: "Boat rides on the Chitra" },
    { name: "Narail Zamindar Bari", type: "historical", desc: "Remains of the local zamindar estate" },
  ], food: ["Chitra river fish", "Pitha"], transport: "About 3 hours by bus or train from Dhaka over the Padma Bridge." },

  // ── Rajshahi division ──
  { divisionSlug: "rajshahi", name_bn: "বগুড়া", name_en: "Bogura", slug: "bogura", tagline: "মহাস্থানগড় আর দইয়ের শহর", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,500–৳3,500", difficulty: 1, family: true, lat: 24.8465, lng: 89.3773, status: "good", image: "", attractions: [
    { name: "Mahasthangarh", type: "historical", desc: "Ruins of ancient Pundranagara, one of the oldest cities in Bengal" },
    { name: "Behular Basor Ghor", type: "historical", desc: "Gokul Medh, a terraced ancient mound" },
    { name: "Mahasthan Museum", type: "cultural", desc: "Finds from the Mahasthangarh excavations" },
  ], food: ["Bogurar doi (yoghurt)", "Kotkoti"], transport: "About 4 hours by bus from Dhaka over the Jamuna Bridge, or by train." },
  { divisionSlug: "rajshahi", name_bn: "জয়পুরহাট", name_en: "Joypurhat", slug: "joypurhat", tagline: "প্রত্নতত্ত্ব আর কৃষির জনপদ", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,000–৳2,500", difficulty: 1, family: true, lat: 25.0968, lng: 89.0227, status: "good", image: "", attractions: [
    { name: "Lakma Zamindar Bari", type: "historical", desc: "Ruined zamindar palace near the border" },
    { name: "Nandail Dighi", type: "nature", desc: "Large old reservoir" },
  ], food: ["Pitha", "Doi (yoghurt)"], transport: "About 5 hours by train or bus from Dhaka." },
  { divisionSlug: "rajshahi", name_bn: "নওগাঁ", name_en: "Naogaon", slug: "naogaon", tagline: "পাহাড়পুর বৌদ্ধ বিহারের দেশ", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,500–৳3,500", difficulty: 2, family: true, lat: 24.7936, lng: 88.9318, status: "good", image: "", attractions: [
    { name: "Paharpur Buddhist Vihara", type: "historical", desc: "UNESCO World Heritage Somapura Mahavihara" },
    { name: "Kusumba Mosque", type: "historical", desc: "16th-century black-stone mosque" },
    { name: "Dibar Dighi", type: "historical", desc: "Lake with the Kaivarta victory pillar" },
    { name: "Patisar Kuthibari", type: "cultural", desc: "Tagore's estate office" },
  ], food: ["Mango", "Paira sondesh"], transport: "5–6 hours by bus from Dhaka." },
  { divisionSlug: "rajshahi", name_bn: "নাটোর", name_en: "Natore", slug: "natore", tagline: "বনলতা সেনের নাটোর", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 24.4206, lng: 89.0003, status: "good", image: "", attractions: [
    { name: "Natore Rajbari", type: "historical", desc: "Palace of Rani Bhabani's dynasty" },
    { name: "Uttara Gonobhaban", type: "historical", desc: "Dighapatia Palace, now a government residence" },
    { name: "Chalan Beel", type: "nature", desc: "One of the largest wetlands in the country" },
  ], food: ["Kachagolla"], transport: "About 4 hours by bus or train from Dhaka." },
  { divisionSlug: "rajshahi", name_bn: "পাবনা", name_en: "Pabna", slug: "pabna", tagline: "পদ্মাপাড়ের ঐতিহ্যের শহর", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 24.0064, lng: 89.2372, status: "good", image: "", attractions: [
    { name: "Hardinge Bridge, Paksey", type: "historical", desc: "1915 rail bridge over the Padma" },
    { name: "Jor Bangla Temple", type: "historical", desc: "18th-century terracotta temple" },
    { name: "Suchitra Sen's ancestral home", type: "cultural", desc: "Childhood home of the film star" },
  ], food: ["Pabna ghee", "Rosogolla"], transport: "About 4 hours by bus from Dhaka over the Jamuna Bridge." },
  { divisionSlug: "rajshahi", name_bn: "সিরাজগঞ্জ", name_en: "Sirajganj", slug: "sirajganj", tagline: "যমুনার তীরে তাঁতের জনপদ", best_time: "Oct–Mar", trip_type: "River", budget: "৳1,000–৳2,500", difficulty: 1, family: true, lat: 24.4534, lng: 89.7007, status: "good", image: "", attractions: [
    { name: "Bangabandhu Jamuna Bridge", type: "nature", desc: "Long road and rail bridge over the Jamuna" },
    { name: "Rabindra Kachharibari, Shahzadpur", type: "cultural", desc: "Tagore's estate office" },
    { name: "Navaratna Temple, Hatikumrul", type: "historical", desc: "Nine-spired 18th-century temple" },
  ], food: ["Jamuna river fish", "Doi (yoghurt)"], transport: "2.5–3 hours by bus from Dhaka." },

  // ── Rangpur division ──
  { divisionSlug: "rangpur", name_bn: "গাইবান্ধা", name_en: "Gaibandha", slug: "gaibandha", tagline: "যমুনা-ব্রহ্মপুত্রের চরাঞ্চল", best_time: "Oct–Mar", trip_type: "River", budget: "৳1,000–৳2,500", difficulty: 2, family: true, lat: 25.3297, lng: 89.543, status: "good", image: "", attractions: [
    { name: "Balasi Ghat", type: "nature", desc: "Boat trips to the river chars" },
    { name: "Bamondanga Zamindar Bari", type: "historical", desc: "Ruins of a zamindar palace" },
  ], food: ["Rosmanjari", "River fish"], transport: "About 6 hours by bus or train from Dhaka." },
  { divisionSlug: "rangpur", name_bn: "কুড়িগ্রাম", name_en: "Kurigram", slug: "kurigram", tagline: "ব্রহ্মপুত্র-তিস্তা-ধরলার দেশ", best_time: "Oct–Mar", trip_type: "River", budget: "৳1,000–৳2,500", difficulty: 2, family: true, lat: 25.8072, lng: 89.6295, status: "good", image: "", attractions: [
    { name: "Chilmari port", type: "nature", desc: "Old river port on the Brahmaputra" },
    { name: "Dharla riverside", type: "nature", desc: "Sandy banks of the Dharla" },
    { name: "Chandamari Mosque", type: "historical", desc: "Mughal-style old mosque" },
  ], food: ["River fish", "Pitha"], transport: "7–8 hours by bus or train from Dhaka." },
  { divisionSlug: "rangpur", name_bn: "লালমনিরহাট", name_en: "Lalmonirhat", slug: "lalmonirhat", tagline: "তিস্তা ব্যারাজ আর তিনবিঘা করিডোর", best_time: "Oct–Mar", trip_type: "River", budget: "৳1,000–৳3,000", difficulty: 2, family: true, lat: 25.9923, lng: 89.2847, status: "good", image: "", attractions: [
    { name: "Teesta Barrage, Dalia", type: "nature", desc: "Barrage and wide Teesta views" },
    { name: "Tin Bigha Corridor", type: "cultural", desc: "Corridor linking the Dahagram enclave" },
    { name: "Burimari border", type: "cultural", desc: "Land port towards India and Bhutan" },
  ], food: ["Teesta river fish", "Pitha"], transport: "Trains (Lalmoni Express, about 9 hours) or buses from Dhaka." },
  { divisionSlug: "rangpur", name_bn: "নীলফামারী", name_en: "Nilphamari", slug: "nilphamari", tagline: "নীলসাগর আর সৈয়দপুরের জনপদ", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 25.9318, lng: 88.856, status: "good", image: "", attractions: [
    { name: "Nilsagar", type: "nature", desc: "Ancient reservoir that draws winter birds" },
    { name: "Dharmapal's palace ruins", type: "historical", desc: "Remains of a Pala-era royal site" },
    { name: "Teesta riverside, Dimla", type: "nature", desc: "Upper Teesta landscapes" },
  ], food: ["Pitha", "River fish"], transport: "Flight to Saidpur Airport, or about 8 hours by train or bus from Dhaka." },
  { divisionSlug: "rangpur", name_bn: "পঞ্চগড়", name_en: "Panchagarh", slug: "panchagarh", tagline: "তেঁতুলিয়া থেকে কাঞ্চনজঙ্ঘা", best_time: "Oct–Dec (mountain views)", trip_type: "Nature", budget: "৳2,000–৳5,000", difficulty: 2, family: true, lat: 26.3411, lng: 88.5542, status: "good", image: "", attractions: [
    { name: "Tetulia", type: "nature", desc: "Kanchenjunga views on clear autumn mornings" },
    { name: "Banglabandha Zero Point", type: "cultural", desc: "Northernmost point of Bangladesh" },
    { name: "Bhitargarh", type: "historical", desc: "Ruins of an ancient fortified city" },
    { name: "Tea gardens", type: "nature", desc: "Flat-land tea estates" },
  ], food: ["Panchagarh tea", "Pitha"], transport: "Overnight bus or train (Panchagarh Express, Ekota Express) from Dhaka, or fly to Saidpur." },
  { divisionSlug: "rangpur", name_bn: "রংপুর", name_en: "Rangpur", slug: "rangpur", tagline: "তাজহাট রাজবাড়ি আর বেগম রোকেয়ার শহর", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,500–৳3,500", difficulty: 1, family: true, lat: 25.7439, lng: 89.2752, status: "good", image: "", attractions: [
    { name: "Tajhat Palace", type: "historical", desc: "Marble-staired palace, now a museum" },
    { name: "Pairaband", type: "cultural", desc: "Birthplace of Begum Rokeya" },
    { name: "Carmichael College", type: "historical", desc: "Grand 1916 college campus" },
  ], food: ["Haribhanga mango", "Shidol"], transport: "6–7 hours by bus or train (Rangpur Express) from Dhaka, or fly to Saidpur." },
  { divisionSlug: "rangpur", name_bn: "ঠাকুরগাঁও", name_en: "Thakurgaon", slug: "thakurgaon", tagline: "সূর্যপুরী আমগাছের দেশ", best_time: "Oct–Mar", trip_type: "Heritage", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 26.0337, lng: 88.4617, status: "good", image: "", attractions: [
    { name: "Suryapuri mango tree, Baliadangi", type: "nature", desc: "Giant mango tree said to be about 200 years old" },
    { name: "Jamalpur Zamindar Bari Mosque", type: "historical", desc: "Ornate old mosque" },
    { name: "Raja Tonkonath's palace, Ranisankail", type: "historical", desc: "Ruined zamindar palace" },
  ], food: ["Suryapuri mango", "Pitha"], transport: "About 9 hours by bus or train from Dhaka, or fly to Saidpur." },

  // ── Barishal division ──
  { divisionSlug: "barishal", name_bn: "বরগুনা", name_en: "Barguna", slug: "barguna", tagline: "সাগর আর ম্যানগ্রোভের জনপদ", best_time: "Nov–Mar", trip_type: "Beach", budget: "৳1,500–৳4,000", difficulty: 2, family: true, lat: 22.1591, lng: 90.1255, status: "good", image: "", attractions: [
    { name: "Shubhosondha Beach", type: "nature", desc: "Quiet beach at the Bay of Bengal" },
    { name: "Tengragiri mangrove forest", type: "nature", desc: "Mangrove forest near Sonakata" },
    { name: "Bibichini Shahi Mosque", type: "historical", desc: "17th-century hilltop mosque" },
  ], food: ["Sea fish", "Shutki"], transport: "Overnight launch from Sadarghat, or about 6 hours by bus over the Padma Bridge." },
  { divisionSlug: "barishal", name_bn: "বরিশাল", name_en: "Barishal", slug: "barishal", tagline: "ধান-নদী-খালের দেশ", best_time: "Oct–Mar", trip_type: "River", budget: "৳1,500–৳4,000", difficulty: 1, family: true, lat: 22.701, lng: 90.3535, status: "good", image: "", attractions: [
    { name: "Durga Sagar", type: "nature", desc: "Large 18th-century reservoir with an island" },
    { name: "Guthia Mosque", type: "religious", desc: "Modern landmark mosque complex" },
    { name: "Oxford Mission Church", type: "religious", desc: "Red-brick church from 1903" },
    { name: "Lakutia Zamindar Bari", type: "historical", desc: "Old zamindar palace" },
  ], food: ["Hilsa", "Guava", "Pitha"], transport: "Overnight launch from Sadarghat, about 4 hours by bus over the Padma Bridge, or a flight." },
  { divisionSlug: "barishal", name_bn: "ভোলা", name_en: "Bhola", slug: "bhola", tagline: "দেশের সবচেয়ে বড় দ্বীপ", best_time: "Nov–Mar", trip_type: "Island", budget: "৳1,500–৳4,000", difficulty: 2, family: true, lat: 22.6859, lng: 90.6482, status: "good", image: "", attractions: [
    { name: "Char Kukri Mukri", type: "nature", desc: "Mangrove island and wildlife sanctuary" },
    { name: "Monpura", type: "nature", desc: "Island famed for deer and winter birds" },
  ], food: ["Buffalo-milk yoghurt", "Hilsa"], transport: "Launch from Sadarghat (7–8 hours), or via Barishal." },
  { divisionSlug: "barishal", name_bn: "ঝালকাঠি", name_en: "Jhalokati", slug: "jhalokati", tagline: "ভাসমান পেয়ারা বাজারের দেশ", best_time: "Jul–Sep (guava season)", trip_type: "River", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 22.6406, lng: 90.1987, status: "good", image: "", attractions: [
    { name: "Bhimruli floating market", type: "market", desc: "Guava traded from boats on the canals" },
    { name: "Kirtipasha Zamindar Bari", type: "historical", desc: "Ruins of a zamindar estate" },
  ], food: ["Guava", "Amra"], transport: "Launch from Dhaka, or 30 minutes by road from Barishal." },
  { divisionSlug: "barishal", name_bn: "পিরোজপুর", name_en: "Pirojpur", slug: "pirojpur", tagline: "আটঘর-কুড়িয়ানার ভাসমান বাজার", best_time: "Jul–Sep (guava season)", trip_type: "River", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 22.5841, lng: 89.972, status: "good", image: "", attractions: [
    { name: "Atghar–Kuriana floating market", type: "market", desc: "Guava market on boats near Swarupkathi" },
    { name: "Rayerkathi Zamindar Bari", type: "historical", desc: "Old zamindar palace and temples" },
  ], food: ["Guava", "River fish"], transport: "About 5 hours by bus over the Padma Bridge, or launch from Dhaka." },

  // ── Sylhet division ──
  { divisionSlug: "sylhet", name_bn: "হবিগঞ্জ", name_en: "Habiganj", slug: "habiganj", tagline: "সাতছড়ি বন আর চা বাগানের জেলা", best_time: "Oct–Mar", trip_type: "Forest", budget: "৳1,500–৳4,000", difficulty: 2, family: true, lat: 24.3749, lng: 91.4155, status: "good", image: "", attractions: [
    { name: "Satchari National Park", type: "nature", desc: "Hill forest with gibbons and birds" },
    { name: "Rema-Kalenga Wildlife Sanctuary", type: "nature", desc: "Remote forest reserve" },
    { name: "Bithangal Akhra", type: "religious", desc: "Vaishnav monastery in the haor" },
  ], food: ["Tea", "Haor fish"], transport: "3.5–4 hours by bus, or by train (Parabat, Jayantika) to Shaistaganj." },

  // ── Mymensingh division ──
  { divisionSlug: "mymensingh", name_bn: "জামালপুর", name_en: "Jamalpur", slug: "jamalpur", tagline: "নকশিকাঁথা আর লাউচাপড়ার দেশ", best_time: "Oct–Mar", trip_type: "Nature", budget: "৳1,000–৳3,000", difficulty: 2, family: true, lat: 24.9375, lng: 89.937, status: "good", image: "", attractions: [
    { name: "Lauchapra", type: "nature", desc: "Hill-side picnic spot in Bakshiganj" },
    { name: "Gandhi Ashram, Melandaha", type: "historical", desc: "1930s Gandhian centre, now a museum" },
    { name: "Brahmaputra riverside", type: "nature", desc: "Riverbank by the town" },
  ], food: ["Pitha", "River fish"], transport: "About 4 hours by train or bus from Dhaka." },
  { divisionSlug: "mymensingh", name_bn: "ময়মনসিংহ", name_en: "Mymensingh", slug: "mymensingh", tagline: "ব্রহ্মপুত্রের তীরে মুক্তাগাছার মন্ডার শহর", best_time: "Oct–Mar", trip_type: "Cultural", budget: "৳1,000–৳3,000", difficulty: 1, family: true, lat: 24.7471, lng: 90.4203, status: "good", image: "", attractions: [
    { name: "Shashi Lodge", type: "historical", desc: "Maharaja's palace with a marble fountain" },
    { name: "Zainul Abedin Museum", type: "cultural", desc: "Works of the father of Bangladeshi art" },
    { name: "Muktagacha Zamindar Bari", type: "historical", desc: "Ruined zamindar palace" },
  ], food: ["Muktagachar monda", "Pitha"], transport: "About 3 hours by bus or train from Dhaka." },
  { divisionSlug: "mymensingh", name_bn: "শেরপুর", name_en: "Sherpur", slug: "sherpur", tagline: "গারো পাহাড়ের পাদদেশে", best_time: "Oct–Mar", trip_type: "Nature", budget: "৳1,000–৳3,000", difficulty: 2, family: true, lat: 25.0205, lng: 90.0153, status: "good", image: "", attractions: [
    { name: "Gajni Obokash Kendro", type: "nature", desc: "Hills and lake at the Garo foothills" },
    { name: "Madhutila Eco Park", type: "nature", desc: "Forest trails and watchtower" },
    { name: "Ghagra Laskar Bari Mosque", type: "historical", desc: "Small old mosque" },
  ], food: ["Tulshimala rice", "Pitha"], transport: "About 4 hours by bus from Dhaka." },
];
