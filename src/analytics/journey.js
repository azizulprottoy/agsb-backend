const { ObjectId } = require('mongodb');

// Booking and shop-order events credited to the traveller they concern (not
// to whoever made the request), plus traveller value traits for segmentation.

const BOOKING_PAYMENT_EVENTS = {
  advance_paid: 'booking_advance_paid',
  paid_full: 'booking_paid_full',
  failed: 'booking_payment_failed',
};
const BOOKING_STATUS_EVENTS = {
  confirmed: 'booking_confirmed',
  cancelled: 'booking_cancelled',
  completed: 'trip_completed',
};
const ORDER_PAYMENT_EVENTS = {
  advance_paid: 'order_advance_paid',
  paid_full: 'order_paid_full',
  failed: 'order_payment_failed',
};
const ORDER_STATUS_EVENTS = {
  confirmed: 'order_confirmed',
  shipped: 'order_shipped',
  delivered: 'order_delivered',
  rented_out: 'order_rented_out',
  returned: 'rental_returned',
  completed: 'order_completed',
  cancelled: 'order_cancelled',
};

const asObjectId = (v) => (v && ObjectId.isValid(String(v)) ? new ObjectId(String(v)) : null);
const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));

// By ObjectId or by reference code.
async function findBooking({ BookingCollection }, ref) {
  const id = asObjectId(ref);
  return BookingCollection.findOne(id ? { _id: id } : { referenceCode: String(ref) });
}
async function findOrder({ OrderCollection }, ref) {
  const id = asObjectId(ref);
  return OrderCollection.findOne(id ? { _id: id } : { referenceCode: String(ref) });
}

function bookingSummary(b) {
  return {
    bookingId: String(b._id),
    referenceCode: b.referenceCode,
    planId: b.planId ? String(b.planId) : undefined,
    planTitle: b.planTitle_en,
    planSlug: b.planSlug,
    startDate: b.start_date || undefined,
    ticketCount: b.ticketCount,
    totalAmount: num(b.totalAmount),
    advanceAmount: num(b.advanceAmount),
    paidAmount: num(b.paidAmount),
    couponCode: b.coupon?.code,
    paymentStatus: b.paymentStatus,
    bookingStatus: b.bookingStatus,
  };
}

function orderSummary(o) {
  return {
    orderId: String(o._id),
    referenceCode: o.referenceCode,
    itemsCount: o.items?.length || 0,
    totalAmount: num(o.totalAmount),
    advanceAmount: num(o.advanceAmount),
    paidAmount: num(o.paidAmount),
    fulfilment: o.fulfilment,
    deliveryDistrict: o.contact?.district,
    hasRental: (o.items || []).some((i) => i.kind === 'rent'),
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
  };
}

// Traveller value: bookings, trips, shop orders and money actually paid.
async function travellerProfile({ BookingCollection, OrderCollection }, userId) {
  const id = asObjectId(userId);
  if (!id) return null;
  const group = (statusField, doneValue) => ([
    { $match: { userId: id } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        paid: { $sum: { $toDouble: { $ifNull: ['$paidAmount', 0] } } },
        done: { $sum: { $cond: [{ $eq: [`$${statusField}`, doneValue] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: [`$${statusField}`, 'cancelled'] }, 1, 0] } },
        first: { $min: '$createdAt' },
        last: { $max: '$createdAt' },
      },
    },
  ]);
  const [[b], [o]] = await Promise.all([
    BookingCollection.aggregate(group('bookingStatus', 'completed')).toArray(),
    OrderCollection.aggregate(group('orderStatus', 'completed')).toArray(),
  ]);
  return {
    bookingsCount: b?.count || 0,
    tripsCompleted: b?.done || 0,
    bookingsCancelled: b?.cancelled || 0,
    bookingSpend: Math.round(b?.paid || 0),
    firstBookingAt: b?.first,
    lastBookingAt: b?.last,
    ordersCount: o?.count || 0,
    ordersCompleted: o?.done || 0,
    orderSpend: Math.round(o?.paid || 0),
    lifetimeValue: Math.round((b?.paid || 0) + (o?.paid || 0)),
  };
}

const profileUpdate = async (collections, userId) => {
  const traits = await travellerProfile(collections, userId);
  return traits ? [{ identify: { externalId: String(userId), traits } }] : [];
};

const forUser = (doc, event, properties) => ({
  event,
  externalId: String(doc.userId),
  actorType: 'user',
  properties,
});

module.exports = {
  BOOKING_PAYMENT_EVENTS,
  BOOKING_STATUS_EVENTS,
  ORDER_PAYMENT_EVENTS,
  ORDER_STATUS_EVENTS,
  findBooking,
  findOrder,
  bookingSummary,
  orderSummary,
  travellerProfile,
  profileUpdate,
  forUser,
};
