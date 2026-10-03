const { BD_PHONE, normalizePhone } = require('./contactValidation');

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 200;
const MAX_NAME_LENGTH = 100;
const MAX_DISTRICT_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_VISITED_DISTRICTS = 64;
const DISTRICT_SLUG = /^[a-z0-9-]{1,60}$/;
// Pragmatic format check: something@something.tld, no spaces.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Each validator returns { value } (cleaned) or { error } (user-facing message).

const validateName = (name) => {
  if (typeof name !== 'string' || !name.trim()) return { error: 'Name is required' };
  const value = name.trim();
  if (value.length > MAX_NAME_LENGTH) return { error: `Name must be at most ${MAX_NAME_LENGTH} characters` };
  return { value };
};

const validateEmail = (email) => {
  const value = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!value || value.length > MAX_EMAIL_LENGTH || !EMAIL.test(value)) {
    return { error: 'Enter a valid email address' };
  }
  return { value };
};

const validateNewPassword = (password) => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return { error: `Password must be at most ${MAX_PASSWORD_LENGTH} characters` };
  }
  return { value: password };
};

// Optional phone: undefined/null/'' -> '' (no phone); otherwise a valid BD mobile number.
const validateOptionalPhone = (phone) => {
  if (phone === undefined || phone === null) return { value: '' };
  if (typeof phone !== 'string') return { error: 'Enter a valid Bangladeshi phone number' };
  const value = normalizePhone(phone);
  if (!value) return { value: '' };
  if (!BD_PHONE.test(value)) return { error: 'Enter a valid Bangladeshi phone number' };
  return { value };
};

const validateOptionalDistrict = (district) => {
  if (district === undefined || district === null) return { value: '' };
  if (typeof district !== 'string') return { error: 'District must be text' };
  const value = district.trim();
  if (value.length > MAX_DISTRICT_LENGTH) return { error: `District must be at most ${MAX_DISTRICT_LENGTH} characters` };
  return { value };
};

const validateVisitedDistricts = (list) => {
  if (!Array.isArray(list)) return { error: 'visitedDistricts must be an array' };
  if (list.length > MAX_VISITED_DISTRICTS) {
    return { error: `visitedDistricts can have at most ${MAX_VISITED_DISTRICTS} entries` };
  }
  if (!list.every((s) => typeof s === 'string' && DISTRICT_SLUG.test(s))) {
    return { error: 'visitedDistricts must contain district slugs' };
  }
  if (new Set(list).size !== list.length) return { error: 'visitedDistricts must not contain duplicates' };
  return { value: list };
};

module.exports = {
  MIN_PASSWORD_LENGTH,
  MAX_VISITED_DISTRICTS,
  DISTRICT_SLUG,
  validateName,
  validateEmail,
  validateNewPassword,
  validateOptionalPhone,
  validateOptionalDistrict,
  validateVisitedDistricts,
};
