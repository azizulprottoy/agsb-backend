const { pickPresent, insertResponse, updateById, deleteById, assertUnreferenced } = require('../utils/crud');

const buildDivisionData = (body) => ({
  name_bn: body.name_bn,
  name_en: body.name_en,
  slug: body.slug,
  color: body.color || '#4CAF50',
  districtCount: Number(body.districtCount) || 0,
});

module.exports = ({ DivisionCollection, DistrictCollection }) => ({
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
    // Blocked while districts still belong to this division.
    res.json(await deleteById(DivisionCollection, req.params.id, 'Division', {
      guard: async (division) => {
        const ids = [division._id, String(division._id)];
        const districts = await DistrictCollection.countDocuments({ division_id: { $in: ids } });
        assertUnreferenced('division', [[districts, 'district', 'districts']]);
      },
    }));
  },
});
