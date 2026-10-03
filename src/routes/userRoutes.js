const { asyncRouter } = require('../utils/asyncRouter');
const userController = require('../controllers/userController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = userController(collections);

  router.get('/users', verifyToken, requireAdmin, ctrl.getUsers);

  return router;
};
