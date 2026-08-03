const express = require('express');
const userController = require('../controllers/userController');
const { verifyToken, requireAdmin } = require('../middleware/auth');

module.exports = (collections) => {
  const router = express.Router();
  const ctrl = userController(collections);

  router.get('/users', verifyToken, requireAdmin, ctrl.getUsers);

  return router;
};
