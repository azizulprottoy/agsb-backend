const { asyncRouter } = require('../utils/asyncRouter');
const socialController = require('../controllers/socialController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = socialController(collections);

  router.get('/socials', ctrl.getSocials);
  // Declared before any '/socials/:id' route.
  router.get('/socials/admin', verifyToken, requireAdmin, ctrl.getAllSocials);
  router.post('/socials', verifyToken, requireAdmin, ctrl.addSocial);
  router.put('/socials/:id', verifyToken, requireAdmin, ctrl.editSocial);
  router.delete('/socials/:id', verifyToken, requireAdmin, ctrl.deleteSocial);

  return router;
};
