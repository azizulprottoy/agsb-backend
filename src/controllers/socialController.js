const { httpError } = require('../utils/http');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

// Platforms the public site has an icon for.
const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'youtube', 'tiktok', 'whatsapp', 'x', 'linkedin', 'website'];

// Only absolute http(s) links: the site renders these as <a href>.
const socialUrl = (val) => {
  if (val === undefined) return undefined;
  const url = String(val).trim();
  let parsed;
  try { parsed = new URL(url); } catch { parsed = null; }
  if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || url.length > 300) {
    throw httpError(400, 'Link must be a full http(s) URL, e.g. https://facebook.com/yourpage');
  }
  return url;
};

const buildSocialData = (body) => ({
  platform: SOCIAL_PLATFORMS.includes(body.platform) ? body.platform : undefined,
  label: String(body.label ?? '').trim().slice(0, 60),
  url: socialUrl(body.url),
  order: Number.isFinite(Number(body.order)) ? Math.trunc(Number(body.order)) : 0,
  active: body.active === undefined ? true : body.active === true || body.active === 'true',
});

module.exports = ({ SocialCollection }) => ({
  // Public list: active links only, in display order.
  getSocials: async (req, res) => {
    res.json(await SocialCollection.find({ active: { $ne: false } }).sort({ order: 1, _id: 1 }).toArray());
  },

  // Admin list (GET /socials/admin): every link, inactive included.
  getAllSocials: async (req, res) => {
    res.json(await SocialCollection.find().sort({ order: 1, _id: 1 }).toArray());
  },

  addSocial: async (req, res) => {
    const data = buildSocialData(req.body);
    if (!data.platform) throw httpError(400, `Platform must be one of: ${SOCIAL_PLATFORMS.join(', ')}`);
    if (!data.url) throw httpError(400, 'Link is required');
    res.json(insertResponse(await SocialCollection.insertOne(data)));
  },

  // Only the fields present in the body are changed.
  editSocial: async (req, res) => {
    const data = pickPresent(buildSocialData(req.body), req.body);
    if ('platform' in req.body && !data.platform) {
      throw httpError(400, `Platform must be one of: ${SOCIAL_PLATFORMS.join(', ')}`);
    }
    await updateById(SocialCollection, req.params.id, data, 'Social link');
    res.json({ success: true, message: 'Social link updated' });
  },

  deleteSocial: async (req, res) => {
    res.json(await deleteById(SocialCollection, req.params.id, 'Social link'));
  },
});
