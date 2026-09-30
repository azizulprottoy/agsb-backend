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

async function connectDB() {
  await client.connect();

  const db = client.db(dbName);

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
    BookingCollection:       db.collection('bookings'),
    PaymentMethodCollection: db.collection('paymentmethods'),
  };
}

module.exports = { connectDB, client };
