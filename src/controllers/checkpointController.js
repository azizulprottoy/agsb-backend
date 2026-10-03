const { optionalRefId } = require('../utils/ids');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

const parseJsonField = (val, fallback) => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const buildCheckpointData = (body) => ({
  name_bn: body.name_bn || '',
  name_en: body.name_en,
  district_id: optionalRefId(body.district_id, 'district_id'),
  type: body.type || 'police',
  lat: Number(body.lat) || 0,
  lng: Number(body.lng) || 0,
  documents_required: parseJsonField(body.documents_required, []),
  notes: body.notes || '',
  status: body.status || 'active',
});

module.exports = ({ CheckpointCollection }) => ({
  getCheckpoints: async (req, res) => {
    const result = await CheckpointCollection.find().sort({ _id: -1 }).toArray();
    res.json(result);
  },

  addCheckpoint: async (req, res) => {
    const newCheckpoint = buildCheckpointData(req.body);
    const result = await CheckpointCollection.insertOne(newCheckpoint);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editCheckpoint: async (req, res) => {
    const updatedData = pickPresent(buildCheckpointData(req.body), req.body);
    const updatedCheckpoint = await updateById(CheckpointCollection, req.params.id, updatedData, 'Checkpoint');
    res.json({ success: true, message: 'Checkpoint updated successfully', updatedCheckpoint });
  },

  deleteCheckpoint: async (req, res) => {
    res.json(await deleteById(CheckpointCollection, req.params.id, 'Checkpoint'));
  },
});
