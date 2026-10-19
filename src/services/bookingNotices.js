// Tells travellers what happened to their booking: an email (from no-reply)
// plus an in-app notification with push. Every function is fire-and-forget:
// call it after the change has been saved, without awaiting it.

const { sendMailQuietly } = require('./mail');
const { notifyUser } = require('./notifications');
const { renderEmail, greet, taka } = require('./emailTemplates');

const formatDhakaTime = (iso) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const payUrl = (b) => `/bookings/${encodeURIComponent(b.referenceCode)}/pay`;
const ticketsUrl = (b) => `/bookings/${encodeURIComponent(b.referenceCode)}/tickets`;

const summary = (b) => [
  ['Booking reference', b.referenceCode],
  ['Tour', b.planTitle_en || b.planTitle_bn],
  ['Trip dates', [b.start_date, b.end_date].filter(Boolean).join(' to ')],
  ['Tickets', b.ticketCount],
  ['Total', b.totalAmount !== undefined ? taka(b.totalAmount) : ''],
  ['Paid', b.paidAmount ? taka(b.paidAmount) : ''],
  ['Due', b.dueAmount !== undefined && b.paidAmount ? taka(b.dueAmount) : ''],
];

// One booking update: email + in-app/push with the same wording.
const send = (booking, { subject, heading, paragraphs, button, footnote, push }) => {
  const tour = booking.planTitle_en || booking.planTitle_bn || 'your tour';
  if (booking.userEmail) {
    sendMailQuietly({
      from: 'no-reply',
      to: booking.userEmail,
      subject: `${subject} · ${booking.referenceCode}`,
      ...renderEmail({ heading, greeting: greet(booking.userName), paragraphs, details: summary(booking), button, footnote }),
    });
  }
  notifyUser(booking.userId, {
    title: push.title,
    message: push.message.replace('{tour}', tour),
    data: { type: 'booking', bookingRef: booking.referenceCode, url: button?.url || ticketsUrl(booking) },
  });
};

const bookingCreated = (booking) => {
  const deadline = formatDhakaTime(booking.holdExpiresAt);
  send(booking, {
    subject: 'Booking received',
    heading: 'Your seats are on hold',
    paragraphs: [
      `Thanks for booking ${booking.planTitle_en || 'with us'}. To confirm it, pay the advance of ${taka(booking.advanceAmount)}${deadline ? ` before ${deadline}` : ''}.`,
      'If the advance is not paid in time, the seats are released for other travellers.',
    ],
    button: { label: 'Pay advance', url: payUrl(booking) },
    push: {
      title: 'Booking received',
      message: `Pay the ${taka(booking.advanceAmount)} advance${deadline ? ` before ${deadline}` : ''} to confirm {tour}.`,
    },
  });
};

const paymentSubmitted = (booking) => {
  const trx = booking.payment?.transactionId;
  send(booking, {
    subject: 'Payment received for verification',
    heading: 'We got your payment details',
    paragraphs: [
      `We received your ${booking.payment?.method || ''} payment${trx ? ` (TrxID ${trx})` : ''} of ${taka(booking.payment?.amount ?? booking.advanceAmount)}. Our team will verify it shortly and confirm your booking.`,
    ],
    button: { label: 'View booking', url: ticketsUrl(booking) },
    push: { title: 'Payment submitted', message: 'We are verifying your payment for {tour}.' },
  });

  // Optional heads-up for the team so payments get verified quickly.
  const alertTo = process.env.MAIL_ADMIN_ALERT_TO;
  if (alertTo) {
    sendMailQuietly({
      from: 'no-reply',
      to: alertTo,
      subject: `Payment to verify · ${booking.referenceCode}`,
      ...renderEmail({
        heading: 'New payment to verify',
        paragraphs: [`${booking.userName || 'A traveller'} submitted a payment. Verify it in the admin panel.`],
        details: [
          ...summary(booking),
          ['Method', booking.payment?.method],
          ['Sender number', booking.payment?.senderNumber],
          ['TrxID', trx],
          ['Amount', taka(booking.payment?.amount)],
        ],
      }),
    });
  }
};

