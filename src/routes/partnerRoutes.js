const { asyncRouter } = require('../utils/asyncRouter');
const partnerController = require('../controllers/partnerController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadPartner } = require('../middleware/upload');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = partnerController(collections);

  router.get('/partners', ctrl.getPartners);
  router.post('/partners', verifyToken, requireAdmin, uploadPartner.single('image'), ctrl.addPartner);
  router.put('/partners/:id', verifyToken, requireAdmin, uploadPartner.single('image'), ctrl.editPartner);
  router.delete('/partners/:id', verifyToken, requireAdmin, ctrl.deletePartner);

  return router;
};
