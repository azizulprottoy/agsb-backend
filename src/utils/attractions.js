// Shared by the attractions API, the migration out of districts and the seeds.
const ATTRACTION_TYPES = ['nature', 'historical', 'religious', 'cultural', 'food', 'market'];
const ATTRACTION_SLUG = /^[a-z0-9-]{1,80}$/;

// "Lalon Shah Mazar, Chheuria" -> "lalon-shah-mazar-chheuria"
const slugify = (text) => String(text || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80)
  .replace(/-+$/g, '');

// Attraction documents for a district's old embedded `attractions` array
// ({ name, type, desc, details? }). `taken` is a Set of slugs already in use;
// it is updated, and a clashing slug gets the district slug appended.
const docsFromEmbedded = (district, taken) => (Array.isArray(district.attractions) ? district.attractions : [])
  .filter((a) => a && String(a.name || '').trim())
  .map((a, order) => {
    const name = String(a.name).trim();
    let slug = slugify(name) || `${district.slug}-attraction`;
    if (taken.has(slug)) slug = `${slug}-${district.slug}`.slice(0, 80);
    for (let n = 2; taken.has(slug); n++) slug = `${slugify(name).slice(0, 70)}-${district.slug}-${n}`.slice(0, 80);
    taken.add(slug);
    return {
      district_id: district._id,
      name,
      name_bn: '',
      slug,
      type: ATTRACTION_TYPES.includes(a.type) ? a.type : 'nature',
      desc: String(a.desc || '').trim(),
      location: '',
      details: typeof a.details === 'string' ? a.details : '',
      image: '',
      order,
    };
  });

module.exports = { ATTRACTION_TYPES, ATTRACTION_SLUG, slugify, docsFromEmbedded };
