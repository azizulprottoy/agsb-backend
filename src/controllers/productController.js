const { httpError } = require('../utils/http');
const { toObjectId, requireId, optionalRefId } = require('../utils/ids');
const { insertResponse, deleteById } = require('../utils/crud');
const { removeUpload } = require('../utils/files');
const { toPublicUrl } = require('../utils/paths');
const { sanitizeRichText } = require('../utils/sanitizeHtml');
const { MAX_PRODUCT_IMAGES } = require('../middleware/upload');

const SLUG = /^[a-z0-9-]{1,80}$/;
const MAX_TAGS = 15;
const MAX_OPTIONS = 4;
const MAX_OPTION_VALUES = 20;

const text = (val, max) => String(val ?? '').trim().slice(0, max);

// Multipart forms send arrays/objects as JSON strings.
const parseJson = (val, field, fallback) => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    throw httpError(400, `Invalid ${field}`);
  }
};

// Blank -> null (not offered); otherwise a whole taka amount above 0.
const money = (val, field) => {
  if (val === undefined || val === null || val === '' || val === 'null') return null;
  const n = Number(val);
  if (!Number.isFinite(n) || n <= 0) throw httpError(400, `${field} must be more than 0, or left blank`);
  return Math.round(n);
};

const count = (val, field) => {
  if (val === undefined || val === null || val === '') return 0;
  const n = Number(val);
  if (!Number.isInteger(n) || n < 0) throw httpError(400, `${field} must be a whole number, 0 or more`);
  return n;
};

// A list, a JSON list, or "a, b, c".
const toTags = (val) => {
  let items = val;
  if (typeof val === 'string') {
    try { items = JSON.parse(val); } catch { items = val.split(','); }
  }
  if (!Array.isArray(items)) items = items == null ? [] : String(items).split(',');
  return [...new Set(items.map((t) => text(t, 30)).filter(Boolean))].slice(0, MAX_TAGS);
};

// [{ name: 'Size', values: ['S', 'M'] }] — choices the customer picks from.
const toOptions = (val) => {
  const list = parseJson(val, 'options', []);
  if (!Array.isArray(list)) throw httpError(400, 'Options must be a list');
  return list.slice(0, MAX_OPTIONS).map((o) => ({
    name: text(o?.name, 30),
    values: [...new Set((Array.isArray(o?.values) ? o.values : []).map((v) => text(v, 40)).filter(Boolean))].slice(0, MAX_OPTION_VALUES),
  })).filter((o) => o.name && o.values.length);
};

const productSlug = (val) => {
  const slug = String(val ?? '').trim().toLowerCase();
  if (!SLUG.test(slug)) throw httpError(400, 'Slug must be 1-80 characters: lowercase letters, digits and hyphens only');
  return slug;
};

const truthy = (val) => val === true || val === 'true';

// Builders for each field a body may carry, so add and edit share validation.
const FIELDS = {
  name: (b) => text(b.name, 120),
  name_bn: (b) => text(b.name_bn, 120),
  slug: (b) => productSlug(b.slug),
  category_id: (b) => optionalRefId(b.category_id, 'category'),
  summary: (b) => text(b.summary, 300),
  description: (b) => sanitizeRichText(typeof b.description === 'string' ? b.description : ''),
  tags: (b) => toTags(b.tags),
  options: (b) => toOptions(b.options),
  salePrice: (b) => money(b.salePrice, 'Sale price'),
  saleStock: (b) => count(b.saleStock, 'Stock'),
  rentPerDay: (b) => money(b.rentPerDay, 'Rent per day'),
  rentDeposit: (b) => (b.rentDeposit === '' || b.rentDeposit === undefined || b.rentDeposit === null ? 0 : count(b.rentDeposit, 'Deposit')),
  rentStock: (b) => count(b.rentStock, 'Rental units'),
  deliveryTime: (b) => text(b.deliveryTime, 60),
  active: (b) => (b.active === undefined ? true : truthy(b.active)),
  featured: (b) => truthy(b.featured),
  order: (b) => (Number.isFinite(Number(b.order)) ? Math.trunc(Number(b.order)) : 0),
};

const build = (body, onlyPresent) => Object.fromEntries(
  Object.entries(FIELDS)
    .filter(([key]) => !onlyPresent || body[key] !== undefined)
    .map(([key, fn]) => [key, fn(body)])
);

const assertSellable = (p) => {
  if (!p.name) throw httpError(400, 'Name is required');
  if (p.salePrice === null && p.rentPerDay === null) throw httpError(400, 'Set a sale price, a rent per day, or both');
};

