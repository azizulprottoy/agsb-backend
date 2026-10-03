const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

// Features may contain commas ("Up to ৳1,000 off"), so they are never split on
// commas: an array, a JSON array string (multipart/admin), or one per line.
const parseFeatures = (val) => {
  let list = val;
  if (typeof val === 'string' && val.trim().startsWith('[')) {
    try {
      list = JSON.parse(val);
    } catch {
      list = val;
    }
  }
  if (!Array.isArray(list)) list = String(list || '').split('\n');
  return list.map((f) => String(f ?? '').trim()).filter(Boolean);
};

const buildMembershipData = (body) => ({
  name: body.name,
  price: body.price,
  period: body.period || '',
  desc: body.desc || '',
  features: parseFeatures(body.features),
  cta: body.cta || 'Get Started',
  popular: body.popular === true || body.popular === 'true',
  order: Number(body.order) || 0,
});

module.exports = ({ MembershipPlanCollection }) => ({
  getMembershipPlans: async (req, res) => {
    const result = await MembershipPlanCollection.find().sort({ order: 1 }).toArray();
    res.json(result);
  },

  addMembershipPlan: async (req, res) => {
    const result = await MembershipPlanCollection.insertOne(buildMembershipData(req.body));
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editMembershipPlan: async (req, res) => {
    const updatedData = pickPresent(buildMembershipData(req.body), req.body);
    const updatedPlan = await updateById(MembershipPlanCollection, req.params.id, updatedData, 'Membership plan');
    res.json({ success: true, message: 'Membership plan updated successfully', updatedPlan });
  },

  deleteMembershipPlan: async (req, res) => {
    res.json(await deleteById(MembershipPlanCollection, req.params.id, 'Membership plan'));
  },
});
