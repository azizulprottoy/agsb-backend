const fs = require('fs');
const path = require('path');
const { toPublicUrl } = require('../utils/paths');
const { httpError } = require('../utils/http');
const { requireId, toObjectId } = require('../utils/ids');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');
const {
  privatePath, publicFramePath, placeUpload, makePremium, makeFree, removeOriginal, removeUpload,
} = require('../utils/frameFiles');

const buildFrameData = (body) => ({
  districtSlug: body.districtSlug || '',
  name: body.name || '',
  premium: body.premium === true || body.premium === 'true',
});

// `original` (the private premium file name) never leaves the server.
const publicFrame = ({ original, ...frame }) => ({ ...frame, image: toPublicUrl(frame.image) });

// Same rule as the site: any recorded plan other than "Free" is premium.
const hasPremiumPlan = (user) => {
  const plan = String(user?.plan || '').trim().toLowerCase();
  return plan !== '' && plan !== 'free';
};

module.exports = ({ FrameCollection, UserCollection }) => ({
  getFrames: async (req, res) => {
    const result = await FrameCollection.find().sort({ _id: -1 }).toArray();
    res.json(result.map(publicFrame));
  },

  addFrame: async (req, res) => {
    const newFrame = buildFrameData(req.body);
    Object.assign(newFrame, req.file ? await placeUpload(req.file, newFrame.premium) : { image: '', original: null });

    try {
      const result = await FrameCollection.insertOne(newFrame);
      res.json(insertResponse(result));
    } catch (err) {
      await removeUpload(newFrame.image);
      await removeOriginal(newFrame.original);
      throw err;
    }
  },

  // Only the fields present in the body are changed. Switching premium on or
  // off moves the file between the public and private folders.
  editFrame: async (req, res) => {
    const _id = requireId(req.params.id);
    const existing = await FrameCollection.findOne({ _id });
    if (!existing) throw httpError(404, 'Frame not found');

    const updatedData = pickPresent(buildFrameData(req.body), req.body);
    const premium = 'premium' in updatedData ? updatedData.premium : Boolean(existing.premium);

    if (req.file) {
      Object.assign(updatedData, await placeUpload(req.file, premium));
    } else if (premium && !existing.premium) {
      const moved = await makePremium(existing);
      if (!moved) throw httpError(400, 'Upload the frame image again to make it premium (only uploaded images can be protected)');
      Object.assign(updatedData, moved);
    } else if (!premium && existing.premium && existing.original) {
      const moved = await makeFree(existing);
      if (moved) Object.assign(updatedData, moved);
    }

    // updateById removes the old public image (file or preview) when it changes.
    const updated = await updateById(FrameCollection, req.params.id, updatedData, 'Frame');
    if (existing.original && existing.original !== updated.original) {
      await removeOriginal(existing.original);
    }
    res.json({ success: true, message: 'Frame updated successfully', updatedFrame: publicFrame(updated) });
  },

  deleteFrame: async (req, res) => {
    res.json(await deleteById(FrameCollection, req.params.id, 'Frame', {
      onDeleted: (frame) => removeOriginal(frame.original),
    }));
  },

  // Free frames: anyone. Premium frames: signed-in admins, or users whose
  // plan in the database is a paid one. Served as an attachment.
  downloadFrame: async (req, res) => {
    const id = toObjectId(req.params.id);
    const frame = id && await FrameCollection.findOne({ _id: id });
    if (!frame) throw httpError(404, 'Frame not found');

    const filename = (file) => `agsb-frame-${frame.districtSlug || frame._id}${path.extname(file)}`;

    if (!frame.premium) {
      const file = publicFramePath(frame.image);
      if (file && fs.existsSync(file)) return res.download(file, filename(file));
      if (/^https?:\/\//i.test(frame.image || '')) return res.redirect(frame.image);
      throw httpError(404, 'This frame has no image yet');
    }

    if (!req.user) throw httpError(401, 'Log in to download premium frames');
    if (req.user.role !== 'admin') {
      const user = await UserCollection.findOne({ _id: toObjectId(req.user.userId) }, { projection: { plan: 1 } });
      if (!hasPremiumPlan(user)) throw httpError(403, 'Premium frames need a paid membership');
    }
    const file = frame.original && privatePath(frame.original);
    if (!file || !fs.existsSync(file)) throw httpError(404, 'This frame is not available for download yet');
    res.set('Cache-Control', 'private, no-store');
    res.download(file, filename(file));
  },
});
