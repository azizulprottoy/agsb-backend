const { trackEvent } = require('../utils/ccEvents');

// A booking/order whose payment hold ran out and was cancelled by the sweep:
// a lost sale worth a follow-up. Credited to the traveller who made it.

function bookingHoldExpired(booking) {
  if (!booking?.userId) return;
  trackEvent({
    externalId: String(booking.userId),
    event: 'booking_expired',
    properties: {
      actorType: 'user',
      bookingId: String(booking._id),
      referenceCode: booking.referenceCode,
      planTitle: booking.planTitle_en,
      planSlug: booking.planSlug,
      ticketCount: booking.ticketCount,
      totalAmount: Number(booking.totalAmount) || undefined,
      reason: 'payment_hold_expired',
    },
  });
}

function orderHoldExpired(order) {
  if (!order?.userId) return;
  trackEvent({
    externalId: String(order.userId),
    event: 'order_expired',
    properties: {
      actorType: 'user',
      orderId: String(order._id),
      referenceCode: order.referenceCode,
      itemsCount: order.items?.length || 0,
      products: (order.items || []).map((i) => i.name).filter(Boolean).join(', ').slice(0, 300),
      totalAmount: Number(order.totalAmount) || undefined,
      reason: 'payment_hold_expired',
    },
  });
}

module.exports = { bookingHoldExpired, orderHoldExpired };
