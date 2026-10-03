const { ObjectId } = require('mongodb');
const { httpError } = require('./http');

const HEX_ID = /^[a-f\d]{24}$/i;

// Returns an ObjectId, or null when the value is not a 24-hex-char id.
// (ObjectId.isValid alone also accepts any 12-character string.)
const toObjectId = (value) => {
  if (value instanceof ObjectId) return value;
  if (typeof value !== 'string' || !HEX_ID.test(value)) return null;
  return new ObjectId(value);
};

// :id route params. Invalid -> 400.
const requireId = (value) => {
  const id = toObjectId(value);
  if (!id) throw httpError(400, 'Invalid id');
  return id;
};

// Multipart forms send a missing reference as "" (or "null"/"undefined" when
// the stored value was null), all of which mean "no reference".
const isBlankRef = (value) => value === undefined || value === null || value === '' || value === 'null' || value === 'undefined';

// Optional reference id from a request body: blank -> null, invalid -> 400.
const optionalRefId = (value, field) => {
  if (isBlankRef(value)) return null;
  const id = toObjectId(typeof value === 'string' ? value.trim() : value);
  if (!id) throw httpError(400, `Invalid ${field}`);
  return id;
};

// Array of reference ids, given as an array or a JSON-encoded array. Blank -> [].
const refIdArray = (value, field) => {
  if (isBlankRef(value)) return [];
  let list = value;
  if (typeof value === 'string') {
    try {
      list = JSON.parse(value);
    } catch {
      throw httpError(400, `Invalid ${field}`);
    }
  }
  if (!Array.isArray(list)) throw httpError(400, `${field} must be an array`);
  return list.map((item) => {
    const id = toObjectId(item);
    if (!id) throw httpError(400, `Invalid ${field}`);
    return id;
  });
};

module.exports = { toObjectId, requireId, optionalRefId, refIdArray };
