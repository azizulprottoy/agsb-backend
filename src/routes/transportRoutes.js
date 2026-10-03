const { asyncRouter } = require('../utils/asyncRouter');
const transportController = require('../controllers/transportController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadTransport } = require('../middleware/upload');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = transportController(collections);

  router.get('/transports', ctrl.getTransports);
  router.post('/transports', verifyToken, requireAdmin, uploadTransport.single('image'), ctrl.addTransport);
  router.put('/transports/:id', verifyToken, requireAdmin, uploadTransport.single('image'), ctrl.editTransport);
  router.delete('/transports/:id', verifyToken, requireAdmin, ctrl.deleteTransport);

  return router;
};
