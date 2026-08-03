const { ObjectId } = require('mongodb');

module.exports = ({ ContactMessageCollection }) => ({
  submitContact: async (req, res) => {
    try {
      const { name, phone, district, purpose, message } = req.body;

      if (!name || !phone || !message) {
        return res.status(400).json({ success: false, message: 'Name, phone and message are required' });
      }

      const newMessage = {
        name,
        phone,
        district: district || '',
        purpose: purpose || 'general',
        message,
        status: 'new',
        createdAt: new Date().toISOString(),
      };

      const result = await ContactMessageCollection.insertOne(newMessage);
      res.status(201).json({ success: true, message: 'Message sent successfully', insertedId: result.insertedId });
    } catch (err) {
      console.error('Submit contact error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  getContactMessages: async (req, res) => {
    const result = await ContactMessageCollection.find().sort({ _id: -1 }).toArray();
    res.json(result);
  },

  updateContactMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      await ContactMessageCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
      res.json({ success: true, message: 'Message updated successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error updating message' });
    }
  },

  deleteContactMessage: async (req, res) => {
    try {
      const result = await ContactMessageCollection.deleteOne({ _id: new ObjectId(req.params.id) });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: 'Error deleting message' });
    }
  },
});
