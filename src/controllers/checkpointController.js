const { ObjectId } = require('mongodb');

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
  district_id: body.district_id ? new ObjectId(body.district_id) : null,
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
    try {
      const newCheckpoint = buildCheckpointData(req.body);
      const result = await CheckpointCollection.insertOne(newCheckpoint);
      res.json(result);
    } catch (err) {
      console.error('Add checkpoint error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editCheckpoint: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = buildCheckpointData(req.body);

      await CheckpointCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'Checkpoint updated successfully', updatedCheckpoint: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit checkpoint error:', err);
      res.status(500).json({ success: false, message: 'Error updating checkpoint' });
    }
  },

  deleteCheckpoint: async (req, res) => {
    try {
      const result = await CheckpointCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting checkpoint' });
    }
  },
});
