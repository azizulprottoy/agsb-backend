const { httpError } = require('./http');
const { requireId } = require('./ids');
const { removeUpload } = require('./files');
const { toPublicUrl } = require('./paths');

// For PUT: keep only the built fields whose source field was actually sent,
// so a partial body leaves every other field untouched. Every buildXData maps
// body.<key> -> data.<key>, so the key names line up.
const pickPresent = (data, body) => Object.fromEntries(
  Object.entries(data).filter(([key]) => body != null && body[key] !== undefined)
);

const insertResponse = (result) => ({
  success: true,
  acknowledged: result.acknowledged,
  insertedId: result.insertedId,
});

const withPublicImage = (doc) => ('image' in doc ? { ...doc, image: toPublicUrl(doc.image) } : doc);

// $set on the document with :id and return the updated document.
// Invalid id -> 400, no such document -> 404. When `set.image` replaces a
// different stored image, the old file is deleted after the update succeeds.
// Returns the complete updated document (every $set key is top-level, so
// before + set is exactly the stored result), image as a public URL like GET.
const updateById = async (collection, rawId, set, label) => {
  const _id = requireId(rawId);
  if (!Object.keys(set).length) {
    const doc = await collection.findOne({ _id });
    if (!doc) throw httpError(404, `${label} not found`);
    return withPublicImage(doc);
  }
  const before = await collection.findOneAndUpdate({ _id }, { $set: set }, { returnDocument: 'before' });
  if (!before) throw httpError(404, `${label} not found`);
  if ('image' in set && before.image && before.image !== set.image) {
    await removeUpload(toPublicUrl(before.image));
  }
  return withPublicImage({ ...before, ...set });
};

// Delete by :id. Keeps `acknowledged`/`deletedCount` (the admin panel checks
// deletedCount). Invalid id -> 400, no such document -> 404.
// Options:
//   guard(doc)     runs before the delete; throw (e.g. a 409) to block it.
//   onDeleted(doc) runs after a successful delete (extra file cleanup etc.).
// The deleted document's `image` upload is removed.
const deleteById = async (collection, rawId, label, { guard, onDeleted } = {}) => {
  const _id = requireId(rawId);
  if (guard) {
    const existing = await collection.findOne({ _id });
    if (!existing) throw httpError(404, `${label} not found`);
    await guard(existing);
  }
  const doc = await collection.findOneAndDelete({ _id });
  if (!doc) throw httpError(404, `${label} not found`);
  if (doc.image) await removeUpload(toPublicUrl(doc.image));
  if (onDeleted) await onDeleted(doc);
  return { success: true, acknowledged: true, deletedCount: 1 };
};

// Builds a 409 for a delete blocked by references, e.g.
// "Cannot delete this district: it is used by 3 hotels and 1 guide."
// `counts` is [[count, singular, plural], ...]; zero counts are skipped.
const assertUnreferenced = (what, counts) => {
  const parts = counts
    .filter(([n]) => n > 0)
    .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`);
  if (!parts.length) return;
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0];
  throw httpError(409, `Cannot delete this ${what}: it is used by ${list}. Reassign or remove them first.`);
};

module.exports = { pickPresent, insertResponse, updateById, deleteById, assertUnreferenced };
