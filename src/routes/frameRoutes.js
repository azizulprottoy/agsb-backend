const express = require('express');
const frameController = require('../controllers/frameController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadFrame } = require('../middleware/upload');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = frameController(collections);

  router.get('/frames', ctrl.getFrames);
  router.post('/frames', verifyToken, requireAdmin, uploadFrame.single('image'), ctrl.addFrame);
  router.put('/frames/:id', verifyToken, requireAdmin, uploadFrame.single('image'), ctrl.editFrame);
  router.delete('/frames/:id', verifyToken, requireAdmin, ctrl.deleteFrame);

  return router;
};
