const { toPublicUrl } = require('../utils/paths');
const { sanitizeRichText } = require('../utils/sanitizeHtml');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');

const buildBlogData = (body) => ({
  title_bn: body.title_bn,
  title_en: body.title_en,
  slug: body.slug,
  category: body.category || 'Guide',
  excerpt: sanitizeRichText(body.excerpt || ''),
  content: sanitizeRichText(body.content || ''),
  date: body.date || new Date().toISOString().slice(0, 10),
  readTime: body.readTime || '',
  districtSlug: body.districtSlug || '',
});

module.exports = ({ BlogCollection }) => ({
  getBlogPosts: async (req, res) => {
    const result = await BlogCollection.find().sort({ date: -1 }).toArray();
    res.json(result.map((b) => ({ ...b, image: toPublicUrl(b.image) })));
  },

  getBlogPostBySlug: async (req, res) => {
    const post = await BlogCollection.findOne({ slug: req.params.slug });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Blog post not found' });
    }
    res.json({ ...post, image: toPublicUrl(post.image) });
  },

  addBlogPost: async (req, res) => {
    const newPost = buildBlogData(req.body);
    newPost.image = req.file ? `/uploads/blog/${req.file.filename}` : '';

    const result = await BlogCollection.insertOne(newPost);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editBlogPost: async (req, res) => {
    const updatedData = pickPresent(buildBlogData(req.body), req.body);
    if (req.file) {
      updatedData.image = `/uploads/blog/${req.file.filename}`;
    }

    const updatedPost = await updateById(BlogCollection, req.params.id, updatedData, 'Blog post');
    res.json({ success: true, message: 'Blog post updated successfully', updatedPost });
  },

  deleteBlogPost: async (req, res) => {
    res.json(await deleteById(BlogCollection, req.params.id, 'Blog post'));
  },
});
