const { ObjectId } = require('mongodb');

module.exports = ({ UserCollection }) => ({
  getProfile: async (req, res) => {
    try {
      const user = await UserCollection.findOne({ _id: new ObjectId(req.user.userId) });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const { passwordHash, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } catch (err) {
      console.error('Get profile error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const { name, phone, district, visitedDistricts } = req.body;
      const update = {};
      if (name !== undefined) update.name = name;
      if (phone !== undefined) update.phone = phone;
      if (district !== undefined) update.district = district;
      if (visitedDistricts !== undefined) update.visitedDistricts = visitedDistricts;

      await UserCollection.updateOne(
        { _id: new ObjectId(req.user.userId) },
        { $set: update }
      );

      const user = await UserCollection.findOne({ _id: new ObjectId(req.user.userId) });
      const { passwordHash, ...safeUser } = user;
      res.json({ success: true, user: safeUser });
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
});
