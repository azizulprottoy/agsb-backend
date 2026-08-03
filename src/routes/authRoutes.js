const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = authController(collections);

  router.post('/auth/admin/login', ctrl.adminLogin);
  router.post('/auth/signup', ctrl.signup);
  router.post('/auth/login', ctrl.login);
  router.get('/auth/me', verifyToken, ctrl.me);

  return router;
};
