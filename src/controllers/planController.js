const { toPublicUrl } = require('../utils/paths');
const { sanitizeRichText } = require('../utils/sanitizeHtml');
const { requireId } = require('../utils/ids');
const { httpError } = require('../utils/http');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

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
  description_bn: sanitizeRichText(body.description_bn || ''),
  description_en: sanitizeRichText(body.description_en || ''),
  start_date: body.start_date || '',
  end_date: body.end_date || '',
  seats_available: toSeats(body.seats_available),
  status: PLAN_STATUSES.includes(body.status) ? body.status : 'open',
});

module.exports = ({ TravelPlanCollection, BookingCollection }) => ({
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
    const newPlan = buildPlanData(req.body);
    const scheduleError = validateSchedule(newPlan);
    if (scheduleError) throw httpError(400, scheduleError);
    newPlan.image = req.file ? `/uploads/plans/${req.file.filename}` : '';

    const result = await TravelPlanCollection.insertOne(newPlan);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed, so a partial update can
  // no longer reset status, seats or dates.
  editPlan: async (req, res) => {
    const updatedData = pickPresent(buildPlanData(req.body), req.body);

    // A date change is validated against the stored value of the other date.
    if ('start_date' in updatedData || 'end_date' in updatedData) {
      const existing = await TravelPlanCollection.findOne(
        { _id: requireId(req.params.id) },
        { projection: { start_date: 1, end_date: 1 } }
      );
      if (!existing) throw httpError(404, 'Travel plan not found');
      const scheduleError = validateSchedule({ ...existing, ...updatedData });
      if (scheduleError) throw httpError(400, scheduleError);
    }
    if (req.file) {
      updatedData.image = `/uploads/plans/${req.file.filename}`;
    }

    // seats_available is a live counter that bookings decrement. When the
    // admin form also sends the value it loaded (seats_available_was), apply
    // only the admin's change as an increment, so seats booked while the form
    // was open are not handed out again. Without it (older clients), or when
    // switching between limited and unlimited, the value is set as sent.
    if ('seats_available' in updatedData && req.body.seats_available_was !== undefined) {
      const was = toSeats(req.body.seats_available_was);
      const next = updatedData.seats_available;
      if (was === next) {
        delete updatedData.seats_available;
      } else if (was !== null && next !== null) {
        delete updatedData.seats_available;
        const delta = next - was;
        const adjusted = await TravelPlanCollection.updateOne(
          { _id: requireId(req.params.id), seats_available: { $type: 'number', $gte: Math.max(0, -delta) } },
          { $inc: { seats_available: delta } }
        );
        if (!adjusted.matchedCount) {
          throw httpError(409, 'Seats were booked while you were editing, so this change would go below zero. Reload the plan and try again.');
        }
      }
    }

    const { _id } = await updateById(TravelPlanCollection, req.params.id, updatedData, 'Travel plan');

    // Keep status in step with the seat count: a full plan that has seats
    // again reopens, an open plan with none left becomes full.
    await TravelPlanCollection.updateOne({ _id, status: 'full', seats_available: { $gt: 0 } }, { $set: { status: 'open' } });
    await TravelPlanCollection.updateOne({ _id, status: { $in: ['open', null, ''] }, seats_available: 0 }, { $set: { status: 'full' } });

    // Re-read: the seat increment and status fix are not in updateById's result.
    const fresh = await TravelPlanCollection.findOne({ _id });
    const updatedPlan = { ...fresh, image: toPublicUrl(fresh.image) };
    res.json({ success: true, message: 'Travel plan updated successfully', updatedPlan });
  },

  deletePlan: async (req, res) => {
    // Blocked while the plan has bookings that are still open.
    res.json(await deleteById(TravelPlanCollection, req.params.id, 'Travel plan', {
      guard: async (plan) => {
        const active = await BookingCollection.countDocuments({
          planId: { $in: [plan._id, String(plan._id)] },
          bookingStatus: { $nin: ['cancelled', 'completed'] },
        });
        if (active) {
          throw httpError(409, `This plan has ${active} active booking${active === 1 ? '' : 's'}. Cancel or complete them before deleting it.`);
        }
      },
    }));
  },
});
