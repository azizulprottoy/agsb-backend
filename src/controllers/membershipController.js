const { ObjectId } = require('mongodb');

module.exports = ({ MembershipPlanCollection }) => ({
  getMembershipPlans: async (req, res) => {
    const result = await MembershipPlanCollection.find().sort({ order: 1 }).toArray();
    res.json(result);
  },

  addMembershipPlan: async (req, res) => {
    try {
      const { name, price, period, desc, features, cta, popular, order } = req.body;
      const newPlan = {
        name,
        price,
        period: period || '',
        desc: desc || '',
        features: Array.isArray(features) ? features : (features || '').split(',').map((f) => f.trim()).filter(Boolean),
        cta: cta || 'Get Started',
        popular: popular === true || popular === 'true',
        order: Number(order) || 0,
      };
      const result = await MembershipPlanCollection.insertOne(newPlan);
      res.json(result);
    } catch (err) {
      console.error('Add membership plan error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editMembershipPlan: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, price, period, desc, features, cta, popular, order } = req.body;
      const updatedData = {
        name,
        price,
        period,
        desc,
        features: Array.isArray(features) ? features : (features || '').split(',').map((f) => f.trim()).filter(Boolean),
        cta,
        popular: popular === true || popular === 'true',
        order: Number(order) || 0,
      };

      await MembershipPlanCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'Membership plan updated successfully', updatedPlan: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit membership plan error:', err);
      res.status(500).json({ success: false, message: 'Error updating membership plan' });
    }
  },

  deleteMembershipPlan: async (req, res) => {
    try {
      const result = await MembershipPlanCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting membership plan' });
    }
  },
});
