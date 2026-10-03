const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

// Case-insensitive match so existing mixed-case accounts can still sign in.
const EMAIL_COLLATION = { locale: 'en', strength: 2 };
const INVALID_CREDENTIALS = 'Invalid email or password';
// Compared against when the email is unknown so both failure paths take similar time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

// Returns { email, password } or null when either is missing or not a string
// (objects like {"$ne": null} would otherwise be run as query operators).
const readCredentials = (body) => {
  const { email, password } = body || {};
  if (typeof email !== 'string' || typeof password !== 'string') return null;
  const trimmed = email.trim();
  if (!trimmed || !password) return null;
  return { email: trimmed, password };
};

module.exports = ({ AdminCollection, UserCollection }) => ({
  adminLogin: async (req, res) => {
    const creds = readCredentials(req.body);
    if (!creds) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
      const admin = await AdminCollection.findOne({ email: creds.email }, { collation: EMAIL_COLLATION });
      const match = await bcrypt.compare(creds.password, admin?.passwordHash || DUMMY_HASH);
      if (!admin || !match) {
        return res.status(401).json({ success: false, message: INVALID_CREDENTIALS });
      }

      const token = jwt.sign(
        { userId: admin._id, email: admin.email, name: admin.name, role: 'admin' },
        JWT_SECRET,
        { expiresIn: '12h' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: { id: admin._id, name: admin.name, email: admin.email, role: 'admin' },
      });
    } catch (err) {
      console.error('Admin login error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  signup: async (req, res) => {
    const { name, phone, district } = req.body || {};
    const creds = readCredentials(req.body);

    if (!name || !creds) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (typeof name !== 'string' || (phone != null && typeof phone !== 'string') || (district != null && typeof district !== 'string')) {
      return res.status(400).json({ success: false, message: 'Invalid signup details' });
    }
    const email = creds.email.toLowerCase();
    const { password } = creds;

    try {
      const existing = await UserCollection.findOne({ email }, { collation: EMAIL_COLLATION });
      if (existing) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = {
        name,
        email,
        phone: phone || '',
        district: district || '',
        passwordHash,
        plan: 'Explorer',
        joined: new Date().toISOString().slice(0, 10),
        visitedDistricts: [],
      };

      const result = await UserCollection.insertOne(newUser);

      const token = jwt.sign(
        { userId: result.insertedId, email, name, role: 'user' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        success: true,
        message: 'Signup successful',
        token,
        user: { id: result.insertedId, name, email, phone: newUser.phone, district: newUser.district, plan: newUser.plan, joined: newUser.joined, visitedDistricts: [] },
      });
    } catch (err) {
      console.error('Signup error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  login: async (req, res) => {
    const creds = readCredentials(req.body);
    if (!creds) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
      const user = await UserCollection.findOne({ email: creds.email }, { collation: EMAIL_COLLATION });
      const match = await bcrypt.compare(creds.password, user?.passwordHash || DUMMY_HASH);
      if (!user || !match) {
        return res.status(401).json({ success: false, message: INVALID_CREDENTIALS });
      }

      const token = jwt.sign(
        { userId: user._id, email: user.email, name: user.name, role: 'user' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          district: user.district,
          plan: user.plan,
          joined: user.joined,
          visitedDistricts: user.visitedDistricts || [],
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  me: async (req, res) => {
    res.json({ success: true, user: req.user });
  },
});
