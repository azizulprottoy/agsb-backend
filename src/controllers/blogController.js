const { ObjectId } = require('mongodb');
const { toPublicUrl } = require('../utils/paths');

const buildBlogData = (body) => ({
  title_bn: body.title_bn,
  title_en: body.title_en,
  slug: body.slug,
  category: body.category || 'Guide',
  excerpt: body.excerpt || '',
  content: body.content || '',
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
    try {
      const newPost = buildBlogData(req.body);
      newPost.image = req.file ? `/uploads/blog/${req.file.filename}` : '';

      const result = await BlogCollection.insertOne(newPost);
      res.json(result);
    } catch (err) {
      console.error('Add blog post error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editBlogPost: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = buildBlogData(req.body);
      if (req.file) {
        updatedData.image = `/uploads/blog/${req.file.filename}`;
      }

      await BlogCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'Blog post updated successfully', updatedPost: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit blog post error:', err);
      res.status(500).json({ success: false, message: 'Error updating blog post' });
    }
  },

  deleteBlogPost: async (req, res) => {
    try {
      const result = await BlogCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting blog post' });
    }
  },
});
