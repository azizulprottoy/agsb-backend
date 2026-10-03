const { asyncRouter } = require('../utils/asyncRouter');
const hotelController = require('../controllers/hotelController');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadHotel } = require('../middleware/upload');

module.exports = (collections) => {
  const router = asyncRouter();
  const ctrl = hotelController(collections);

  router.get('/hotels', ctrl.getHotels);
  router.post('/hotels', verifyToken, requireAdmin, uploadHotel.single('image'), ctrl.addHotel);
  router.put('/hotels/:id', verifyToken, requireAdmin, uploadHotel.single('image'), ctrl.editHotel);
  router.delete('/hotels/:id', verifyToken, requireAdmin, ctrl.deleteHotel);

  return router;
};
