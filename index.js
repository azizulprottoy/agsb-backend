const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 5000;

const { CORS_ORIGINS } = require('./src/config/constants');
const { connectDB } = require('./src/config/db');

const authRoutes = require('./src/routes/authRoutes');
const profileRoutes = require('./src/routes/profileRoutes');
const userRoutes = require('./src/routes/userRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const divisionRoutes = require('./src/routes/divisionRoutes');
const districtRoutes = require('./src/routes/districtRoutes');
const blogRoutes = require('./src/routes/blogRoutes');
const planRoutes = require('./src/routes/planRoutes');
const partnerRoutes = require('./src/routes/partnerRoutes');
const membershipRoutes = require('./src/routes/membershipRoutes');
const frameRoutes = require('./src/routes/frameRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const hotelRoutes = require('./src/routes/hotelRoutes');
const transportRoutes = require('./src/routes/transportRoutes');
const guideRoutes = require('./src/routes/guideRoutes');
const districtAgentRoutes = require('./src/routes/districtAgentRoutes');
const checkpointRoutes = require('./src/routes/checkpointRoutes');
const richTextRoutes = require('./src/routes/richTextRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const paymentMethodRoutes = require('./src/routes/paymentMethodRoutes');

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
}));

app.use(express.json());

const uploadDirectory = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory);
}

async function run() {
  try {
    const collections = await connectDB();

    app.use('/uploads', express.static(uploadDirectory));

    app.use('/api', authRoutes(collections));
    app.use('/api', profileRoutes(collections));
    app.use('/api', userRoutes(collections));
    app.use('/api', dashboardRoutes(collections));
    app.use('/api', divisionRoutes(collections));
    app.use('/api', districtRoutes(collections));
    app.use('/api', blogRoutes(collections));
    app.use('/api', planRoutes(collections));
    app.use('/api', partnerRoutes(collections));
    app.use('/api', membershipRoutes(collections));
    app.use('/api', frameRoutes(collections));
    app.use('/api', contactRoutes(collections));
    app.use('/api', hotelRoutes(collections));
    app.use('/api', transportRoutes(collections));
    app.use('/api', guideRoutes(collections));
    app.use('/api', districtAgentRoutes(collections));
    app.use('/api', checkpointRoutes(collections));
    app.use('/api', richTextRoutes());
    app.use('/api', bookingRoutes(collections));
    app.use('/api', paymentMethodRoutes(collections));

    app.listen(port, () => {
      console.log(`agsb-backend is running on port: ${port}`);
    });
  } catch (error) {
    console.error(error);
  }
}

run().catch(console.dir);
