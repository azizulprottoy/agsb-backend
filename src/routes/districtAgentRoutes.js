const express = require('express');
const districtAgentController = require('../controllers/districtAgentController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadDistrictAgent } = require('../middleware/upload');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = districtAgentController(collections);

  router.get('/district-agents', ctrl.getDistrictAgents);
  router.post('/district-agents', verifyToken, requireAdmin, uploadDistrictAgent.single('image'), ctrl.addDistrictAgent);
  router.put('/district-agents/:id', verifyToken, requireAdmin, uploadDistrictAgent.single('image'), ctrl.editDistrictAgent);
  router.delete('/district-agents/:id', verifyToken, requireAdmin, ctrl.deleteDistrictAgent);

  return router;
};
