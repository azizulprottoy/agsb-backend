const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || 'agsb';

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const EMAIL_COLLATION = { locale: 'en', strength: 2 };

// [collection, keys, options] for every index the app relies on.
const INDEXES = [
  ['users', { email: 1 }, { unique: true, collation: EMAIL_COLLATION, name: 'email_unique_ci' }],
  ['admins', { email: 1 }, { unique: true, collation: EMAIL_COLLATION, name: 'email_unique_ci' }],
  ['divisions', { slug: 1 }, { unique: true, name: 'slug_unique' }],
  ['districts', { slug: 1 }, { unique: true, name: 'slug_unique' }],
  ['attractions', { slug: 1 }, { unique: true, name: 'slug_unique' }],
  ['attractions', { district_id: 1, order: 1 }, { name: 'district_id_order' }],
  ['travelplans', { slug: 1 }, { unique: true, name: 'slug_unique' }],
  ['blogposts', { slug: 1 }, { unique: true, name: 'slug_unique' }],
  ['bookings', { referenceCode: 1 }, { unique: true, name: 'referenceCode_unique' }],
  ['bookings', { 'payment.transactionId': 1 }, {
    unique: true,
    partialFilterExpression: { 'payment.transactionId': { $type: 'string' } },
    name: 'payment_transactionId_unique',
  }],
  ['bookings', { userId: 1 }, { name: 'userId' }],
  ['bookings', { planId: 1, paymentStatus: 1, bookingStatus: 1 }, { name: 'planId_paymentStatus_bookingStatus' }],
  ['bookings', { holdExpiresAt: 1 }, { name: 'holdExpiresAt' }],
  ['coupons', { code: 1 }, { unique: true, name: 'code_unique' }],
  ['productcategories', { slug: 1 }, { unique: true, name: 'slug_unique' }],
  ['products', { slug: 1 }, { unique: true, name: 'slug_unique' }],
  ['products', { category_id: 1 }, { name: 'category_id' }],
  ['orders', { referenceCode: 1 }, { unique: true, name: 'referenceCode_unique' }],
  ['orders', { 'payment.transactionId': 1 }, {
    unique: true,
    partialFilterExpression: { 'payment.transactionId': { $type: 'string' } },
    name: 'payment_transactionId_unique',
  }],
  ['orders', { userId: 1 }, { name: 'userId' }],
  ['orders', { holdExpiresAt: 1 }, { name: 'holdExpiresAt' }],
  ['reviews', { targetType: 1, targetId: 1, kind: 1, status: 1, _id: -1 }, { name: 'target_kind_status' }],
  // One star review per user per item; comments are unlimited.
  ['reviews', { targetType: 1, targetId: 1, userId: 1 }, {
    unique: true,
    partialFilterExpression: { kind: 'review' },
    name: 'one_review_per_user',
  }],
  ['reviews', { kind: 1, createdAt: -1 }, { name: 'kind_createdAt' }],
];

// Creating an index that already exists is a no-op. A failure (most likely
// duplicates already in the data, which block a unique index) is logged and
// the server still starts; fix the data and restart to get the index.
async function ensureIndexes(db) {
  await Promise.all(INDEXES.map(async ([collection, keys, options]) => {
    try {
      await db.collection(collection).createIndex(keys, options);
    } catch (err) {
      console.warn(
        `WARNING: could not create index ${options.name} on ${collection}: ${err.message}` +
        (err.code === 11000 ? ' (duplicate values exist; remove them and restart)' : '')
      );
    }
  }));
}

async function connectDB() {
  await client.connect();

  const db = client.db(dbName);
  await ensureIndexes(db);

  return {
    AdminCollection:         db.collection('admins'),
    UserCollection:          db.collection('users'),
    DivisionCollection:      db.collection('divisions'),
    DistrictCollection:      db.collection('districts'),
    BlogCollection:          db.collection('blogposts'),
    TravelPlanCollection:    db.collection('travelplans'),
    PartnerCollection:       db.collection('partners'),
    MembershipPlanCollection: db.collection('membershipplans'),
    FrameCollection:         db.collection('frames'),
    ContactMessageCollection: db.collection('contactmessages'),
    HotelCollection:         db.collection('hotels'),
    TransportCollection:     db.collection('transports'),
    GuideCollection:         db.collection('guides'),
    DistrictAgentCollection: db.collection('districtagents'),
    CheckpointCollection:    db.collection('checkpoints'),
    AttractionCollection:    db.collection('attractions'),
    BookingCollection:       db.collection('bookings'),
    PaymentMethodCollection: db.collection('paymentmethods'),
    SocialCollection:        db.collection('socials'),
    CouponCollection:        db.collection('coupons'),
    ProductCategoryCollection: db.collection('productcategories'),
    ProductCollection:       db.collection('products'),
    OrderCollection:         db.collection('orders'),
    ReviewCollection:        db.collection('reviews'),
  };
}

module.exports = { connectDB, client, ensureIndexes };
