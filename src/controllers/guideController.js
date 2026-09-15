const { ObjectId } = require('mongodb');
const { toPublicUrl } = require('../utils/paths');

const parseJsonField = (val, fallback) => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const buildGuideData = (body) => ({
  name: body.name,
  district_ids: parseJsonField(body.district_ids, []).map((id) => new ObjectId(id)),
  phone: body.phone || '',
  languages: parseJsonField(body.languages, []),
  experience_years: Number(body.experience_years) || 0,
  price_per_day: body.price_per_day || '',
  rating: Number(body.rating) || 0,
  verified: body.verified === true || body.verified === 'true',
  bio: body.bio || '',
});

module.exports = ({ GuideCollection }) => ({
  getGuides: async (req, res) => {
    const result = await GuideCollection.find().sort({ _id: -1 }).toArray();
    res.json(result.map((g) => ({ ...g, image: toPublicUrl(g.image) })));
  },

  addGuide: async (req, res) => {
    try {
      const newGuide = buildGuideData(req.body);
      newGuide.image = req.file ? `/uploads/guides/${req.file.filename}` : '';

      const result = await GuideCollection.insertOne(newGuide);
      res.json(result);
    } catch (err) {
      console.error('Add guide error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editGuide: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = buildGuideData(req.body);
      if (req.file) {
        updatedData.image = `/uploads/guides/${req.file.filename}`;
      }

      await GuideCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'Guide updated successfully', updatedGuide: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit guide error:', err);
      res.status(500).json({ success: false, message: 'Error updating guide' });
    }
  },

  deleteGuide: async (req, res) => {
    try {
      const result = await GuideCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting guide' });
    }
  },
});
