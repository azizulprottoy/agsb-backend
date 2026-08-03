const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

module.exports = ({ AdminCollection, UserCollection }) => ({
  adminLogin: async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
      const admin = await AdminCollection.findOne({ email });
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }

      const match = await bcrypt.compare(password, admin.passwordHash);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
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
    const { name, email, phone, password, district } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }

    try {
      const existing = await UserCollection.findOne({ email });
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
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
      const user = await UserCollection.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
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
