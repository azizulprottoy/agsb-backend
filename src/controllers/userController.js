module.exports = ({ UserCollection }) => ({
  getUsers: async (req, res) => {
    try {
      const users = await UserCollection.find().sort({ _id: -1 }).toArray();
      const safeUsers = users.map(({ passwordHash, ...u }) => u);
      res.json(safeUsers);
    } catch (err) {
      console.error('Get users error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
});
