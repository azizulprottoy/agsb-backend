// Which CC Events event each /api route produces. Keyed by "METHOD /path"
// exactly as registered in src/routes (without the /api prefix). A route
// without a rule sends nothing.
//
// Rule fields:
//   event     event name
//   actor     user | admin | public — who calls it
//   id        (req, body) => id of the acting user when it isn't req.user (signup/login)
//   props     async (req, body, ctx) => properties; return null to skip
//   identify  (req, body) => { externalId, traits } — contact details/traits for CC Events
//   extra     async (req, body, ctx) => [{ event, properties, externalId?, actorType? } | { identify }]
//   onFailure { event, props? } — also record 4xx responses (failed logins, locked frames...)
//   noisy     list fetches the website makes on every page; only sent when
//             CC_EVENTS_TRACK_ALL_READS=true (they still count toward visits)
//   allowRedirect  treat a 3xx as success (file downloads)
//
// `body` is the JSON the route responded with. ctx.catalog resolves plans,
// products, districts... to names; ctx.collections gives DB access.

const {
  BOOKING_PAYMENT_EVENTS,
  BOOKING_STATUS_EVENTS,
  ORDER_PAYMENT_EVENTS,
  ORDER_STATUS_EVENTS,
  findBooking,
  findOrder,
  bookingSummary,
  orderSummary,
  profileUpdate,
  forUser,
} = require('./journey');

const reqBody = (req) => req.body || {};
const num = (v) => (v === undefined || v === null || v === '' ? undefined : Number(v));
const parseJson = (v) => {
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return undefined;
  }
};
const publicList = (event) => ({ event, actor: 'public', noisy: true });
const adminEvent = (event, props) => ({ event, actor: 'admin', ...(props ? { props } : {}) });

// Create / update / delete for an admin-managed collection.
function adminCrud(path, entity, createProps) {
  return {
    [`POST ${path}`]: adminEvent(`${entity}_created`, (req, body) => ({
      [`${entity}Id`]: body.insertedId ? String(body.insertedId) : undefined,
      ...(createProps ? createProps(reqBody(req)) : {}),
    })),
    [`PUT ${path}/:id`]: adminEvent(`${entity}_updated`, (req) => ({ [`${entity}Id`]: req.params.id })),
    [`DELETE ${path}/:id`]: adminEvent(`${entity}_deleted`, (req) => ({ [`${entity}Id`]: req.params.id })),
  };
}

const userTraits = (user) => user && {
  name: user.name,
  email: user.email,
  phone: user.phone,
  homeDistrict: user.district,
  membershipPlan: user.plan,
  visitedDistrictsCount: Array.isArray(user.visitedDistricts) ? user.visitedDistricts.length : undefined,
};

