const { ObjectId } = require('mongodb');
const { generateUniqueReferenceCode } = require('../utils/refCode');

// Share of the total paid online to hold the booking; the rest is paid on arrival.
const ADVANCE_RATE = 0.4;
const MAX_TICKETS = 10;

const GENDERS = ['male', 'female', 'other'];
const RELATIONS = ['self', 'spouse', 'parent', 'child', 'sibling', 'relative', 'friend', 'colleague', 'other'];
const PAYMENT_STATUSES = ['unpaid', 'pending_verification', 'advance_paid', 'paid_full', 'failed'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

const BD_PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;
const TRX_ID = /^[A-Z0-9]{6,30}$/;

const toObjectId = (id) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

const historyEntry = (status, note) => ({ status, note: note || '', date: new Date().toISOString() });

// Returns { travellers } on success or { error } describing the first invalid field.
const validateTravellers = (travellers, count) => {
  if (!Array.isArray(travellers) || travellers.length !== count) {
    return { error: 'Traveller details must be filled in for every ticket' };
  }
  const cleaned = [];
  for (let i = 0; i < travellers.length; i++) {
    const t = travellers[i] || {};
    const label = `Traveller ${i + 1}`;
    const name = String(t.name || '').trim();
    const phone = String(t.phone || '').replace(/[\s-]/g, '');
    const age = Number(t.age);
    if (!name || name.length > 100) return { error: `${label}: name is required` };
    if (!GENDERS.includes(t.gender)) return { error: `${label}: select a gender` };
    if (!BD_PHONE.test(phone)) return { error: `${label}: enter a valid Bangladeshi phone number` };
    if (!Number.isInteger(age) || age < 0 || age > 120) return { error: `${label}: enter a valid age` };
    if (!RELATIONS.includes(t.relation)) return { error: `${label}: select a relation` };
    cleaned.push({ name, gender: t.gender, phone, age, relation: t.relation });
  }
  return { travellers: cleaned };
};

const canView = (req, booking) => req.user.role === 'admin' || String(booking.userId) === String(req.user.userId);

module.exports = ({ BookingCollection, TravelPlanCollection, PaymentMethodCollection }) => {
  // Give seats back to the plan, reopening it if it had been marked full.
  const releaseSeats = async (planId, count) => {
    await TravelPlanCollection.updateOne(
      { _id: planId, seats_available: { $type: 'number' } },
      { $inc: { seats_available: count } }
    );
    await TravelPlanCollection.updateOne(
      { _id: planId, status: 'full', seats_available: { $gt: 0 } },
      { $set: { status: 'open' } }
    );
  };

  return {
    createBooking: async (req, res) => {
      try {
        const { planSlug, note } = req.body;
        const ticketCount = Number(req.body.ticketCount);

        if (!Number.isInteger(ticketCount) || ticketCount < 1 || ticketCount > MAX_TICKETS) {
          return res.status(400).json({ success: false, message: `You can book 1 to ${MAX_TICKETS} tickets at a time` });
        }
        const { travellers, error } = validateTravellers(req.body.travellers, ticketCount);
        if (error) return res.status(400).json({ success: false, message: error });

        const plan = await TravelPlanCollection.findOne({ slug: planSlug });
        if (!plan) return res.status(404).json({ success: false, message: 'Travel plan not found' });
        if ((plan.status || 'open') !== 'open') {
          return res.status(409).json({ success: false, message: 'Booking is not open for this plan' });
        }
        if (!(plan.price > 0)) {
          return res.status(409).json({ success: false, message: 'This plan is not available for online booking yet' });
        }

        // Reserve seats atomically so two bookings cannot take the same last seat.
        const hasSeatLimit = typeof plan.seats_available === 'number';
        if (hasSeatLimit) {
          const reserved = await TravelPlanCollection.updateOne(
            { _id: plan._id, status: 'open', seats_available: { $gte: ticketCount } },
            { $inc: { seats_available: -ticketCount } }
          );
          if (!reserved.modifiedCount) {
            const fresh = await TravelPlanCollection.findOne({ _id: plan._id });
            const left = fresh?.seats_available ?? 0;
            return res.status(409).json({ success: false, message: left > 0 ? `Only ${left} seat${left === 1 ? '' : 's'} left` : 'This plan is fully booked' });
          }
          await TravelPlanCollection.updateOne({ _id: plan._id, seats_available: 0, status: 'open' }, { $set: { status: 'full' } });
        }

        const totalAmount = plan.price * ticketCount;
        const advanceAmount = Math.ceil(totalAmount * ADVANCE_RATE);
        const now = new Date().toISOString();

        const booking = {
          referenceCode: await generateUniqueReferenceCode(BookingCollection),
          userId: new ObjectId(req.user.userId),
          userName: req.user.name || '',
          userEmail: req.user.email || '',
          planId: plan._id,
          planSlug: plan.slug,
          planTitle_bn: plan.title_bn,
          planTitle_en: plan.title_en,
          start_date: plan.start_date || '',
          end_date: plan.end_date || '',
          ticketCount,
          travellers,
          note: String(note || '').trim().slice(0, 1000),
          pricePerPerson: plan.price,
          totalAmount,
          advanceAmount,
          dueAmount: totalAmount,
          paidAmount: 0,
          paymentStatus: 'unpaid',
          bookingStatus: 'pending',
          payment: null,
          statusHistory: [historyEntry('pending', 'Booking created')],
          createdAt: now,
        };

        let result;
        try {
          result = await BookingCollection.insertOne(booking);
        } catch (insertErr) {
          if (hasSeatLimit) await releaseSeats(plan._id, ticketCount);
          throw insertErr;
        }

        res.status(201).json({ success: true, bookingId: result.insertedId, referenceCode: booking.referenceCode });
      } catch (err) {
        console.error('Create booking error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    },

    getMyBookings: async (req, res) => {
      const result = await BookingCollection.find({ userId: new ObjectId(req.user.userId) }).sort({ _id: -1 }).toArray();
      res.json(result);
    },

    getBooking: async (req, res) => {
      const id = toObjectId(req.params.id);
      const booking = id && await BookingCollection.findOne({ _id: id });
      if (!booking || !canView(req, booking)) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
      res.json(booking);
    },

    // Customer reports the advance they sent by mobile banking; an admin verifies it later.
    submitPayment: async (req, res) => {
      try {
        const id = toObjectId(req.params.id);
        const booking = id && await BookingCollection.findOne({ _id: id });
        if (!booking || String(booking.userId) !== String(req.user.userId)) {
          return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (booking.bookingStatus === 'cancelled') {
          return res.status(409).json({ success: false, message: 'This booking was cancelled' });
        }
        if (!['unpaid', 'failed'].includes(booking.paymentStatus)) {
          return res.status(409).json({ success: false, message: 'Payment has already been submitted for this booking' });
        }

        const methodId = toObjectId(req.body.paymentMethodId);
        const method = methodId && await PaymentMethodCollection.findOne({ _id: methodId, active: { $ne: false } });
        if (!method) return res.status(400).json({ success: false, message: 'Select a payment method' });

        const senderNumber = String(req.body.senderNumber || '').replace(/[\s-]/g, '');
        const transactionId = String(req.body.transactionId || '').trim().toUpperCase();
        if (!BD_PHONE.test(senderNumber)) {
          return res.status(400).json({ success: false, message: 'Enter the number you sent the money from' });
        }
        if (!TRX_ID.test(transactionId)) {
          return res.status(400).json({ success: false, message: 'Enter a valid transaction ID' });
        }
        const reused = await BookingCollection.findOne({ 'payment.transactionId': transactionId, _id: { $ne: id } });
        if (reused) {
          return res.status(409).json({ success: false, message: 'This transaction ID has already been used' });
        }

        const payment = {
          methodId: method._id,
          method: method.method,
          number: method.number,
          senderNumber,
          transactionId,
          amount: booking.advanceAmount,
          submittedAt: new Date().toISOString(),
        };

        // The status filter makes a double submit a no-op instead of overwriting.
        const result = await BookingCollection.updateOne(
          { _id: id, paymentStatus: { $in: ['unpaid', 'failed'] } },
          {
            $set: { payment, paymentStatus: 'pending_verification' },
            $push: { statusHistory: historyEntry('pending_verification', `${method.method} TrxID ${transactionId}`) },
          }
        );
        if (!result.modifiedCount) {
          return res.status(409).json({ success: false, message: 'Payment has already been submitted for this booking' });
        }
        res.json({ success: true, message: 'Payment submitted for verification' });
      } catch (err) {
        console.error('Submit payment error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    },

    getAllBookings: async (req, res) => {
      const result = await BookingCollection.find().sort({ _id: -1 }).toArray();
      res.json(result);
    },

    updatePaymentStatus: async (req, res) => {
      try {
        const id = toObjectId(req.params.id);
        const { paymentStatus } = req.body;
        if (!PAYMENT_STATUSES.includes(paymentStatus)) {
          return res.status(400).json({ success: false, message: 'Invalid payment status' });
        }
        const booking = id && await BookingCollection.findOne({ _id: id });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

        const paidAmount = paymentStatus === 'paid_full' ? booking.totalAmount
          : paymentStatus === 'advance_paid' ? booking.advanceAmount
          : 0;
        const update = { paymentStatus, paidAmount, dueAmount: booking.totalAmount - paidAmount };
        if (['advance_paid', 'paid_full'].includes(paymentStatus) && booking.bookingStatus === 'pending') {
          update.bookingStatus = 'confirmed';
        }

        await BookingCollection.updateOne(
          { _id: id },
          { $set: update, $push: { statusHistory: historyEntry(paymentStatus, 'Payment status updated by admin') } }
        );
        res.json({ success: true, booking: await BookingCollection.findOne({ _id: id }) });
      } catch (err) {
        console.error('Update payment status error:', err);
        res.status(500).json({ success: false, message: 'Error updating payment status' });
      }
    },

    updateBookingStatus: async (req, res) => {
      try {
        const id = toObjectId(req.params.id);
        const { status } = req.body;
        if (!BOOKING_STATUSES.includes(status)) {
          return res.status(400).json({ success: false, message: 'Invalid booking status' });
        }
        const booking = id && await BookingCollection.findOne({ _id: id });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        if (booking.bookingStatus === 'cancelled' && status !== 'cancelled') {
          return res.status(409).json({ success: false, message: 'A cancelled booking cannot be reopened; ask the traveller to book again' });
        }

        await BookingCollection.updateOne(
          { _id: id },
          { $set: { bookingStatus: status }, $push: { statusHistory: historyEntry(status, 'Booking status updated by admin') } }
        );
        if (status === 'cancelled' && booking.bookingStatus !== 'cancelled') {
          await releaseSeats(booking.planId, booking.ticketCount);
        }
        res.json({ success: true, booking: await BookingCollection.findOne({ _id: id }) });
      } catch (err) {
        console.error('Update booking status error:', err);
        res.status(500).json({ success: false, message: 'Error updating booking status' });
      }
    },
  };
};
