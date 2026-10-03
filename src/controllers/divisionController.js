const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

const buildDivisionData = (body) => ({
  name_bn: body.name_bn,
  name_en: body.name_en,
  slug: body.slug,
  color: body.color || '#4CAF50',
  districtCount: Number(body.districtCount) || 0,
});

module.exports = ({ DivisionCollection }) => ({
  getDivisions: async (req, res) => {
    const result = await DivisionCollection.find().sort({ name_en: 1 }).toArray();
    res.json(result);
  },

  addDivision: async (req, res) => {
    const result = await DivisionCollection.insertOne(buildDivisionData(req.body));
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editDivision: async (req, res) => {
    const updatedData = pickPresent(buildDivisionData(req.body), req.body);
    const updatedDivision = await updateById(DivisionCollection, req.params.id, updatedData, 'Division');
    res.json({ success: true, message: 'Division updated successfully', updatedDivision });
  },

  deleteDivision: async (req, res) => {
    res.json(await deleteById(DivisionCollection, req.params.id, 'Division'));
  },
});
