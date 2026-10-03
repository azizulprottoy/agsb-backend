const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

const buildMethodData = (body) => ({
  method: String(body.method || '').trim(),
  number: String(body.number || '').trim(),
  extradetails: String(body.extradetails || '').trim(),
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
    const data = buildMethodData(req.body);
    if (!data.method || !data.number) {
      return res.status(400).json({ success: false, message: 'Method and number are required' });
    }
    const result = await PaymentMethodCollection.insertOne(data);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed; method/number, when sent, must not be empty.
  editPaymentMethod: async (req, res) => {
    const data = pickPresent(buildMethodData(req.body), req.body);
    if (data.method === '' || data.number === '') {
      return res.status(400).json({ success: false, message: 'Method and number are required' });
    }
    await updateById(PaymentMethodCollection, req.params.id, data, 'Payment method');
    res.json({ success: true, message: 'Payment method updated' });
  },

  deletePaymentMethod: async (req, res) => {
    res.json(await deleteById(PaymentMethodCollection, req.params.id, 'Payment method'));
  },
});
