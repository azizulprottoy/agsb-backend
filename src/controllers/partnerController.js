const { ObjectId } = require('mongodb');
const { toPublicUrl } = require('../utils/paths');

const buildPartnerData = (body) => ({
  name: body.name,
  type: body.type || 'hotel',
  district: body.district || '',
  rating: Number(body.rating) || 0,
  price: body.price || '',
  discount: body.discount || '',
  verified: body.verified === true || body.verified === 'true',
});

module.exports = ({ PartnerCollection }) => ({
  getPartners: async (req, res) => {
    const result = await PartnerCollection.find().sort({ _id: -1 }).toArray();
    res.json(result.map((p) => ({ ...p, image: toPublicUrl(p.image) })));
  },

  addPartner: async (req, res) => {
    try {
      const newPartner = buildPartnerData(req.body);
      newPartner.image = req.file ? `/uploads/partners/${req.file.filename}` : '';

      const result = await PartnerCollection.insertOne(newPartner);
      res.json(result);
    } catch (err) {
      console.error('Add partner error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editPartner: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = buildPartnerData(req.body);
      if (req.file) {
        updatedData.image = `/uploads/partners/${req.file.filename}`;
      }

      await PartnerCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'Partner updated successfully', updatedPartner: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit partner error:', err);
      res.status(500).json({ success: false, message: 'Error updating partner' });
    }
  },

  deletePartner: async (req, res) => {
    try {
      const result = await PartnerCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting partner' });
    }
  },
});
