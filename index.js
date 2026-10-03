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
const { createHoldHelpers } = require('./src/controllers/bookingController');

// How often unpaid bookings with an expired seat hold are cancelled.
const HOLD_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

app.use(cors({ origin: CORS_ORIGINS }));

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

    // Release seats held by unpaid bookings whose hold has expired. createBooking
    // also sweeps its own plan, so this only keeps seat counts fresh in between.
    const { sweepExpiredHolds } = createHoldHelpers(collections);
    const sweep = () => sweepExpiredHolds()
      .then((n) => { if (n) console.log(`Expired ${n} unpaid booking hold(s)`); })
      .catch((err) => console.error('Booking hold sweep error:', err));
    sweep();
    setInterval(sweep, HOLD_SWEEP_INTERVAL_MS).unref();

    // Final error handler: any error passed to next(err) — including rejected
    // async handlers (see utils/asyncRouter) — gets a JSON response instead of
    // crashing the process or leaking an HTML stack trace.
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
      const status = err.status || err.statusCode || (err.name === 'MulterError' ? 400 : 500);
      if (status >= 500) console.error(`${req.method} ${req.originalUrl}`, err);
      if (res.headersSent) return;
      res.status(status).json({
        success: false,
        message: status >= 500 ? 'Internal server error' : err.message,
      });
    });

    app.listen(port, () => {
      console.log(`agsb-backend is running on port: ${port}`);
    });
  } catch (error) {
    console.error(error);
  }
}

// Last line of defence: log instead of letting Node terminate the process.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

run().catch(console.dir);
