// Bangladeshi mobile number: 01XXXXXXXXX, optionally prefixed with 880 / +880.
// Strip spaces and dashes before testing (see normalizePhone).
const BD_PHONE = /^(?:\+?880|0)1[3-9]\d{8}$/;

const normalizePhone = (value) => String(value ?? '').replace(/[\s-]/g, '');

const CONTACT_LIMITS = { name: 100, phone: 20, district: 100, purpose: 100, message: 2000 };
const CONTACT_STATUSES = ['new', 'read', 'resolved'];

// Returns { value } with cleaned fields, or { error } with a user-facing message.
// Over-long fields are rejected (not silently truncated) so nothing is lost unseen.
const validateContact = (body = {}) => {
  // Only primitives are accepted; objects/arrays become '' (so "[object Object]" is never stored).
  const str = (v) => (v === undefined || v === null || typeof v === 'object' ? '' : String(v).trim());
  const value = {
    name: str(body.name),
    phone: typeof body.phone === 'object' ? '' : normalizePhone(body.phone),
    district: str(body.district),
    purpose: str(body.purpose) || 'general',
    message: str(body.message),
  };

  if (!value.name || !value.phone || !value.message) {
    return { error: 'Name, phone and message are required' };
  }
  for (const [field, max] of Object.entries(CONTACT_LIMITS)) {
    if (value[field].length > max) {
      return { error: `${field[0].toUpperCase()}${field.slice(1)} must be at most ${max} characters` };
    }
  }
  if (!BD_PHONE.test(value.phone)) {
    return { error: 'Enter a valid Bangladeshi phone number' };
  }
  return { value };
};

module.exports = { BD_PHONE, normalizePhone, CONTACT_LIMITS, CONTACT_STATUSES, validateContact };
