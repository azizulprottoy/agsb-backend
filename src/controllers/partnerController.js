const { toPublicUrl } = require('../utils/paths');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

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
    const newPartner = buildPartnerData(req.body);
    newPartner.image = req.file ? `/uploads/partners/${req.file.filename}` : '';

    const result = await PartnerCollection.insertOne(newPartner);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editPartner: async (req, res) => {
    const updatedData = pickPresent(buildPartnerData(req.body), req.body);
    if (req.file) {
      updatedData.image = `/uploads/partners/${req.file.filename}`;
    }

    const updatedPartner = await updateById(PartnerCollection, req.params.id, updatedData, 'Partner');
    res.json({ success: true, message: 'Partner updated successfully', updatedPartner });
  },

  deletePartner: async (req, res) => {
    res.json(await deleteById(PartnerCollection, req.params.id, 'Partner'));
  },
});
