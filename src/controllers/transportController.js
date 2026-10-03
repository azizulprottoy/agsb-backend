const { toPublicUrl } = require('../utils/paths');
const { optionalRefId } = require('../utils/ids');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

const buildTransportData = (body) => ({
  name_bn: body.name_bn || '',
  name_en: body.name_en,
  type: body.type || 'bus',
  from_district_id: optionalRefId(body.from_district_id, 'from_district_id'),
  to_district_id: optionalRefId(body.to_district_id, 'to_district_id'),
  operator: body.operator || '',
  fare: body.fare || '',
  duration: body.duration || '',
  contact: body.contact || '',
});

module.exports = ({ TransportCollection }) => ({
  getTransports: async (req, res) => {
    const result = await TransportCollection.find().sort({ _id: -1 }).toArray();
    res.json(result.map((t) => ({ ...t, image: toPublicUrl(t.image) })));
  },

  addTransport: async (req, res) => {
    const newTransport = buildTransportData(req.body);
    newTransport.image = req.file ? `/uploads/transports/${req.file.filename}` : '';

    const result = await TransportCollection.insertOne(newTransport);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editTransport: async (req, res) => {
    const updatedData = pickPresent(buildTransportData(req.body), req.body);
    if (req.file) {
      updatedData.image = `/uploads/transports/${req.file.filename}`;
    }

    const updatedTransport = await updateById(TransportCollection, req.params.id, updatedData, 'Transport');
    res.json({ success: true, message: 'Transport updated successfully', updatedTransport });
  },

  deleteTransport: async (req, res) => {
    res.json(await deleteById(TransportCollection, req.params.id, 'Transport'));
  },
});
