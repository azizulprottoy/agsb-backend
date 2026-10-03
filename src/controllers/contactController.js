const { ObjectId } = require('mongodb');
const { validateContact, CONTACT_STATUSES } = require('../utils/contactValidation');
const { sendList } = require('../utils/pagination');

// Strict ObjectId check: rejects 12-char strings that isValid() would accept.
const parseId = (v) => (typeof v === 'string' && ObjectId.isValid(v) && String(new ObjectId(v)) === v ? new ObjectId(v) : null);

const CONTACT_SEARCH_FIELDS = ['name', 'phone', 'message', 'district'];

module.exports = ({ ContactMessageCollection }) => ({
  submitContact: async (req, res) => {
    try {
      const { value, error } = validateContact(req.body);
      if (error) return res.status(400).json({ success: false, message: error });

      const newMessage = {
        ...value,
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
    await sendList(req, res, ContactMessageCollection, { searchFields: CONTACT_SEARCH_FIELDS });
  },

  updateContactMessage: async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const { status } = req.body || {};
      if (!CONTACT_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Status must be one of: ${CONTACT_STATUSES.join(', ')}` });
      }

      const result = await ContactMessageCollection.updateOne({ _id: id }, { $set: { status } });
      if (!result.matchedCount) return res.status(404).json({ success: false, message: 'Message not found' });
      res.json({ success: true, message: 'Message updated successfully' });
    } catch (err) {
      console.error('Update contact error:', err);
      res.status(500).json({ success: false, message: 'Error updating message' });
    }
  },

  deleteContactMessage: async (req, res) => {
    try {
      const id = parseId(req.params.id);
      if (!id) return res.status(400).json({ success: false, message: 'Invalid id' });
      const result = await ContactMessageCollection.deleteOne({ _id: id });
      if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Message not found' });
      // Keeps the DeleteResult fields (acknowledged, deletedCount) the admin already reads.
      res.json({ success: true, message: 'Message deleted', acknowledged: result.acknowledged, deletedCount: result.deletedCount });
    } catch (err) {
      console.error('Delete contact error:', err);
      res.status(500).json({ success: false, message: 'Error deleting message' });
    }
  },
});
