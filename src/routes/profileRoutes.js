const { asyncRouter } = require('../utils/asyncRouter');
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/auth');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = profileController(collections);

  router.get('/profile', verifyToken, ctrl.getProfile);
  router.patch('/profile', verifyToken, ctrl.updateProfile);

  return router;
};
