// Shared list handling for admin endpoints.
//
// Contract:
// - ?page (1-based) present -> { items, total, page, limit, pages }
// - ?page absent            -> plain array (legacy shape), capped at LEGACY_CAP newest docs
// - ?limit defaults to DEFAULT_LIMIT, max MAX_LIMIT
// - ?q is an optional case-insensitive substring search over the given fields
// Results are sorted newest first (createdAt desc, then _id desc).

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const LEGACY_CAP = 500;
const MAX_QUERY_LENGTH = 100;

const SORT = { createdAt: -1, _id: -1 };

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toPositiveInt = (value, fallback) => {
  const n = Number.parseInt(String(value), 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};

// Parse page/limit/q from the query string.
const parseListQuery = (query = {}) => {
  const paged = query.page !== undefined && query.page !== '';
  const page = toPositiveInt(query.page, 1);
  const limit = Math.min(toPositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  const raw = typeof query.q === 'string' ? query.q : Array.isArray(query.q) ? String(query.q[0] ?? '') : '';
  const q = raw.trim().slice(0, MAX_QUERY_LENGTH);
  return { paged, page, limit, q };
};

// Build a Mongo $or filter matching q in any of the fields (or {} when q is empty).
const buildSearchFilter = (q, fields) => {
  if (!q) return {};
  const regex = new RegExp(escapeRegex(q), 'i');
  return { $or: fields.map((field) => ({ [field]: regex })) };
};

// Run a list query and send the response in the paged or legacy shape.
// options: { filter, searchFields, projection }
const sendList = async (req, res, collection, { filter = {}, searchFields = [], projection } = {}) => {
  const { paged, page, limit, q } = parseListQuery(req.query);
  const search = buildSearchFilter(q, searchFields);
  const parts = [filter, search].filter((f) => Object.keys(f).length);
  const finalFilter = parts.length > 1 ? { $and: parts } : parts[0] || {};
  const findOptions = projection ? { projection } : {};

  if (!paged) {
    const items = await collection.find(finalFilter, findOptions).sort(SORT).limit(LEGACY_CAP).toArray();
    return res.json(items);
  }

  const [items, total] = await Promise.all([
    collection.find(finalFilter, findOptions).sort(SORT).skip((page - 1) * limit).limit(limit).toArray(),
    collection.countDocuments(finalFilter),
  ]);
  res.json({ items, total, page, limit, pages: Math.ceil(total / limit) });
};

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  LEGACY_CAP,
  escapeRegex,
  parseListQuery,
  buildSearchFilter,
  sendList,
};
