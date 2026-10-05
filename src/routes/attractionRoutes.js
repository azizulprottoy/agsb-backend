const { asyncRouter } = require('../utils/asyncRouter');
const attractionController = require('../controllers/attractionController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadAttraction } = require('../middleware/upload');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = attractionController(collections);

  router.get('/attractions', ctrl.getAttractions);
  router.get('/attractions/:slug', ctrl.getAttractionBySlug);
  router.post('/attractions', verifyToken, requireAdmin, uploadAttraction.single('image'), ctrl.addAttraction);
  router.put('/attractions/:id', verifyToken, requireAdmin, uploadAttraction.single('image'), ctrl.editAttraction);
  router.delete('/attractions/:id', verifyToken, requireAdmin, ctrl.deleteAttraction);

  return router;
};
