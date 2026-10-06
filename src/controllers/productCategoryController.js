const { httpError } = require('../utils/http');
const { pickPresent, insertResponse, updateById, deleteById, assertUnreferenced } = require('../utils/crud');
const { toPublicUrl } = require('../utils/paths');

const SLUG = /^[a-z0-9-]{1,80}$/;

const categorySlug = (val) => {
  if (val === undefined) return undefined;
  const slug = String(val).trim().toLowerCase();
  if (!SLUG.test(slug)) throw httpError(400, 'Slug must be 1-80 characters: lowercase letters, digits and hyphens only');
  return slug;
};

const buildCategoryData = (body) => ({
  name: String(body.name ?? '').trim().slice(0, 80),
  name_bn: String(body.name_bn ?? '').trim().slice(0, 80),
  slug: categorySlug(body.slug),
  order: Number.isFinite(Number(body.order)) ? Math.trunc(Number(body.order)) : 0,
});

module.exports = ({ ProductCategoryCollection, ProductCollection }) => ({
  getCategories: async (req, res) => {
    const rows = await ProductCategoryCollection.find().sort({ order: 1, name: 1 }).toArray();
    res.json(rows.map((c) => ({ ...c, image: toPublicUrl(c.image) })));
  },

  addCategory: async (req, res) => {
    const data = buildCategoryData(req.body);
    if (!data.name) throw httpError(400, 'Name is required');
    if (!data.slug) throw httpError(400, 'Slug is required');
    data.image = req.file ? `/uploads/productcategories/${req.file.filename}` : '';
    res.json(insertResponse(await ProductCategoryCollection.insertOne(data)));
  },

  // Only the fields present in the body are changed.
  editCategory: async (req, res) => {
    const data = pickPresent(buildCategoryData(req.body), req.body);
    if ('name' in data && !data.name) throw httpError(400, 'Name is required');
    if (req.file) data.image = `/uploads/productcategories/${req.file.filename}`;
    const updatedCategory = await updateById(ProductCategoryCollection, req.params.id, data, 'Category');
    res.json({ success: true, message: 'Category updated', updatedCategory });
  },

  // Blocked while products still use the category.
  deleteCategory: async (req, res) => {
    res.json(await deleteById(ProductCategoryCollection, req.params.id, 'Category', {
      guard: async (category) => {
        const products = await ProductCollection.countDocuments({ category_id: category._id });
        assertUnreferenced('category', [[products, 'product', 'products']]);
      },
    }));
  },
});
