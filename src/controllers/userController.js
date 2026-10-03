const { sendList } = require('../utils/pagination');

const USER_SEARCH_FIELDS = ['name', 'email', 'phone'];

module.exports = ({ UserCollection }) => ({
  getUsers: async (req, res) => {
    try {
      await sendList(req, res, UserCollection, {
        searchFields: USER_SEARCH_FIELDS,
        projection: { passwordHash: 0 },
      });
    } catch (err) {
      console.error('Get users error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
});
