const { asyncRouter } = require('../utils/asyncRouter');
const guideController = require('../controllers/guideController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadGuide } = require('../middleware/upload');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = guideController(collections);

  router.get('/guides', ctrl.getGuides);
  router.post('/guides', verifyToken, requireAdmin, uploadGuide.single('image'), ctrl.addGuide);
  router.put('/guides/:id', verifyToken, requireAdmin, uploadGuide.single('image'), ctrl.editGuide);
  router.delete('/guides/:id', verifyToken, requireAdmin, ctrl.deleteGuide);

  return router;
};
