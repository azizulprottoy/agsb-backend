const { ObjectId } = require('mongodb');
const { toPublicUrl } = require('../utils/paths');

const buildFrameData = (body) => ({
  districtSlug: body.districtSlug || '',
  name: body.name || '',
  premium: body.premium === true || body.premium === 'true',
});

module.exports = ({ FrameCollection }) => ({
  getFrames: async (req, res) => {
    const result = await FrameCollection.find().sort({ _id: -1 }).toArray();
    res.json(result.map((f) => ({ ...f, image: toPublicUrl(f.image) })));
  },

  addFrame: async (req, res) => {
    try {
      const newFrame = buildFrameData(req.body);
      newFrame.image = req.file ? `/uploads/frames/${req.file.filename}` : '';

      const result = await FrameCollection.insertOne(newFrame);
      res.json(result);
    } catch (err) {
      console.error('Add frame error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editFrame: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = buildFrameData(req.body);
      if (req.file) {
        updatedData.image = `/uploads/frames/${req.file.filename}`;
      }

      await FrameCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'Frame updated successfully', updatedFrame: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit frame error:', err);
      res.status(500).json({ success: false, message: 'Error updating frame' });
    }
  },

  deleteFrame: async (req, res) => {
    try {
      const result = await FrameCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting frame' });
    }
  },
});
