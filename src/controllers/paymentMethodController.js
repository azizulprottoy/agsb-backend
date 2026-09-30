const { ObjectId } = require('mongodb');

const buildMethodData = (body) => ({
  method: (body.method || '').trim(),
  number: (body.number || '').trim(),
  extradetails: (body.extradetails || '').trim(),
  active: body.active === undefined ? true : body.active === true || body.active === 'true',
});

module.exports = ({ PaymentMethodCollection }) => ({
  // Public list only shows active methods; admins see all with ?all=1.
  getPaymentMethods: async (req, res) => {
    const filter = req.query.all ? {} : { active: { $ne: false } };
    const result = await PaymentMethodCollection.find(filter).sort({ _id: 1 }).toArray();
    res.json(result);
  },

  addPaymentMethod: async (req, res) => {
    try {
      const data = buildMethodData(req.body);
      if (!data.method || !data.number) {
        return res.status(400).json({ success: false, message: 'Method and number are required' });
      }
      const result = await PaymentMethodCollection.insertOne(data);
      res.json({ success: true, insertedId: result.insertedId });
    } catch (err) {
      console.error('Add payment method error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editPaymentMethod: async (req, res) => {
    try {
      const data = buildMethodData(req.body);
      if (!data.method || !data.number) {
        return res.status(400).json({ success: false, message: 'Method and number are required' });
      }
      const result = await PaymentMethodCollection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: data });
      res.json({ success: result.matchedCount > 0, message: result.matchedCount ? 'Payment method updated' : 'Payment method not found' });
    } catch (err) {
      console.error('Edit payment method error:', err);
      res.status(500).json({ success: false, message: 'Error updating payment method' });
    }
  },

  deletePaymentMethod: async (req, res) => {
    try {
      const result = await PaymentMethodCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting payment method' });
    }
  },
});
