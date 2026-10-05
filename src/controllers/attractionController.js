const { toPublicUrl } = require('../utils/paths');
const { httpError } = require('../utils/http');
const { toObjectId, requireId, optionalRefId } = require('../utils/ids');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');
const { sanitizeRichText } = require('../utils/sanitizeHtml');
const { ATTRACTION_TYPES, ATTRACTION_SLUG } = require('../utils/attractions');

const text = (val, max) => String(val ?? '').trim().slice(0, max);

const attractionSlug = (val) => {
  if (val === undefined) return undefined;
  const slug = String(val).trim().toLowerCase();
  if (!ATTRACTION_SLUG.test(slug)) {
    throw httpError(400, 'Slug must be 1-80 characters: lowercase letters, digits and hyphens only');
  }
  return slug;
};

const buildAttractionData = (body) => ({
  district_id: optionalRefId(body.district_id, 'district_id'),
  name: text(body.name, 120),
  name_bn: text(body.name_bn, 120),
  slug: attractionSlug(body.slug),
  type: ATTRACTION_TYPES.includes(body.type) ? body.type : 'nature',
  desc: text(body.desc, 300),
  location: text(body.location, 200),
  details: sanitizeRichText(typeof body.details === 'string' ? body.details : ''),
  order: Number.isFinite(Number(body.order)) ? Math.trunc(Number(body.order)) : 0,
});

module.exports = ({ AttractionCollection, DistrictCollection }) => {
  // district _id (string) -> { district_slug, district_name_en, district_name_bn }
  const districtInfo = async (ids) => {
    const districts = await DistrictCollection.find(
      { _id: { $in: ids } },
      { projection: { slug: 1, name_en: 1, name_bn: 1 } }
    ).toArray();
    return new Map(districts.map((d) => [String(d._id), {
      district_slug: d.slug || '',
      district_name_en: d.name_en || '',
      district_name_bn: d.name_bn || '',
    }]));
  };

  const withDistrict = (attraction, info) => ({
    ...attraction,
    image: toPublicUrl(attraction.image),
    ...(info.get(String(attraction.district_id)) || { district_slug: '', district_name_en: '', district_name_bn: '' }),
  });

  // Rejects a missing/unknown district: every attraction belongs to one.
  const requireDistrict = async (id) => {
    if (!id) throw httpError(400, 'Select a district');
    if (!(await DistrictCollection.findOne({ _id: id }, { projection: { _id: 1 } }))) {
      throw httpError(400, 'District not found');
    }
  };

  return {
    // ?district=<id or slug> filters; ?details=1 includes the rich text.
    getAttractions: async (req, res) => {
      const filter = {};
      if (req.query.district) {
        const key = String(req.query.district);
        const district = await DistrictCollection.findOne(
          toObjectId(key) ? { _id: toObjectId(key) } : { slug: key },
          { projection: { _id: 1 } }
        );
        if (!district) return res.json([]);
        filter.district_id = district._id;
      }
      const projection = req.query.details ? {} : { details: 0 };
      const attractions = await AttractionCollection.find(filter, { projection })
        .sort({ district_id: 1, order: 1, name: 1 })
        .toArray();
      const info = await districtInfo([...new Set(attractions.map((a) => String(a.district_id)))].map(toObjectId).filter(Boolean));
      res.json(attractions.map((a) => withDistrict(a, info)));
    },

    getAttractionBySlug: async (req, res) => {
      const attraction = await AttractionCollection.findOne({ slug: String(req.params.slug) });
      if (!attraction) throw httpError(404, 'Attraction not found');
      const info = await districtInfo([attraction.district_id].filter(Boolean));
      res.json(withDistrict(attraction, info));
    },

    addAttraction: async (req, res) => {
      const attraction = buildAttractionData(req.body);
      if (!attraction.name) throw httpError(400, 'Name is required');
      if (!attraction.slug) throw httpError(400, 'Slug is required');
      await requireDistrict(attraction.district_id);
      attraction.image = req.file ? `/uploads/attractions/${req.file.filename}` : '';

      const result = await AttractionCollection.insertOne(attraction);
      res.json(insertResponse(result));
    },

    // Only the fields present in the body are changed.
    editAttraction: async (req, res) => {
      requireId(req.params.id);
      const updatedData = pickPresent(buildAttractionData(req.body), req.body);
      if ('name' in updatedData && !updatedData.name) throw httpError(400, 'Name is required');
      if ('district_id' in updatedData) await requireDistrict(updatedData.district_id);
      if (req.file) updatedData.image = `/uploads/attractions/${req.file.filename}`;

      const updatedAttraction = await updateById(AttractionCollection, req.params.id, updatedData, 'Attraction');
      res.json({ success: true, message: 'Attraction updated successfully', updatedAttraction });
    },

    deleteAttraction: async (req, res) => {
      res.json(await deleteById(AttractionCollection, req.params.id, 'Attraction'));
    },
  };
};
