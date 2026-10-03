const { asyncRouter } = require('../utils/asyncRouter');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadRichText } = require('../middleware/upload');

module.exports = () => {
  const router = asyncRouter();

  router.post('/uploadrichtextimage', verifyToken, requireAdmin, uploadRichText.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    res.json({ url: `/uploads/richtext/${req.file.filename}` });
  });

  return router;
};
