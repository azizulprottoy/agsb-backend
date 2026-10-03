const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 5000;

const { CORS_ORIGINS } = require('./src/config/constants');
const { isDuplicateKeyError, duplicateKeyMessage } = require('./src/utils/http');
const { MAX_FILE_SIZE } = require('./src/middleware/upload');
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

    // Uploaded files are user-supplied: never let a browser sniff them into
    // HTML/script, and never let one run as a page on the API origin.
    app.use('/uploads', express.static(uploadDirectory, {
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox");
      },
    }));

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

    // Anything no route matched gets a JSON 404 instead of Express's HTML page.
    app.use((req, res) => {
      res.status(404).json({ success: false, message: 'Not found' });
    });

    // Final error handler: any error passed to next(err) — including rejected
    // async handlers (see utils/asyncRouter) — gets a JSON response instead of
    // crashing the process or leaking an HTML stack trace.
    // eslint-disable-next-line no-unused-vars
    app.use((err, req, res, next) => {
      // A request that failed after multer stored its upload must not leave an orphan file.
      if (req.file?.path) fs.unlink(req.file.path, () => {});

      let status = Number(err.status || err.statusCode) || 500;
      let { message } = err;
      if (err.name === 'MulterError') {
        status = 400;
        if (err.code === 'LIMIT_FILE_SIZE') message = `File too large (max ${MAX_FILE_SIZE / (1024 * 1024)} MB)`;
        else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') message = 'Only one image file is allowed';
      } else if (isDuplicateKeyError(err)) {
        status = 409;
        message = duplicateKeyMessage(err);
      } else if (err.type === 'entity.parse.failed') {
        message = 'Malformed JSON body';
      } else if (err.type === 'entity.too.large') {
        message = 'Request body too large';
      }
      if (status < 400 || status > 599) status = 500;

      if (status >= 500) console.error(`${req.method} ${req.originalUrl}`, err);
      if (res.headersSent) return;
      res.status(status).json({
        success: false,
        message: status >= 500 ? 'Internal server error' : message,
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
