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

const buildDistrictData = (body) => ({
  division_id: body.division_id ? new ObjectId(body.division_id) : null,
  name_bn: body.name_bn,
  name_en: body.name_en,
  slug: body.slug,
  tagline: body.tagline || '',
  best_time: body.best_time || '',
  budget: body.budget || '',
  difficulty: Number(body.difficulty) || 1,
  family: body.family === true || body.family === 'true',
  lat: Number(body.lat) || 0,
  lng: Number(body.lng) || 0,
  status: body.status || 'skeleton',
  attractions: parseJsonField(body.attractions, []),
  food: parseJsonField(body.food, []),
  transport: body.transport || '',
});

module.exports = ({ DistrictCollection }) => ({
  getDistricts: async (req, res) => {
    const result = await DistrictCollection.find().sort({ name_en: 1 }).toArray();
    res.json(result.map((d) => ({ ...d, image: toPublicUrl(d.image) })));
  },

  getDistrictBySlug: async (req, res) => {
    const district = await DistrictCollection.findOne({ slug: req.params.slug });
    if (!district) {
      return res.status(404).json({ success: false, message: 'District not found' });
    }
    res.json({ ...district, image: toPublicUrl(district.image) });
  },

  addDistrict: async (req, res) => {
    try {
      const newDistrict = buildDistrictData(req.body);
      newDistrict.image = req.file ? `/uploads/districts/${req.file.filename}` : '';

      const result = await DistrictCollection.insertOne(newDistrict);
      res.json(result);
    } catch (err) {
      console.error('Add district error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editDistrict: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = buildDistrictData(req.body);
      if (req.file) {
        updatedData.image = `/uploads/districts/${req.file.filename}`;
      }

      await DistrictCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'District updated successfully', updatedDistrict: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit district error:', err);
      res.status(500).json({ success: false, message: 'Error updating district' });
    }
  },

  deleteDistrict: async (req, res) => {
    try {
      const result = await DistrictCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting district' });
    }
  },
});
