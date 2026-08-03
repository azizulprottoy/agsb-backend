const express = require('express');
const districtController = require('../controllers/districtController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadDistrict } = require('../middleware/upload');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = districtController(collections);

  router.get('/districts', ctrl.getDistricts);
  router.get('/districts/:slug', ctrl.getDistrictBySlug);
  router.post('/districts', verifyToken, requireAdmin, uploadDistrict.single('image'), ctrl.addDistrict);
  router.put('/districts/:id', verifyToken, requireAdmin, uploadDistrict.single('image'), ctrl.editDistrict);
  router.delete('/districts/:id', verifyToken, requireAdmin, ctrl.deleteDistrict);

  return router;
};
