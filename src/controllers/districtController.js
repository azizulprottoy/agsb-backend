const { toPublicUrl } = require('../utils/paths');
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

const buildDistrictData = (body) => ({
  division_id: optionalRefId(body.division_id, 'division_id'),
  name_bn: body.name_bn,
  name_en: body.name_en,
  slug: body.slug,
  tagline: body.tagline || '',
  trip_type: String(body.trip_type || '').trim().slice(0, 40),
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
    const newDistrict = buildDistrictData(req.body);
    newDistrict.image = req.file ? `/uploads/districts/${req.file.filename}` : '';

    const result = await DistrictCollection.insertOne(newDistrict);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editDistrict: async (req, res) => {
    const updatedData = pickPresent(buildDistrictData(req.body), req.body);
    if (req.file) {
      updatedData.image = `/uploads/districts/${req.file.filename}`;
    }

    const updatedDistrict = await updateById(DistrictCollection, req.params.id, updatedData, 'District');
    res.json({ success: true, message: 'District updated successfully', updatedDistrict });
  },

  deleteDistrict: async (req, res) => {
    res.json(await deleteById(DistrictCollection, req.params.id, 'District'));
  },
});
