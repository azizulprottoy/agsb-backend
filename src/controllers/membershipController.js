const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

const buildMembershipData = (body) => ({
  name: body.name,
  price: body.price,
  period: body.period || '',
  desc: body.desc || '',
  features: Array.isArray(body.features)
    ? body.features
    : String(body.features || '').split(',').map((f) => f.trim()).filter(Boolean),
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
