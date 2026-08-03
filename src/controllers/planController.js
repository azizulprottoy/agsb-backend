const { ObjectId } = require('mongodb');
const { toPublicUrl } = require('../utils/paths');

const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not JSON, fall back to comma-split
    }
    return val.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
};

const buildPlanData = (body) => ({
  title_bn: body.title_bn,
  title_en: body.title_en,
  slug: body.slug,
  duration: body.duration || '',
  type: body.type || '',
  districts: toArray(body.districts),
  cost: body.cost || '',
  highlights: toArray(body.highlights),
});

module.exports = ({ TravelPlanCollection }) => ({
  getPlans: async (req, res) => {
    const result = await TravelPlanCollection.find().sort({ _id: -1 }).toArray();
    res.json(result.map((p) => ({ ...p, image: toPublicUrl(p.image) })));
  },

  getPlanBySlug: async (req, res) => {
    const plan = await TravelPlanCollection.findOne({ slug: req.params.slug });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Travel plan not found' });
    }
    res.json({ ...plan, image: toPublicUrl(plan.image) });
  },

  addPlan: async (req, res) => {
    try {
      const newPlan = buildPlanData(req.body);
      newPlan.image = req.file ? `/uploads/plans/${req.file.filename}` : '';

      const result = await TravelPlanCollection.insertOne(newPlan);
      res.json(result);
    } catch (err) {
      console.error('Add plan error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editPlan: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = buildPlanData(req.body);
      if (req.file) {
        updatedData.image = `/uploads/plans/${req.file.filename}`;
      }

      await TravelPlanCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'Travel plan updated successfully', updatedPlan: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit plan error:', err);
      res.status(500).json({ success: false, message: 'Error updating travel plan' });
    }
  },

  deletePlan: async (req, res) => {
    try {
      const result = await TravelPlanCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting travel plan' });
    }
  },
});