module.exports = {
  // ── Auth ─────────────────────────────────────────────────────────────
  'POST /auth/admin/login': {
    event: 'admin_logged_in',
    actor: 'admin',
    id: (req, body) => body.user?.id && `admin:${body.user.id}`,
    onFailure: { event: 'admin_login_failed' },
  },
  'POST /auth/signup': {
    event: 'signed_up',
    actor: 'user',
    id: (req, body) => body.user?.id,
    props: async (req, body, { catalog }) => ({
      membershipPlan: body.user?.plan,
      ...(await catalog.districtInfo(body.user?.district)),
    }),
    identify: (req, body) => body.user && { externalId: body.user.id, traits: { ...userTraits(body.user), joinedAt: body.user.joined } },
    onFailure: { event: 'signup_failed' },
  },
  'POST /auth/login': {
    event: 'logged_in',
    actor: 'user',
    id: (req, body) => body.user?.id,
    props: (req, body) => ({ membershipPlan: body.user?.plan }),
    identify: (req, body) => body.user && { externalId: body.user.id, traits: userTraits(body.user) },
    onFailure: { event: 'login_failed' },
  },
  'GET /auth/me': { event: 'session_checked', actor: 'user', noisy: true },
  'POST /auth/logout-all': { event: 'logged_out_all_devices', actor: 'user' },
  'POST /auth/change-password': { event: 'password_changed', actor: 'user', onFailure: { event: 'password_change_failed' } },

  // ── Profile & users ──────────────────────────────────────────────────
  'GET /profile': { event: 'profile_loaded', actor: 'user', noisy: true },
  'PATCH /profile': {
    event: 'profile_updated',
    actor: 'user',
    props: (req) => ({
      fieldsChanged: Object.keys(reqBody(req)).join(','),
      visitedDistrictsCount: Array.isArray(reqBody(req).visitedDistricts) ? reqBody(req).visitedDistricts.length : undefined,
    }),
    identify: (req, body) => body.user && req.user && { externalId: req.user.userId, traits: userTraits(body.user) },
  },
  'GET /users': adminEvent('users_listed', (req) => ({ search: req.query.q || undefined })),

  // ── Admin dashboard ──────────────────────────────────────────────────
  'GET /dashboard': adminEvent('admin_dashboard_viewed'),

  // ── Divisions & districts ────────────────────────────────────────────
  'GET /divisions': publicList('divisions_listed'),
  ...adminCrud('/divisions', 'division', (b) => ({ divisionName: b.name_en })),
  'GET /districts': publicList('districts_listed'),
  'GET /districts/:slug': {
    event: 'district_viewed',
    actor: 'public',
    props: (req, body, { catalog }) => (body._id ? catalog.districtFields(body) : null),
  },
  ...adminCrud('/districts', 'district', (b) => ({ districtName: b.name_en })),

  // ── Blog ─────────────────────────────────────────────────────────────
  'GET /blog': publicList('blog_listed'),
  'GET /blog/:slug': {
    event: 'blog_post_viewed',
    actor: 'public',
    props: async (req, body, { catalog }) => body._id && {
      blogTitle: body.title_en,
      blogSlug: body.slug,
      blogCategory: body.category,
      ...(await catalog.districtInfo(body.districtSlug)),
    },
  },
  ...adminCrud('/blog', 'blog_post', (b) => ({ blogTitle: b.title_en, blogCategory: b.category })),

  // ── Travel plans ─────────────────────────────────────────────────────
  'GET /plans': publicList('plans_listed'),
  'GET /plans/:slug': {
    event: 'plan_viewed',
    actor: 'public',
    props: (req, body, { catalog }) => body._id && {
      ...catalog.planFields(body),
      status: body.status,
      seatsLeft: body.seats_available,
    },
  },
  ...adminCrud('/plans', 'plan', (b) => ({ planTitle: b.title_en, price: num(b.price), status: b.status })),

  // ── Partners, membership, frames ─────────────────────────────────────
  'GET /partners': publicList('partners_listed'),
  ...adminCrud('/partners', 'partner', (b) => ({ partnerName: b.name, partnerType: b.type, districtName: b.district })),
  'GET /membership-plans': { event: 'membership_plans_viewed', actor: 'public' },
  ...adminCrud('/membership-plans', 'membership_plan', (b) => ({ membershipPlan: b.name, price: num(b.price), period: b.period })),
  'GET /frames': { event: 'frames_viewed', actor: 'public' },
  'GET /frames/:id/download': {
    event: 'frame_downloaded',
    actor: 'public',
    allowRedirect: true,
    props: async (req, body, { collections, catalog }) => frameProps(req.params.id, collections, catalog),
    // A premium frame refused to a signed-out or free user: an upgrade lead.
    onFailure: {
      event: 'premium_frame_blocked',
      props: async (req, body, { collections, catalog }) => frameProps(req.params.id, collections, catalog),
    },
  },
  ...adminCrud('/frames', 'frame', (b) => ({ frameName: b.name, premium: String(b.premium) === 'true' })),

  // ── Contact ──────────────────────────────────────────────────────────
  'POST /contact': {
    event: 'contact_message_sent',
    actor: 'public',
    props: async (req, body, { catalog }) => ({
      purpose: reqBody(req).purpose || 'general',
      ...(await catalog.districtInfo(reqBody(req).district)),
    }),
  },
  'GET /contact': adminEvent('contact_messages_listed'),
  'PATCH /contact/:id': adminEvent('contact_message_status_changed', (req) => ({ messageId: req.params.id, status: reqBody(req).status })),
  'DELETE /contact/:id': adminEvent('contact_message_deleted', (req) => ({ messageId: req.params.id })),

  // ── Hotels, transport, guides, agents, checkpoints ───────────────────
  'GET /hotels': { event: 'hotels_viewed', actor: 'public' },
  ...adminCrud('/hotels', 'hotel', (b) => ({ hotelName: b.name, hotelType: b.type, price: num(b.price) })),
  'GET /transports': { event: 'transport_viewed', actor: 'public' },
  ...adminCrud('/transports', 'transport', (b) => ({ transportName: b.name_en, transportType: b.type, fare: num(b.fare) })),
  'GET /guides': { event: 'guides_viewed', actor: 'public' },
  ...adminCrud('/guides', 'guide', (b) => ({ guideName: b.name, pricePerDay: num(b.price_per_day) })),
  'GET /district-agents': { event: 'district_agents_viewed', actor: 'public' },
  ...adminCrud('/district-agents', 'district_agent', (b) => ({ agentName: b.name })),
  'GET /checkpoints': { event: 'checkpoints_viewed', actor: 'public' },
  ...adminCrud('/checkpoints', 'checkpoint', (b) => ({ checkpointName: b.name_en, checkpointType: b.type })),

  'POST /uploadrichtextimage': adminEvent('editor_image_uploaded'),

  // ── Bookings ─────────────────────────────────────────────────────────
  'POST /bookings': {
    event: 'booking_created',
    actor: 'user',
    // The response only has the id; the booking itself has the details.
    props: async (req, body, { collections, catalog }) => {
      const booking = body.bookingId && (await findBooking(collections, body.bookingId));
      if (!booking) return null;
      return {
        ...(await catalog.planInfo(booking.planId)),
        ...bookingSummary(booking),
        travellersCount: Array.isArray(reqBody(req).travellers) ? reqBody(req).travellers.length : undefined,
        holdExpiresAt: body.holdExpiresAt,
      };
    },
    extra: async (req, body, { collections, catalog }) => {
      const booking = body.bookingId && (await findBooking(collections, body.bookingId));
      if (!booking) return [];
      const events = [];
      if (booking.coupon?.code) {
        events.push({ event: 'coupon_redeemed', properties: { couponCode: booking.coupon.code, discount: num(booking.discountAmount), planTitle: booking.planTitle_en, bookingId: String(booking._id) } });
      }
      // This booking took the plan's last seat.
      const plan = await collections.TravelPlanCollection.findOne({ _id: booking.planId }, { projection: { status: 1, seats_available: 1 } });
      if (plan?.status === 'full') {
        events.push({ event: 'plan_sold_out', externalId: 'system', actorType: 'system', properties: { ...(await catalog.planInfo(booking.planId)), lastBookingId: String(booking._id) } });
      }
      return [...events, ...(await profileUpdate(collections, booking.userId))];
    },
    onFailure: {
      event: 'booking_failed',
      props: (req) => ({ planSlug: reqBody(req).planSlug, ticketCount: num(reqBody(req).ticketCount), couponCode: reqBody(req).couponCode }),
    },
  },
  'GET /bookings/my': { event: 'my_bookings_viewed', actor: 'user' },
  'GET /bookings': adminEvent('bookings_listed', (req) => ({
    paymentStatus: req.query.paymentStatus,
    bookingStatus: req.query.bookingStatus,
    search: req.query.q || undefined,
  })),
  'GET /bookings/:id': {
    event: 'booking_viewed',
    actor: 'user',
    props: (req, body) => (body._id ? bookingSummary(body) : null),
  },
  'PUT /bookings/:id/payment': {
    event: 'booking_payment_submitted',
    actor: 'user',
    props: async (req, body, { collections }) => {
      const booking = await findBooking(collections, req.params.id);
      return booking ? { ...bookingSummary(booking), paymentMethod: booking.payment?.method } : { bookingId: req.params.id };
    },
    // 409 here means the seat hold had already expired.
    onFailure: { event: 'booking_payment_rejected', props: (req) => ({ bookingId: req.params.id }) },
  },
  'PATCH /bookings/:id/payment-status': {
    ...adminEvent('booking_payment_reviewed', (req, body) => ({ bookingId: req.params.id, paymentStatus: body.booking?.paymentStatus })),
    extra: async (req, body, { collections }) => {
      const booking = body.booking;
      const event = booking && BOOKING_PAYMENT_EVENTS[booking.paymentStatus];
      if (!event || !booking.userId) return [];
      return [forUser(booking, event, bookingSummary(booking)), ...(await profileUpdate(collections, booking.userId))];
    },
  },
  'PATCH /bookings/:id/status': {
    ...adminEvent('booking_status_changed', (req, body) => ({ bookingId: req.params.id, bookingStatus: body.booking?.bookingStatus })),
    extra: async (req, body, { collections, catalog }) => {
      const booking = body.booking;
      const event = booking && BOOKING_STATUS_EVENTS[booking.bookingStatus];
      if (!event || !booking.userId) return [];
      return [
        forUser(booking, event, {
          ...(await catalog.planInfo(booking.planId)),
          ...bookingSummary(booking),
          ...(booking.bookingStatus === 'completed' ? { revenue: num(booking.paidAmount) } : {}),
        }),
        ...(await profileUpdate(collections, booking.userId)),
      ];
    },
  },

  // ── Payment methods, socials, coupons ────────────────────────────────
  'GET /payment-methods': publicList('payment_methods_listed'),
  'GET /payment-methods/admin': adminEvent('payment_methods_admin_listed'),
  ...adminCrud('/payment-methods', 'payment_method', (b) => ({ method: b.method })),
  'GET /socials': publicList('social_links_listed'),
  'GET /socials/admin': adminEvent('social_links_admin_listed'),
  ...adminCrud('/socials', 'social_link', (b) => ({ platform: b.platform })),
  'POST /coupons/check': {
    event: 'coupon_checked',
    actor: 'user',
    props: async (req, body, { catalog }) => ({
      couponCode: String(reqBody(req).code || '').toUpperCase(),
      discount: num(body.discount),
      ticketCount: num(reqBody(req).ticketCount),
      ...(await catalog.planInfo(reqBody(req).planSlug)),
    }),
    onFailure: {
      event: 'coupon_check_failed',
      props: (req) => ({ couponCode: String(reqBody(req).code || '').toUpperCase(), planSlug: reqBody(req).planSlug }),
    },
  },
  'GET /coupons': adminEvent('coupons_listed'),
  ...adminCrud('/coupons', 'coupon', (b) => ({ couponCode: b.code, couponType: b.type, value: num(b.value) })),

  // ── Attractions ──────────────────────────────────────────────────────
  // With ?district= this is a district page loading its attractions.
  'GET /attractions': publicList('attractions_listed'),
  'GET /attractions/:slug': {
    event: 'attraction_viewed',
    actor: 'public',
    props: async (req, body, { catalog }) => body._id && {
      attractionId: String(body._id),
      attractionName: body.name,
      attractionType: body.type,
      ...(await catalog.districtInfo(body.district_slug || body.district_id)),
    },
  },
  ...adminCrud('/attractions', 'attraction', (b) => ({ attractionName: b.name, attractionType: b.type })),

  // ── Shop: categories, products, orders ───────────────────────────────
  'GET /product-categories': publicList('product_categories_listed'),
  ...adminCrud('/product-categories', 'product_category', (b) => ({ categoryName: b.name })),
  // A search or category filter is worth recording; the plain catalog load is not.
  'GET /products': {
    event: 'products_browsed',
    actor: 'public',
    props: (req, body) => {
      const { q, category, mode, featured } = req.query;
      if (!q && !category && !mode) return null;
      return {
        search: q ? String(q).toLowerCase() : undefined,
        category,
        mode,
        featured,
        resultsCount: Array.isArray(body) ? body.length : undefined,
      };
    },
  },
  'GET /products/admin': adminEvent('products_admin_listed'),
  'GET /products/:slug': {
    event: 'product_viewed',
    actor: 'public',
    props: async (req, body, { catalog }) => body._id && {
      ...(await catalog.productFields(body)),
      salePrice: num(body.salePrice),
      rentPerDay: num(body.rentPerDay),
    },
  },
  ...adminCrud('/products', 'product', (b) => ({ productName: b.name, salePrice: num(b.salePrice), rentPerDay: num(b.rentPerDay) })),

  'POST /orders': {
    event: 'order_placed',
    actor: 'user',
    props: async (req, body, { collections }) => {
      const order = body.orderId && (await findOrder(collections, body.orderId));
      return order ? { ...orderSummary(order), holdExpiresAt: body.holdExpiresAt } : null;
    },
    // One event per line so products and categories can be ranked by sales/rentals.
    extra: async (req, body, { collections, catalog }) => {
      const order = body.orderId && (await findOrder(collections, body.orderId));
      if (!order) return [];
      const lines = await Promise.all((order.items || []).map(async (item) => ({
        event: item.kind === 'rent' ? 'product_rented' : 'product_purchased',
        properties: {
          ...(await catalog.productInfo(item.productId)),
          productName: item.name,
          orderId: String(order._id),
          quantity: item.qty,
          unitPrice: num(item.unitPrice),
          lineTotal: num(item.lineTotal),
          kind: item.kind,
        },
      })));
      return [...lines, ...(await profileUpdate(collections, order.userId))];
    },
    onFailure: { event: 'order_failed', props: (req) => ({ itemsCount: Array.isArray(reqBody(req).items) ? reqBody(req).items.length : undefined }) },
  },
  'GET /orders/my': { event: 'my_orders_viewed', actor: 'user' },
  'GET /orders': adminEvent('orders_listed', (req) => ({
    paymentStatus: req.query.paymentStatus,
    orderStatus: req.query.orderStatus,
    search: req.query.q || undefined,
  })),
  'GET /orders/:id': {
    event: 'order_viewed',
    actor: 'user',
    props: (req, body) => (body._id ? orderSummary(body) : null),
  },
  'PUT /orders/:id/payment': {
    event: 'order_payment_submitted',
    actor: 'user',
    props: async (req, body, { collections }) => {
      const order = await findOrder(collections, req.params.id);
      return order ? { ...orderSummary(order), paymentMethod: order.payment?.method } : { orderId: req.params.id };
    },
    onFailure: { event: 'order_payment_rejected', props: (req) => ({ orderId: req.params.id }) },
  },
  'PATCH /orders/:id/payment-status': {
    ...adminEvent('order_payment_reviewed', (req, body) => ({ orderId: req.params.id, paymentStatus: body.order?.paymentStatus })),
    extra: async (req, body, { collections }) => {
      const order = body.order;
      const event = order && ORDER_PAYMENT_EVENTS[order.paymentStatus];
      if (!event || !order.userId) return [];
      return [forUser(order, event, orderSummary(order)), ...(await profileUpdate(collections, order.userId))];
    },
  },
  'PATCH /orders/:id/status': {
    ...adminEvent('order_status_changed', (req, body) => ({ orderId: req.params.id, orderStatus: body.order?.orderStatus })),
    extra: async (req, body, { collections }) => {
      const order = body.order;
      const event = order && ORDER_STATUS_EVENTS[order.orderStatus];
      if (!event || !order.userId) return [];
      return [
        forUser(order, event, {
          ...orderSummary(order),
          ...(order.orderStatus === 'completed' ? { revenue: num(order.paidAmount) } : {}),
        }),
        ...(await profileUpdate(collections, order.userId)),
      ];
    },
  },

  // ── Reviews & comments ───────────────────────────────────────────────
  'GET /reviews/admin': adminEvent('feedback_listed', (req) => ({ kind: req.query.kind, targetType: req.query.targetType })),
  'PATCH /reviews/:id': adminEvent('feedback_visibility_changed', (req) => ({ feedbackId: req.params.id, status: reqBody(req).status })),
  // Loaded by every plan/product/blog detail page.
  'GET /reviews/:type/:target': { event: 'feedback_viewed', actor: 'public', noisy: true },
  'POST /reviews/:type/:target': {
    event: 'review_posted',
    actor: 'user',
    props: async (req, body, { catalog }) => {
      const kind = body.entry?.kind || reqBody(req).kind;
      return {
        kind,
        targetType: req.params.type,
        ...(await catalog.targetInfo(req.params.type, req.params.target)),
        rating: kind === 'review' ? num(reqBody(req).rating) : undefined,
        verified: body.entry?.verified,
        length: String(reqBody(req).body || '').length,
      };
    },
    // 403 for plan/product reviews means "only after a completed trip/order".
    onFailure: {
      event: 'review_rejected',
      props: (req) => ({ targetType: req.params.type, target: req.params.target, kind: reqBody(req).kind }),
    },
  },
  'DELETE /reviews/:id': { event: 'review_deleted', actor: 'user', props: (req) => ({ feedbackId: req.params.id }) },
};

// Frame download details (the route streams a file, so there's no JSON).
async function frameProps(frameId, collections, catalog) {
  const { ObjectId } = require('mongodb');
  if (!ObjectId.isValid(String(frameId))) return { frameId };
  const frame = await collections.FrameCollection.findOne({ _id: new ObjectId(String(frameId)) }, { projection: { name: 1, premium: 1, districtSlug: 1 } });
  if (!frame) return { frameId };
  return {
    frameId: String(frame._id),
    frameName: frame.name,
    premium: Boolean(frame.premium),
    ...(await catalog.districtInfo(frame.districtSlug)),
  };
}
