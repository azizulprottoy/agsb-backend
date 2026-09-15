const { ObjectId } = require('mongodb');
const { toPublicUrl } = require('../utils/paths');

const buildTransportData = (body) => ({
  name_bn: body.name_bn || '',
  name_en: body.name_en,
  type: body.type || 'bus',
  from_district_id: body.from_district_id ? new ObjectId(body.from_district_id) : null,
  to_district_id: body.to_district_id ? new ObjectId(body.to_district_id) : null,
  operator: body.operator || '',
  fare: body.fare || '',
  duration: body.duration || '',
  contact: body.contact || '',
});

module.exports = ({ TransportCollection }) => ({
  getTransports: async (req, res) => {
    const result = await TransportCollection.find().sort({ _id: -1 }).toArray();
    res.json(result.map((t) => ({ ...t, image: toPublicUrl(t.image) })));
  },

  addTransport: async (req, res) => {
    try {
      const newTransport = buildTransportData(req.body);
      newTransport.image = req.file ? `/uploads/transports/${req.file.filename}` : '';

      const result = await TransportCollection.insertOne(newTransport);
      res.json(result);
    } catch (err) {
      console.error('Add transport error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editTransport: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = buildTransportData(req.body);
      if (req.file) {
        updatedData.image = `/uploads/transports/${req.file.filename}`;
      }

      await TransportCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'Transport updated successfully', updatedTransport: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit transport error:', err);
      res.status(500).json({ success: false, message: 'Error updating transport' });
    }
  },

  deleteTransport: async (req, res) => {
    try {
      const result = await TransportCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting transport' });
    }
  },
});
