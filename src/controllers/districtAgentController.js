const { toPublicUrl } = require('../utils/paths');
const { optionalRefId } = require('../utils/ids');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

const buildDistrictAgentData = (body) => ({
  name: body.name,
  district_id: optionalRefId(body.district_id, 'district_id'),
  phone: body.phone || '',
  whatsapp: body.whatsapp || '',
  designation: body.designation || '',
  verified: body.verified === true || body.verified === 'true',
});

module.exports = ({ DistrictAgentCollection }) => ({
  getDistrictAgents: async (req, res) => {
    const result = await DistrictAgentCollection.find().sort({ _id: -1 }).toArray();
    res.json(result.map((a) => ({ ...a, image: toPublicUrl(a.image) })));
  },

  addDistrictAgent: async (req, res) => {
    const newAgent = buildDistrictAgentData(req.body);
    newAgent.image = req.file ? `/uploads/districtagents/${req.file.filename}` : '';

    const result = await DistrictAgentCollection.insertOne(newAgent);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editDistrictAgent: async (req, res) => {
    const updatedData = pickPresent(buildDistrictAgentData(req.body), req.body);
    if (req.file) {
      updatedData.image = `/uploads/districtagents/${req.file.filename}`;
    }

    const updatedDistrictAgent = await updateById(DistrictAgentCollection, req.params.id, updatedData, 'District agent');
    res.json({ success: true, message: 'District agent updated successfully', updatedDistrictAgent });
  },

  deleteDistrictAgent: async (req, res) => {
    res.json(await deleteById(DistrictAgentCollection, req.params.id, 'District agent'));
  },
});
