const { asyncRouter } = require('../utils/asyncRouter');
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = dashboardController(collections);

  router.get('/dashboard', verifyToken, requireAdmin, ctrl.getDashboard);

  return router;
};
