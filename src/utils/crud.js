const { httpError } = require('./http');
const { requireId } = require('./ids');

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

// $set on the document with :id and return the updated document.
// Invalid id -> 400, no such document -> 404.
const updateById = async (collection, rawId, set, label) => {
  const _id = requireId(rawId);
  const doc = Object.keys(set).length
    ? await collection.findOneAndUpdate({ _id }, { $set: set }, { returnDocument: 'after' })
    : await collection.findOne({ _id });
  if (!doc) throw httpError(404, `${label} not found`);
  return doc;
};

// Delete by :id. Keeps `acknowledged`/`deletedCount` (the admin panel checks
// deletedCount). Invalid id -> 400, no such document -> 404.
const deleteById = async (collection, rawId, label) => {
  const _id = requireId(rawId);
  const result = await collection.deleteOne({ _id });
  if (!result.deletedCount) throw httpError(404, `${label} not found`);
  return { success: true, acknowledged: result.acknowledged, deletedCount: result.deletedCount };
};

module.exports = { pickPresent, insertResponse, updateById, deleteById };
