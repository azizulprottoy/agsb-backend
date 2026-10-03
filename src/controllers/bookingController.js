const { ObjectId } = require('mongodb');
const { generateUniqueReferenceCode } = require('../utils/refCode');
const { BD_PHONE } = require('../utils/contactValidation');
const { sendList } = require('../utils/pagination');

// Share of the total paid online to hold the booking; the rest is paid on arrival.
const ADVANCE_RATE = 0.4;
const MAX_TICKETS = 10;
// How long an unpaid booking holds its seats before the sweep releases them.
const HOLD_MINUTES = Number(process.env.BOOKING_HOLD_MINUTES) > 0 ? Number(process.env.BOOKING_HOLD_MINUTES) : 60;
// Limits on unpaid pending bookings, so seats cannot be hoarded without paying.
const MAX_UNPAID_PER_PLAN = 1;
const MAX_UNPAID_TOTAL = 3;

const GENDERS = ['male', 'female', 'other'];
const RELATIONS = ['self', 'spouse', 'parent', 'child', 'sibling', 'relative', 'friend', 'colleague', 'other'];
const PAYMENT_STATUSES = ['unpaid', 'pending_verification', 'advance_paid', 'paid_full', 'failed'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

const TRX_ID = /^[A-Z0-9]{6,30}$/;

// Strict ObjectId check: rejects 12-char strings that isValid() alone would accept.
const toObjectId = (id) => (typeof id === 'string' && ObjectId.isValid(id) && String(new ObjectId(id)) === id ? new ObjectId(id) : null);

const BOOKING_SEARCH_FIELDS = [
  'referenceCode', 'userName', 'userEmail', 'planTitle_en', 'planTitle_bn', 'travellers.phone', 'payment.transactionId',
];

const invalidId = (res) => res.status(400).json({ success: false, message: 'Invalid id' });

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

// Today's date (YYYY-MM-DD) in Bangladesh, where all trips take place.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const todayInDhaka = () => new Date(Date.now() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);

// A trip whose start date is before today has already started. Plans without
// a usable YYYY-MM-DD start date are not restricted.
const hasStarted = (plan) => {
  const start = typeof plan.start_date === 'string' ? plan.start_date.slice(0, 10) : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(start) && start < todayInDhaka();
};

// Plans created before `status` existed have none; treat that as open.
const OPEN_STATUS = { $in: ['open', null] };

const canView = (req, booking) => req.user.role === 'admin' || String(booking.userId) === String(req.user.userId);

// Shared by the request handlers and the periodic sweep started in index.js.
const createHoldHelpers = ({ BookingCollection, TravelPlanCollection }) => {
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

  // An unpaid pending booking whose hold has run out. Bookings created before
  // holds existed have no holdExpiresAt and therefore never match.
  const expiredHoldFilter = (now) => ({
    paymentStatus: 'unpaid',
    bookingStatus: 'pending',
    holdExpiresAt: { $exists: true, $lt: now },
  });

  // Cancel one expired hold. The conditional update means only one caller can
  // win, so seats are released exactly once even if sweeps run concurrently.
  const expireHold = async (booking, now) => {
    const result = await BookingCollection.updateOne(
      { _id: booking._id, ...expiredHoldFilter(now) },
      {
        $set: { bookingStatus: 'cancelled', cancelReason: 'expired' },
        $push: { statusHistory: historyEntry('cancelled', 'Payment hold expired') },
        $unset: { holdExpiresAt: '' },
      }
    );
    if (result.modifiedCount === 1) {
      await releaseSeats(booking.planId, booking.ticketCount);
      return true;
    }
    return false;
  };

  // Expire every overdue hold (optionally only for one plan). Returns how many were expired.
  const sweepExpiredHolds = async (planId) => {
    const now = new Date().toISOString();
    const filter = expiredHoldFilter(now);
    if (planId) filter.planId = planId;
    const expired = await BookingCollection.find(filter, { projection: { _id: 1, planId: 1, ticketCount: 1 } }).toArray();
    let count = 0;
    for (const booking of expired) {
      if (await expireHold(booking, now)) count++;
    }
    return count;
  };

  return { releaseSeats, expireHold, sweepExpiredHolds };
};

module.exports = (collections) => {
  const { BookingCollection, TravelPlanCollection, PaymentMethodCollection } = collections;
  const { releaseSeats, expireHold, sweepExpiredHolds } = createHoldHelpers(collections);

  return {
    sweepExpiredHolds,

    createBooking: async (req, res) => {
      try {
        const { note } = req.body;
        const planSlug = req.body.planSlug == null || typeof req.body.planSlug === 'object' ? '' : String(req.body.planSlug).trim();
        if (!planSlug) return res.status(400).json({ success: false, message: 'Select a travel plan' });
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
        if (hasStarted(plan)) {
          return res.status(409).json({ success: false, message: 'This trip has already started' });
        }
        if (!(plan.price > 0)) {
          return res.status(409).json({ success: false, message: 'This plan is not available for online booking yet' });
        }

        // Free seats held by expired unpaid bookings before checking availability.
        await sweepExpiredHolds(plan._id);

        const userId = new ObjectId(req.user.userId);
        const unpaid = { userId, paymentStatus: 'unpaid', bookingStatus: 'pending' };
        if (await BookingCollection.countDocuments({ ...unpaid, planId: plan._id }) >= MAX_UNPAID_PER_PLAN) {
          return res.status(409).json({ success: false, message: 'You already have an unpaid booking for this plan — complete its payment first' });
        }
        if (await BookingCollection.countDocuments(unpaid) >= MAX_UNPAID_TOTAL) {
          return res.status(409).json({ success: false, message: `You have ${MAX_UNPAID_TOTAL} unpaid bookings — complete or wait for them to expire before booking again` });
        }

        // Generated before any seats are reserved, so a failure here cannot leak seats.
        const referenceCode = await generateUniqueReferenceCode(BookingCollection);

        // Reserve seats atomically so two bookings cannot take the same last seat.
        const hasSeatLimit = typeof plan.seats_available === 'number';
        if (hasSeatLimit) {
          const reserved = await TravelPlanCollection.updateOne(
            { _id: plan._id, status: OPEN_STATUS, seats_available: { $gte: ticketCount } },
            { $inc: { seats_available: -ticketCount } }
          );
          if (!reserved.modifiedCount) {
            const fresh = await TravelPlanCollection.findOne({ _id: plan._id });
            const left = fresh?.seats_available ?? 0;
            return res.status(409).json({ success: false, message: left > 0 ? `Only ${left} seat${left === 1 ? '' : 's'} left` : 'This plan is fully booked' });
          }
          await TravelPlanCollection.updateOne({ _id: plan._id, seats_available: 0, status: OPEN_STATUS }, { $set: { status: 'full' } });
        }

        const totalAmount = plan.price * ticketCount;
        const advanceAmount = Math.ceil(totalAmount * ADVANCE_RATE);
        const createdAt = new Date();
        const now = createdAt.toISOString();
        const holdExpiresAt = new Date(createdAt.getTime() + HOLD_MINUTES * 60 * 1000).toISOString();

        const booking = {
          referenceCode,
          userId,
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
          holdExpiresAt,
        };

        let result;
        try {
          result = await BookingCollection.insertOne(booking);
        } catch (insertErr) {
          if (hasSeatLimit) await releaseSeats(plan._id, ticketCount);
          throw insertErr;
        }

        res.status(201).json({ success: true, bookingId: result.insertedId, referenceCode: booking.referenceCode, holdExpiresAt });
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
      if (!id) return invalidId(res);
      const booking = await BookingCollection.findOne({ _id: id });
      if (!booking || !canView(req, booking)) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }
      res.json(booking);
    },

    // Customer reports the advance they sent by mobile banking; an admin verifies it later.
    submitPayment: async (req, res) => {
      try {
        const id = toObjectId(req.params.id);
        if (!id) return invalidId(res);
        const methodId = toObjectId(req.body.paymentMethodId);
        const senderNumber = String(req.body.senderNumber || '').replace(/[\s-]/g, '');
        const transactionId = String(req.body.transactionId || '').trim().toUpperCase();

        // Independent lookups run together (one round trip instead of three);
        // their results are still checked in the original order below.
        const [booking, method, reused] = await Promise.all([
          BookingCollection.findOne({ _id: id }),
          methodId ? PaymentMethodCollection.findOne({ _id: methodId, active: { $ne: false } }) : null,
          TRX_ID.test(transactionId)
            ? BookingCollection.findOne({ 'payment.transactionId': transactionId, _id: { $ne: id } }, { projection: { _id: 1 } })
            : null,
        ]);
        if (!booking || String(booking.userId) !== String(req.user.userId)) {
          return res.status(404).json({ success: false, message: 'Booking not found' });
        }
        if (booking.bookingStatus === 'cancelled') {
          return res.status(409).json({ success: false, message: 'This booking was cancelled' });
        }
        if (!['unpaid', 'failed'].includes(booking.paymentStatus)) {
          return res.status(409).json({ success: false, message: 'Payment has already been submitted for this booking' });
        }
        const holdExpired = () => booking.holdExpiresAt && booking.holdExpiresAt < new Date().toISOString();
        if (holdExpired()) {
          await expireHold(booking, new Date().toISOString());
          return res.status(409).json({ success: false, message: 'Your seat hold expired; please book again' });
        }

        if (!method) return res.status(400).json({ success: false, message: 'Select a payment method' });

        if (!BD_PHONE.test(senderNumber)) {
          return res.status(400).json({ success: false, message: 'Enter the number you sent the money from' });
        }
        if (!TRX_ID.test(transactionId)) {
          return res.status(400).json({ success: false, message: 'Enter a valid transaction ID' });
        }
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

        // The status filter makes a double submit a no-op instead of overwriting,
        // and also loses to a sweep that cancelled the booking in the meantime.
        // Removing holdExpiresAt means a booking awaiting verification never expires.
        const result = await BookingCollection.updateOne(
          {
            _id: id,
            paymentStatus: { $in: ['unpaid', 'failed'] },
            bookingStatus: { $ne: 'cancelled' },
            $or: [{ holdExpiresAt: { $exists: false } }, { holdExpiresAt: { $gte: new Date().toISOString() } }],
          },
          {
            $set: { payment, paymentStatus: 'pending_verification' },
            $push: { statusHistory: historyEntry('pending_verification', `${method.method} TrxID ${transactionId}`) },
            $unset: { holdExpiresAt: '' },
          }
        );
        if (!result.modifiedCount) {
          if (holdExpired()) {
            await expireHold(booking, new Date().toISOString());
            return res.status(409).json({ success: false, message: 'Your seat hold expired; please book again' });
          }
          return res.status(409).json({ success: false, message: 'Payment has already been submitted for this booking' });
        }
        res.json({ success: true, message: 'Payment submitted for verification' });
      } catch (err) {
        console.error('Submit payment error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    },

    // Admin list. Supports ?page&limit&q (see utils/pagination) plus
    // ?paymentStatus and ?bookingStatus filters (whitelisted values).
    getAllBookings: async (req, res) => {
      const filter = {};
      const { paymentStatus, bookingStatus } = req.query;
      if (paymentStatus !== undefined && paymentStatus !== '') {
        if (!PAYMENT_STATUSES.includes(paymentStatus)) {
          return res.status(400).json({ success: false, message: 'Invalid payment status' });
        }
        filter.paymentStatus = paymentStatus;
      }
      if (bookingStatus !== undefined && bookingStatus !== '') {
        if (!BOOKING_STATUSES.includes(bookingStatus)) {
          return res.status(400).json({ success: false, message: 'Invalid booking status' });
        }
        filter.bookingStatus = bookingStatus;
      }
      await sendList(req, res, BookingCollection, { filter, searchFields: BOOKING_SEARCH_FIELDS });
    },

    updatePaymentStatus: async (req, res) => {
      try {
        const id = toObjectId(req.params.id);
        if (!id) return invalidId(res);
        const { paymentStatus } = req.body || {};
        if (!PAYMENT_STATUSES.includes(paymentStatus)) {
          return res.status(400).json({ success: false, message: 'Invalid payment status' });
        }
        const booking = await BookingCollection.findOne({ _id: id });
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
        if (!id) return invalidId(res);
        const { status } = req.body || {};
        if (!BOOKING_STATUSES.includes(status)) {
          return res.status(400).json({ success: false, message: 'Invalid booking status' });
        }
        const booking = await BookingCollection.findOne({ _id: id });
        if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
        const reopenError = () => res.status(409).json({ success: false, message: 'A cancelled booking cannot be reopened; ask the traveller to book again' });
        if (booking.bookingStatus === 'cancelled' && status !== 'cancelled') return reopenError();

        // Conditional on "not cancelled yet": of two concurrent cancels (or a
        // cancel racing the hold sweep) only one modifies the document, and only
        // that one releases the seats. The same condition stops a status change
        // from reopening a booking that was cancelled after we read it.
        const result = await BookingCollection.updateOne(
          { _id: id, bookingStatus: { $ne: 'cancelled' } },
          {
            $set: { bookingStatus: status },
            $push: { statusHistory: historyEntry(status, 'Booking status updated by admin') },
            ...(status === 'cancelled' ? { $unset: { holdExpiresAt: '' } } : {}),
          }
        );
        if (result.modifiedCount === 1) {
          if (status === 'cancelled') await releaseSeats(booking.planId, booking.ticketCount);
        } else if (status !== 'cancelled') {
          // Cancelled between our read and the update.
          return reopenError();
        }
        // Cancelling an already-cancelled booking is an idempotent no-op.
        res.json({ success: true, booking: await BookingCollection.findOne({ _id: id }) });
      } catch (err) {
        console.error('Update booking status error:', err);
        res.status(500).json({ success: false, message: 'Error updating booking status' });
      }
    },
  };
};

module.exports.createHoldHelpers = createHoldHelpers;
module.exports.HOLD_MINUTES = HOLD_MINUTES;