// Admin changed the payment status (see bookingController.updatePaymentStatus).
const paymentStatusChanged = (booking, previous) => {
  const status = booking.paymentStatus;
  if (status === previous.paymentStatus) return;

  if (status === 'advance_paid' || status === 'paid_full') {
    const confirmedNow = previous.bookingStatus === 'pending' && booking.bookingStatus === 'confirmed';
    send(booking, {
      subject: confirmedNow ? 'Booking confirmed' : 'Payment verified',
      heading: confirmedNow ? 'Your booking is confirmed!' : 'Payment verified',
      paragraphs: [
        status === 'paid_full'
          ? 'We verified your payment in full. Nothing more is due.'
          : `We verified your advance payment. The remaining ${taka(booking.dueAmount)} is paid on arrival.`,
        ...(confirmedNow ? ['Your tickets are ready. Show them to the tour guide on the day of the trip.'] : []),
      ],
      button: { label: 'View tickets', url: ticketsUrl(booking) },
      push: {
        title: confirmedNow ? 'Booking confirmed' : 'Payment verified',
        message: confirmedNow ? 'Your seats for {tour} are confirmed. See you there!' : 'Your payment for {tour} was verified.',
      },
    });
    return;
  }

  if ((status === 'failed' || status === 'unpaid') && previous.paymentStatus === 'pending_verification' && booking.bookingStatus === 'pending') {
    const deadline = formatDhakaTime(booking.holdExpiresAt);
    send(booking, {
      subject: 'Payment could not be verified',
      heading: "We couldn't verify your payment",
      paragraphs: [
        `We could not match the payment you submitted${previous.payment?.transactionId ? ` (TrxID ${previous.payment.transactionId})` : ''}. Please check the details and submit the payment again${deadline ? ` before ${deadline}` : ''}, or contact us if you think this is a mistake.`,
      ],
      button: { label: 'Pay again', url: payUrl(booking) },
      push: { title: 'Payment not verified', message: 'Please submit your payment for {tour} again.' },
    });
  }
};

// Admin changed the booking status (see bookingController.updateBookingStatus).
const bookingStatusChanged = (booking, previousStatus) => {
  const status = booking.bookingStatus;
  if (status === previousStatus) return;

  if (status === 'confirmed') {
    send(booking, {
      subject: 'Booking confirmed',
      heading: 'Your booking is confirmed!',
      paragraphs: ['Your seats are confirmed. Show your tickets to the tour guide on the day of the trip.'],
      button: { label: 'View tickets', url: ticketsUrl(booking) },
      push: { title: 'Booking confirmed', message: 'Your seats for {tour} are confirmed. See you there!' },
    });
  } else if (status === 'cancelled') {
    send(booking, {
      subject: 'Booking cancelled',
      heading: 'Your booking was cancelled',
      paragraphs: [
        'Your booking has been cancelled.',
        ...(booking.paidAmount > 0 ? ['If you already paid, our team will contact you about the refund.'] : []),
        'Contact us if you have any questions.',
      ],
      button: { label: 'Contact us', url: '/contact' },
      push: { title: 'Booking cancelled', message: 'Your booking for {tour} was cancelled.' },
    });
  } else if (status === 'completed') {
    send(booking, {
      subject: 'Thanks for travelling with us',
      heading: 'Hope you enjoyed the trip!',
      paragraphs: ['Thanks for travelling with us. We would love to hear how it went: leave a review on the tour page.'],
      button: { label: 'Leave a review', url: booking.planSlug ? `/plans/${encodeURIComponent(booking.planSlug)}` : '/plans' },
      push: { title: 'Trip completed', message: 'Thanks for joining {tour}! Tell us how it went.' },
    });
  }
};

// The hold sweep cancelled an unpaid booking.
const holdExpired = (booking) => {
  send(booking, {
    subject: 'Seat hold expired',
    heading: 'Your seat hold expired',
    paragraphs: [
      'The advance for this booking was not paid in time, so the seats were released.',
      'If seats are still available you can book again.',
    ],
    button: { label: 'Book again', url: booking.planSlug ? `/plans/${encodeURIComponent(booking.planSlug)}` : '/plans' },
    push: { title: 'Seat hold expired', message: 'Your unpaid booking for {tour} was released.' },
  });
};

module.exports = { bookingCreated, paymentSubmitted, paymentStatusChanged, bookingStatusChanged, holdExpired };
