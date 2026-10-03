const { toObjectId } = require('../utils/ids');
const {
  validateName, validateOptionalPhone, validateOptionalDistrict, validateVisitedDistricts,
} = require('../utils/authValidation');

// Profiles belong to site users; an admin token has no user document.
const adminHasNoProfile = (req, res) => {
  if (req.user.role !== 'admin') return false;
  res.status(403).json({ success: false, message: 'Admin accounts have no user profile' });
  return true;
};

const PROFILE_PROJECTION = { projection: { passwordHash: 0, tokenVersion: 0 } };

module.exports = ({ UserCollection }) => ({
  getProfile: async (req, res) => {
    if (adminHasNoProfile(req, res)) return;
    try {
      const userId = toObjectId(String(req.user.userId));
      const user = userId && await UserCollection.findOne({ _id: userId }, PROFILE_PROJECTION);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, user });
    } catch (err) {
      console.error('Get profile error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  updateProfile: async (req, res) => {
    if (adminHasNoProfile(req, res)) return;
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      // Only fields present in the body are validated and updated.
      const validators = {
        name: validateName,
        phone: validateOptionalPhone,
        district: validateOptionalDistrict,
        visitedDistricts: validateVisitedDistricts,
      };
      const update = {};
      for (const [field, validate] of Object.entries(validators)) {
        if (body[field] === undefined) continue;
        const { value, error } = validate(body[field]);
        if (error) return res.status(400).json({ success: false, message: error });
        update[field] = value;
      }

      const userId = toObjectId(String(req.user.userId));
      const user = userId && (Object.keys(update).length
        ? await UserCollection.findOneAndUpdate(
          { _id: userId },
          { $set: update },
          { returnDocument: 'after', ...PROFILE_PROJECTION }
        )
        : await UserCollection.findOne({ _id: userId }, PROFILE_PROJECTION));
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      res.json({ success: true, user });
    } catch (err) {
      console.error('Update profile error:', err);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
});
