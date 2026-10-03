const { toPublicUrl } = require('../utils/paths');
const { optionalRefId } = require('../utils/ids');
const { pickPresent, insertResponse, updateById, deleteById, assertUnreferenced } = require('../utils/crud');
const { parseJsonField } = require('../utils/json');

const buildDistrictData = (body) => ({
  division_id: optionalRefId(body.division_id, 'division_id'),
  name_bn: body.name_bn,
  name_en: body.name_en,
  slug: body.slug,
  tagline: body.tagline || '',
  trip_type: String(body.trip_type || '').trim().slice(0, 40),
  best_time: body.best_time || '',
  budget: body.budget || '',
  difficulty: Number(body.difficulty) || 1,
  family: body.family === true || body.family === 'true',
  lat: Number(body.lat) || 0,
  lng: Number(body.lng) || 0,
  status: body.status || 'skeleton',
  attractions: parseJsonField(body.attractions, []),
  food: parseJsonField(body.food, []),
  transport: body.transport || '',
});

// Counts of records that point at a district, by id (hotels, agents,
// checkpoints, transports, guides), by slug (frames, blog posts) or by English
// name (travel plans' `districts`, partners' `district`, which the admin panel
// fills with name_en).
const countDistrictReferences = async (district, c) => {
  const ids = [district._id, String(district._id)];
  const idRef = { $in: ids };
  const slug = district.slug || null;
  const names = [district.name_en, district.slug].filter(Boolean);
  const bySlug = (field) => (slug ? { [field]: slug } : null);
  const count = (collection, filter) => (filter ? collection.countDocuments(filter) : 0);

  const counts = await Promise.all([
    count(c.HotelCollection, { district_id: idRef }),
    count(c.DistrictAgentCollection, { district_id: idRef }),
    count(c.CheckpointCollection, { district_id: idRef }),
    count(c.TransportCollection, { $or: [{ from_district_id: idRef }, { to_district_id: idRef }] }),
    count(c.GuideCollection, { district_ids: idRef }),
    count(c.FrameCollection, bySlug('districtSlug')),
    count(c.BlogCollection, bySlug('districtSlug')),
    count(c.TravelPlanCollection, names.length ? { districts: { $in: names } } : null),
    count(c.PartnerCollection, names.length ? { district: { $in: names } } : null),
  ]);
  const labels = [
    ['hotel', 'hotels'], ['district agent', 'district agents'], ['checkpoint', 'checkpoints'],
    ['transport', 'transports'], ['guide', 'guides'], ['frame', 'frames'],
    ['blog post', 'blog posts'], ['travel plan', 'travel plans'], ['partner', 'partners'],
  ];
  return counts.map((n, i) => [n, ...labels[i]]);
};

module.exports = (collections) => {
  const { DistrictCollection } = collections;
  return {
    getDistricts: async (req, res) => {
      const result = await DistrictCollection.find().sort({ name_en: 1 }).toArray();
      res.json(result.map((d) => ({ ...d, image: toPublicUrl(d.image) })));
    },

    getDistrictBySlug: async (req, res) => {
      const district = await DistrictCollection.findOne({ slug: req.params.slug });
      if (!district) {
        return res.status(404).json({ success: false, message: 'District not found' });
      }
      res.json({ ...district, image: toPublicUrl(district.image) });
    },

    addDistrict: async (req, res) => {
      const newDistrict = buildDistrictData(req.body);
      newDistrict.image = req.file ? `/uploads/districts/${req.file.filename}` : '';

      const result = await DistrictCollection.insertOne(newDistrict);
      res.json(insertResponse(result));
    },

    // Only the fields present in the body are changed.
    editDistrict: async (req, res) => {
      const updatedData = pickPresent(buildDistrictData(req.body), req.body);
      if (req.file) {
        updatedData.image = `/uploads/districts/${req.file.filename}`;
      }

      const updatedDistrict = await updateById(DistrictCollection, req.params.id, updatedData, 'District');
      res.json({ success: true, message: 'District updated successfully', updatedDistrict });
    },

    deleteDistrict: async (req, res) => {
      // Blocked while anything still references this district.
      res.json(await deleteById(DistrictCollection, req.params.id, 'District', {
        guard: async (district) => {
          assertUnreferenced('district', await countDistrictReferences(district, collections));
        },
      }));
    },
  };
};
