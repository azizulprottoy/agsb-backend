const { ObjectId } = require('mongodb');

module.exports = ({ DivisionCollection }) => ({
  getDivisions: async (req, res) => {
    const result = await DivisionCollection.find().sort({ name_en: 1 }).toArray();
    res.json(result);
  },

  addDivision: async (req, res) => {
    try {
      const { name_bn, name_en, slug, color, districtCount } = req.body;
      const newDivision = {
        name_bn,
        name_en,
        slug,
        color: color || '#4CAF50',
        districtCount: Number(districtCount) || 0,
      };
      const result = await DivisionCollection.insertOne(newDivision);
      res.json(result);
    } catch (err) {
      console.error('Add division error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editDivision: async (req, res) => {
    try {
      const { id } = req.params;
      const { name_bn, name_en, slug, color, districtCount } = req.body;
      const updatedData = { name_bn, name_en, slug, color, districtCount: Number(districtCount) || 0 };

      await DivisionCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'Division updated successfully', updatedDivision: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit division error:', err);
      res.status(500).json({ success: false, message: 'Error updating division' });
    }
  },

  deleteDivision: async (req, res) => {
    try {
      const result = await DivisionCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting division' });
    }
  },
});
