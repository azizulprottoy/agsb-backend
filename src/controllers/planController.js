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

const PLAN_STATUSES = ['open', 'full', 'closed', 'completed', 'cancelled'];

const toPrice = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};

const toSeats = (val) => {
  if (val === undefined || val === null || val === '') return null;
  const n = Number(val);
  return Number.isInteger(n) && n >= 0 ? n : null;
};

// Returns an error message, or null when the schedule fields are valid.
const validateSchedule = (plan) => {
  if (plan.start_date && plan.end_date && plan.end_date < plan.start_date) {
    return 'End date cannot be before start date';
  }
  return null;
};

const buildPlanData = (body) => ({
  title_bn: body.title_bn,
  title_en: body.title_en,
  slug: body.slug,
  duration: body.duration || '',
  type: body.type || '',
  districts: toArray(body.districts),
  cost: body.cost || '',
  price: toPrice(body.price),
  highlights: toArray(body.highlights),
  description_bn: body.description_bn || '',
  description_en: body.description_en || '',
  start_date: body.start_date || '',
  end_date: body.end_date || '',
  seats_available: toSeats(body.seats_available),
  status: PLAN_STATUSES.includes(body.status) ? body.status : 'open',
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
      const scheduleError = validateSchedule(newPlan);
      if (scheduleError) {
        return res.status(400).json({ success: false, message: scheduleError });
      }
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
      const scheduleError = validateSchedule(updatedData);
      if (scheduleError) {
        return res.status(400).json({ success: false, message: scheduleError });
      }
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
