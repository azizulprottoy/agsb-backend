const express = require('express');
const checkpointController = require('../controllers/checkpointController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = checkpointController(collections);

  router.get('/checkpoints', ctrl.getCheckpoints);
  router.post('/checkpoints', verifyToken, requireAdmin, ctrl.addCheckpoint);
  router.put('/checkpoints/:id', verifyToken, requireAdmin, ctrl.editCheckpoint);
  router.delete('/checkpoints/:id', verifyToken, requireAdmin, ctrl.deleteCheckpoint);

  return router;
};
