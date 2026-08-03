const express = require('express');
const blogController = require('../controllers/blogController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadBlog } = require('../middleware/upload');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = blogController(collections);

  router.get('/blog', ctrl.getBlogPosts);
  router.get('/blog/:slug', ctrl.getBlogPostBySlug);
  router.post('/blog', verifyToken, requireAdmin, uploadBlog.single('image'), ctrl.addBlogPost);
  router.put('/blog/:id', verifyToken, requireAdmin, uploadBlog.single('image'), ctrl.editBlogPost);
  router.delete('/blog/:id', verifyToken, requireAdmin, ctrl.deleteBlogPost);

  return router;
};
