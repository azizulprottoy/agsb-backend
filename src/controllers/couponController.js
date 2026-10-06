const { ObjectId } = require('mongodb');
const { httpError } = require('../utils/http');
const { refIdArray, requireId } = require('../utils/ids');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');
const { COUPON_CODE, COUPON_TYPES, normalizeCode, couponDiscount, couponProblem } = require('../utils/coupons');

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const couponCode = (val) => {
  if (val === undefined) return undefined;
  const code = normalizeCode(val);
  if (!COUPON_CODE.test(code)) throw httpError(400, 'Code must be 3-30 characters: letters, digits, - or _');
  return code;
};

const wholeAmount = (val, field) => {
  if (val === undefined) return undefined;
  if (val === '' || val === null) return 0;
  const n = Number(val);
  if (!Number.isFinite(n) || n < 0) throw httpError(400, `${field} must be 0 or more`);
  return Math.round(n);
};

const dateOrBlank = (val, field) => {
  if (val === undefined) return undefined;
  const date = String(val ?? '').trim().slice(0, 10);
  if (date && !DATE.test(date)) throw httpError(400, `${field} must be a date (YYYY-MM-DD)`);
  return date;
};

const buildCouponData = (body) => ({
  code: couponCode(body.code),
  description: String(body.description ?? '').trim().slice(0, 200),
  type: COUPON_TYPES.includes(body.type) ? body.type : undefined,
  value: wholeAmount(body.value, 'Value'),
  maxDiscount: wholeAmount(body.maxDiscount, 'Max discount'),
  minAmount: wholeAmount(body.minAmount, 'Minimum booking amount'),
  startsAt: dateOrBlank(body.startsAt, 'Start date'),
  expiresAt: dateOrBlank(body.expiresAt, 'Expiry date'),
  usageLimit: wholeAmount(body.usageLimit, 'Usage limit'),
  perUserLimit: wholeAmount(body.perUserLimit, 'Per-user limit'),
  planIds: body.planIds === undefined ? undefined : refIdArray(body.planIds, 'plan'),
  active: body.active === undefined ? true : body.active === true || body.active === 'true',
});

// The whole coupon after an add/edit must make sense together.
const assertConsistent = (coupon) => {
  if (!coupon.code) throw httpError(400, 'Code is required');
  if (!COUPON_TYPES.includes(coupon.type)) throw httpError(400, 'Type must be percent or flat');
  if (!(coupon.value > 0)) throw httpError(400, 'Value must be more than 0');
  if (coupon.type === 'percent' && coupon.value > 100) throw httpError(400, 'A percent discount cannot be more than 100');
  if (coupon.startsAt && coupon.expiresAt && coupon.expiresAt < coupon.startsAt) {
    throw httpError(400, 'Expiry date must be on or after the start date');
  }
};

module.exports = ({ CouponCollection, BookingCollection, TravelPlanCollection }) => ({
  getCoupons: async (req, res) => {
    res.json(await CouponCollection.find().sort({ _id: -1 }).toArray());
  },

  addCoupon: async (req, res) => {
    const data = buildCouponData(req.body);
    // Unsent fields are left out; one use per traveller unless set otherwise.
    const coupon = { perUserLimit: 1, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)), usedCount: 0 };
    assertConsistent(coupon);
    res.json(insertResponse(await CouponCollection.insertOne({ ...coupon, createdAt: new Date().toISOString() })));
  },

  // Only the fields present in the body are changed. usedCount is never set here.
  editCoupon: async (req, res) => {
    const data = pickPresent(buildCouponData(req.body), req.body);
    if ('type' in req.body && !data.type) throw httpError(400, 'Type must be percent or flat');
    const existing = await CouponCollection.findOne({ _id: requireId(req.params.id) });
    if (existing) assertConsistent({ ...existing, ...data });
    await updateById(CouponCollection, req.params.id, data, 'Coupon');
    res.json({ success: true, message: 'Coupon updated' });
  },

  deleteCoupon: async (req, res) => {
    res.json(await deleteById(CouponCollection, req.params.id, 'Coupon'));
  },

  // Signed-in traveller previews a code at checkout. Nothing is reserved here;
  // booking creation checks the coupon again.
  // Body: { code, planSlug, ticketCount } -> { success, code, discount, subtotal, totalAmount }
  checkCoupon: async (req, res) => {
    const code = normalizeCode(req.body.code);
    if (!COUPON_CODE.test(code)) throw httpError(400, 'Enter a valid coupon code');
    const planSlug = typeof req.body.planSlug === 'string' ? req.body.planSlug.trim() : '';
    const ticketCount = Number(req.body.ticketCount);
    if (!Number.isInteger(ticketCount) || ticketCount < 1) throw httpError(400, 'Invalid ticket count');

    const [coupon, plan] = await Promise.all([
      CouponCollection.findOne({ code }),
      planSlug ? TravelPlanCollection.findOne({ slug: planSlug }, { projection: { price: 1 } }) : null,
    ]);
    if (!plan || !(plan.price > 0)) throw httpError(404, 'Travel plan not found');
    const subtotal = plan.price * ticketCount;
    const usesByUser = coupon ? await BookingCollection.countDocuments({
      userId: new ObjectId(req.user.userId), 'coupon.couponId': coupon._id, bookingStatus: { $ne: 'cancelled' },
    }) : 0;
    const problem = couponProblem(coupon, { planId: plan._id, subtotal, usesByUser });
    if (problem) throw httpError(400, problem);

    const discount = couponDiscount(coupon, subtotal);
    res.json({ success: true, code, description: coupon.description || '', discount, subtotal, totalAmount: subtotal - discount });
  },
});
