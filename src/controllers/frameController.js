const { toPublicUrl } = require('../utils/paths');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

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
    const newFrame = buildFrameData(req.body);
    newFrame.image = req.file ? `/uploads/frames/${req.file.filename}` : '';

    const result = await FrameCollection.insertOne(newFrame);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editFrame: async (req, res) => {
    const updatedData = pickPresent(buildFrameData(req.body), req.body);
    if (req.file) {
      updatedData.image = `/uploads/frames/${req.file.filename}`;
    }

    const updatedFrame = await updateById(FrameCollection, req.params.id, updatedData, 'Frame');
    res.json({ success: true, message: 'Frame updated successfully', updatedFrame });
  },

  deleteFrame: async (req, res) => {
    res.json(await deleteById(FrameCollection, req.params.id, 'Frame'));
  },
});
