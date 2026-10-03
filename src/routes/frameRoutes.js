const { asyncRouter } = require('../utils/asyncRouter');
const frameController = require('../controllers/frameController');
const { verifyToken, optionalAuth, requireAdmin } = require('../middleware/auth');
const { uploadFrame } = require('../middleware/upload');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = frameController(collections);

  router.get('/frames', ctrl.getFrames);
  router.get('/frames/:id/download', optionalAuth, ctrl.downloadFrame);
  router.post('/frames', verifyToken, requireAdmin, uploadFrame.single('image'), ctrl.addFrame);
  router.put('/frames/:id', verifyToken, requireAdmin, uploadFrame.single('image'), ctrl.editFrame);
  router.delete('/frames/:id', verifyToken, requireAdmin, ctrl.deleteFrame);

  return router;
};
