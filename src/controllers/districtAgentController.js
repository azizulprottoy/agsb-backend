const { ObjectId } = require('mongodb');
const { toPublicUrl } = require('../utils/paths');

const buildDistrictAgentData = (body) => ({
  name: body.name,
  district_id: body.district_id ? new ObjectId(body.district_id) : null,
  phone: body.phone || '',
  whatsapp: body.whatsapp || '',
  designation: body.designation || '',
  verified: body.verified === true || body.verified === 'true',
});

module.exports = ({ DistrictAgentCollection }) => ({
  getDistrictAgents: async (req, res) => {
    const result = await DistrictAgentCollection.find().sort({ _id: -1 }).toArray();
    res.json(result.map((a) => ({ ...a, image: toPublicUrl(a.image) })));
  },

  addDistrictAgent: async (req, res) => {
    try {
      const newAgent = buildDistrictAgentData(req.body);
      newAgent.image = req.file ? `/uploads/districtagents/${req.file.filename}` : '';

      const result = await DistrictAgentCollection.insertOne(newAgent);
      res.json(result);
    } catch (err) {
      console.error('Add district agent error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editDistrictAgent: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = buildDistrictAgentData(req.body);
      if (req.file) {
        updatedData.image = `/uploads/districtagents/${req.file.filename}`;
      }

      await DistrictAgentCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'District agent updated successfully', updatedDistrictAgent: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit district agent error:', err);
      res.status(500).json({ success: false, message: 'Error updating district agent' });
    }
  },

  deleteDistrictAgent: async (req, res) => {
    try {
      const result = await DistrictAgentCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting district agent' });
    }
  },
});
