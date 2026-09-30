const express = require('express');
const bookingController = require('../controllers/bookingController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = bookingController(collections);

  router.post('/bookings', verifyToken, ctrl.createBooking);
  router.get('/bookings/my', verifyToken, ctrl.getMyBookings);
  router.get('/bookings', verifyToken, requireAdmin, ctrl.getAllBookings);
  router.get('/bookings/:id', verifyToken, ctrl.getBooking);
  router.put('/bookings/:id/payment', verifyToken, ctrl.submitPayment);
  router.patch('/bookings/:id/payment-status', verifyToken, requireAdmin, ctrl.updatePaymentStatus);
  router.patch('/bookings/:id/status', verifyToken, requireAdmin, ctrl.updateBookingStatus);

  return router;
};
