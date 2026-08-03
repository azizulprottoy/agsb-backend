const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = dashboardController(collections);

  router.get('/dashboard', verifyToken, requireAdmin, ctrl.getDashboard);

  return router;
};
