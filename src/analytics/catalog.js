const { ObjectId } = require('mongodb');

// Resolves catalog references (plans, products, districts...) to readable
// analytics fields — planTitle, productName, categoryName, districtName — so
// CC Events can rank them by name. Lookups are cached briefly.

const TTL_MS = 10 * 60 * 1000;
const cache = new Map();

async function cached(key, load) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  const value = await load();
  cache.set(key, { value, expires: Date.now() + TTL_MS });
  return value;
}

const asObjectId = (v) => (v && ObjectId.isValid(String(v)) && String(new ObjectId(String(v))) === String(v) ? new ObjectId(String(v)) : null);
// Match by _id when the ref is an id, else by slug (or any extra field).
const byRef = (ref, extraFields = []) => {
  const id = asObjectId(ref);
  const or = [{ slug: String(ref) }, ...extraFields.map((f) => ({ [f]: String(ref) }))];
  if (id) or.unshift({ _id: id });
  return { $or: or };
};

module.exports = (collections) => {
  const { TravelPlanCollection, ProductCollection, ProductCategoryCollection, DistrictCollection, DivisionCollection, BlogCollection, AttractionCollection } = collections;

  const planFields = (plan) => (plan ? {
    planId: String(plan._id),
    planTitle: plan.title_en,
    planSlug: plan.slug,
    planType: plan.type,
    price: Number(plan.price) || undefined,
    // Plans list districts by name; the first is the main destination.
    districtName: Array.isArray(plan.districts) ? plan.districts[0] : undefined,
    districts: Array.isArray(plan.districts) ? plan.districts.join(', ') : undefined,
    startDate: plan.start_date || undefined,
  } : {});

  async function planInfo(ref) {
    if (!ref) return {};
    return planFields(await cached(`plan:${ref}`, () => TravelPlanCollection.findOne(byRef(ref), { projection: { title_en: 1, slug: 1, type: 1, price: 1, districts: 1, start_date: 1 } })));
  }

  async function categoryName(categoryId) {
    const id = asObjectId(categoryId);
    if (!id) return undefined;
    const cat = await cached(`pcat:${id}`, () => ProductCategoryCollection.findOne({ _id: id }, { projection: { name: 1 } }));
    return cat?.name;
  }

  async function productFields(product) {
    if (!product) return {};
    return {
      productId: String(product._id),
      productName: product.name,
      productSlug: product.slug,
      categoryId: product.category_id ? String(product.category_id) : undefined,
      categoryName: product.category?.name || (await categoryName(product.category_id)),
    };
  }

  async function productInfo(ref) {
    if (!ref) return {};
    return productFields(await cached(`product:${ref}`, () => ProductCollection.findOne(byRef(ref), { projection: { name: 1, slug: 1, category_id: 1 } })));
  }

  async function divisionName(divisionId) {
    const id = asObjectId(divisionId);
    if (!id) return undefined;
    const div = await cached(`division:${id}`, () => DivisionCollection.findOne({ _id: id }, { projection: { name_en: 1 } }));
    return div?.name_en;
  }

  async function districtFields(district) {
    if (!district) return {};
    return {
      districtId: String(district._id),
      districtName: district.name_en,
      districtSlug: district.slug,
      divisionName: await divisionName(district.division_id),
    };
  }

  // A district by id, slug or English name (plans and partners store names).
  async function districtInfo(ref) {
    if (!ref) return {};
    return districtFields(await cached(`district:${ref}`, () => DistrictCollection.findOne(byRef(ref, ['name_en']), { projection: { name_en: 1, slug: 1, division_id: 1 } })));
  }

  // What a review/comment is about: plan, product or blog post.
  async function targetInfo(type, ref) {
    if (type === 'plan') return planInfo(ref);
    if (type === 'product') return productInfo(ref);
    if (type === 'blog') {
      const post = await cached(`blog:${ref}`, () => BlogCollection.findOne(byRef(ref), { projection: { title_en: 1, slug: 1, category: 1, districtSlug: 1 } }));
      return post ? { blogTitle: post.title_en, blogSlug: post.slug, blogCategory: post.category, ...(await districtInfo(post.districtSlug)) } : {};
    }
    return {};
  }

  async function attractionInfo(ref) {
    if (!ref) return {};
    const a = await cached(`attraction:${ref}`, () => AttractionCollection.findOne(byRef(ref), { projection: { name: 1, slug: 1, type: 1, district_id: 1 } }));
    return a ? { attractionId: String(a._id), attractionName: a.name, attractionType: a.type, ...(await districtInfo(a.district_id)) } : {};
  }

  return { planFields, planInfo, productFields, productInfo, districtFields, districtInfo, targetInfo, attractionInfo };
};
