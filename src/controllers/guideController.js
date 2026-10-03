const { toPublicUrl } = require('../utils/paths');
const { refIdArray } = require('../utils/ids');
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

const buildGuideData = (body) => ({
  name: body.name,
  district_ids: refIdArray(body.district_ids, 'district_ids'),
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
    const newGuide = buildGuideData(req.body);
    newGuide.image = req.file ? `/uploads/guides/${req.file.filename}` : '';

    const result = await GuideCollection.insertOne(newGuide);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editGuide: async (req, res) => {
    const updatedData = pickPresent(buildGuideData(req.body), req.body);
    if (req.file) {
      updatedData.image = `/uploads/guides/${req.file.filename}`;
    }

    const updatedGuide = await updateById(GuideCollection, req.params.id, updatedData, 'Guide');
    res.json({ success: true, message: 'Guide updated successfully', updatedGuide });
  },

  deleteGuide: async (req, res) => {
    res.json(await deleteById(GuideCollection, req.params.id, 'Guide'));
  },
});
