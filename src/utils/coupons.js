// Coupon rules shared by the coupons API and booking creation.
const COUPON_CODE = /^[A-Z0-9_-]{3,30}$/;
const COUPON_TYPES = ['percent', 'flat'];

const normalizeCode = (val) => String(val ?? '').trim().toUpperCase();

// Today's date (YYYY-MM-DD) in Bangladesh; coupon dates are Dhaka dates.
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const todayInDhaka = () => new Date(Date.now() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);

// Taka off `subtotal`: never more than the subtotal itself.
const couponDiscount = (coupon, subtotal) => {
  let discount = coupon.type === 'percent'
    ? Math.floor((subtotal * coupon.value) / 100)
    : coupon.value;
  if (coupon.type === 'percent' && coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  return Math.max(0, Math.min(Math.round(discount), subtotal));
};

// Why `coupon` cannot be used on this booking, or null when it can.
// usesByUser: this user's live (not cancelled) bookings with the coupon.
const couponProblem = (coupon, { planId, subtotal, usesByUser }) => {
  const today = todayInDhaka();
  if (!coupon || coupon.active === false) return 'This coupon code is not valid';
  if (coupon.startsAt && today < coupon.startsAt) return 'This coupon is not active yet';
  if (coupon.expiresAt && today > coupon.expiresAt) return 'This coupon has expired';
  if (coupon.usageLimit > 0 && (coupon.usedCount || 0) >= coupon.usageLimit) return 'This coupon has been fully used';
  if (coupon.perUserLimit > 0 && usesByUser >= coupon.perUserLimit) return 'You have already used this coupon';
  if (Array.isArray(coupon.planIds) && coupon.planIds.length && !coupon.planIds.some((id) => String(id) === String(planId))) {
    return 'This coupon cannot be used for this plan';
  }
  if (coupon.minAmount > 0 && subtotal < coupon.minAmount) {
    return `This coupon needs a booking of at least ৳${coupon.minAmount.toLocaleString('en-US')}`;
  }
  return null;
};

module.exports = { COUPON_CODE, COUPON_TYPES, normalizeCode, couponDiscount, couponProblem };
