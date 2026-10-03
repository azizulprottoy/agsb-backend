const { toPublicUrl } = require('../utils/paths');
const { optionalRefId } = require('../utils/ids');
const { pickPresent, insertResponse, updateById, deleteById } = require('../utils/crud');
const { parseJsonField } = require('../utils/json');

const buildHotelData = (body) => ({
  name: body.name,
  district_id: optionalRefId(body.district_id, 'district_id'),
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
    const newHotel = buildHotelData(req.body);
    newHotel.image = req.file ? `/uploads/hotels/${req.file.filename}` : '';

    const result = await HotelCollection.insertOne(newHotel);
    res.json(insertResponse(result));
  },

  // Only the fields present in the body are changed.
  editHotel: async (req, res) => {
    const updatedData = pickPresent(buildHotelData(req.body), req.body);
    if (req.file) {
      updatedData.image = `/uploads/hotels/${req.file.filename}`;
    }

    const updatedHotel = await updateById(HotelCollection, req.params.id, updatedData, 'Hotel');
    res.json({ success: true, message: 'Hotel updated successfully', updatedHotel });
  },

  deleteHotel: async (req, res) => {
    res.json(await deleteById(HotelCollection, req.params.id, 'Hotel'));
  },
});
