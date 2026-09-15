const { ObjectId } = require('mongodb');
const { toPublicUrl } = require('../utils/paths');

const parseJsonField = (val, fallback) => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

const buildHotelData = (body) => ({
  name: body.name,
  district_id: body.district_id ? new ObjectId(body.district_id) : null,
  type: body.type || 'hotel',
  rating: Number(body.rating) || 0,
  price: body.price || '',
  contact: body.contact || '',
  address: body.address || '',
  amenities: parseJsonField(body.amenities, []),
  verified: body.verified === true || body.verified === 'true',
});

module.exports = ({ HotelCollection }) => ({
  getHotels: async (req, res) => {
    const result = await HotelCollection.find().sort({ _id: -1 }).toArray();
    res.json(result.map((h) => ({ ...h, image: toPublicUrl(h.image) })));
  },

  addHotel: async (req, res) => {
    try {
      const newHotel = buildHotelData(req.body);
      newHotel.image = req.file ? `/uploads/hotels/${req.file.filename}` : '';

      const result = await HotelCollection.insertOne(newHotel);
      res.json(result);
    } catch (err) {
      console.error('Add hotel error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  editHotel: async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = buildHotelData(req.body);
      if (req.file) {
        updatedData.image = `/uploads/hotels/${req.file.filename}`;
      }

      await HotelCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
      res.json({ success: true, message: 'Hotel updated successfully', updatedHotel: { _id: id, ...updatedData } });
    } catch (err) {
      console.error('Edit hotel error:', err);
      res.status(500).json({ success: false, message: 'Error updating hotel' });
    }
  },

  deleteHotel: async (req, res) => {
    try {
      const result = await HotelCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting hotel' });
    }
  },
});
