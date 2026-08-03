const express = require('express');
const divisionController = require('../controllers/divisionController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = divisionController(collections);

  router.get('/divisions', ctrl.getDivisions);
  router.post('/divisions', verifyToken, requireAdmin, ctrl.addDivision);
  router.put('/divisions/:id', verifyToken, requireAdmin, ctrl.editDivision);
  router.delete('/divisions/:id', verifyToken, requireAdmin, ctrl.deleteDivision);

  return router;
};