const publicProduct = (p) => ({ ...p, images: (p.images || []).map(toPublicUrl) });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = ({ ProductCollection, ProductCategoryCollection }) => {
  const requireCategory = async (id) => {
    if (id && !(await ProductCategoryCollection.findOne({ _id: id }, { projection: { _id: 1 } }))) {
      throw httpError(400, 'Category not found');
    }
  };

  // Public list filter. ?category=<id or slug> ?mode=buy|rent ?q=text ?featured=1
  const listFilter = async (query) => {
    const filter = { active: { $ne: false } };
    if (query.category) {
      const key = String(query.category);
      const category = await ProductCategoryCollection.findOne(toObjectId(key) ? { _id: toObjectId(key) } : { slug: key }, { projection: { _id: 1 } });
      if (!category) return null;
      filter.category_id = category._id;
    }
    if (query.mode === 'buy') filter.salePrice = { $gt: 0 };
    if (query.mode === 'rent') filter.rentPerDay = { $gt: 0 };
    if (query.featured) filter.featured = true;
    const q = String(query.q || '').trim().slice(0, 100);
    if (q) filter.$or = ['name', 'name_bn', 'tags'].map((f) => ({ [f]: { $regex: escapeRegex(q), $options: 'i' } }));
    return filter;
  };

  return {
    getProducts: async (req, res) => {
      const filter = await listFilter(req.query);
      if (!filter) return res.json([]);
      const rows = await ProductCollection.find(filter, { projection: { description: 0 } })
        .sort({ featured: -1, order: 1, _id: -1 }).toArray();
      res.json(rows.map(publicProduct));
    },

    // Admin list: every product, inactive included.
    getAllProducts: async (req, res) => {
      const rows = await ProductCollection.find().sort({ order: 1, _id: -1 }).toArray();
      res.json(rows.map(publicProduct));
    },

    getProductBySlug: async (req, res) => {
      const product = await ProductCollection.findOne({ slug: String(req.params.slug), active: { $ne: false } });
      if (!product) throw httpError(404, 'Product not found');
      const category = product.category_id
        ? await ProductCategoryCollection.findOne({ _id: product.category_id }, { projection: { name: 1, name_bn: 1, slug: 1 } })
        : null;
      res.json({ ...publicProduct(product), category });
    },

    // multipart: fields + up to MAX_PRODUCT_IMAGES files in `images`.
    addProduct: async (req, res) => {
      const product = build(req.body, false);
      assertSellable(product);
      await requireCategory(product.category_id);
      product.images = (req.files || []).map((f) => `/uploads/products/${f.filename}`);
      product.createdAt = new Date().toISOString();
      res.json(insertResponse(await ProductCollection.insertOne(product)));
    },

    // Only the fields present in the body are changed. Images: `keepImages`
    // (JSON list of current image URLs to keep, in order) plus new files.
    // Without keepImages the current images are kept and new files appended.
    editProduct: async (req, res) => {
      const _id = requireId(req.params.id);
      const existing = await ProductCollection.findOne({ _id });
      if (!existing) throw httpError(404, 'Product not found');

      const update = build(req.body, true);
      assertSellable({ ...existing, ...update });
      if ('category_id' in update) await requireCategory(update.category_id);

      const current = existing.images || [];
      let removed = [];
      if (req.body.keepImages !== undefined || req.files?.length) {
        let kept = current;
        if (req.body.keepImages !== undefined) {
          const wanted = new Set(parseJson(req.body.keepImages, 'keepImages', []).map(String));
          kept = current.filter((img) => wanted.has(img) || wanted.has(toPublicUrl(img)));
        }
        const images = [...kept, ...(req.files || []).map((f) => `/uploads/products/${f.filename}`)];
        if (images.length > MAX_PRODUCT_IMAGES) throw httpError(400, `A product can have at most ${MAX_PRODUCT_IMAGES} images`);
        update.images = images;
        removed = current.filter((img) => !kept.includes(img));
      }
      update.updatedAt = new Date().toISOString();

      await ProductCollection.updateOne({ _id }, { $set: update });
      await Promise.all(removed.map(removeUpload));
      res.json({ success: true, message: 'Product updated', updatedProduct: publicProduct({ ...existing, ...update }) });
    },

    deleteProduct: async (req, res) => {
      res.json(await deleteById(ProductCollection, req.params.id, 'Product', {
        onDeleted: async (doc) => { await Promise.all((doc.images || []).map(removeUpload)); },
      }));
    },
  };
};
