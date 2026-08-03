const express = require('express');
const planController = require('../controllers/planController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadPlan } = require('../middleware/upload');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = planController(collections);

  router.get('/plans', ctrl.getPlans);
  router.get('/plans/:slug', ctrl.getPlanBySlug);
  router.post('/plans', verifyToken, requireAdmin, uploadPlan.single('image'), ctrl.addPlan);
  router.put('/plans/:id', verifyToken, requireAdmin, uploadPlan.single('image'), ctrl.editPlan);
  router.delete('/plans/:id', verifyToken, requireAdmin, ctrl.deletePlan);

  return router;
};
