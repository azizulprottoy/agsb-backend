const express = require('express');
const profileController = require('../controllers/profileController');
const { verifyToken } = require('../middleware/auth');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = profileController(collections);

  router.get('/profile', verifyToken, ctrl.getProfile);
  router.patch('/profile', verifyToken, ctrl.updateProfile);

  return router;
};
