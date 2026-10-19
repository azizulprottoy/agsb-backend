const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const { toObjectId } = require('../utils/ids');
const {
  validateName, validateEmail, validateNewPassword, validateOptionalPhone, validateOptionalDistrict,
} = require('../utils/authValidation');
const { sendMailQuietly } = require('../services/mail');
const { welcomeEmail, passwordResetEmail, passwordChangedEmail } = require('../services/emailTemplates');

// Password reset links work once, for this long.
const RESET_TOKEN_MINUTES = 30;
const RESET_LINK_SENT = 'If an account exists for that email, we sent a link to reset the password.';
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const sendAccountEmail = (user, email) => {
  if (user?.email) sendMailQuietly({ from: 'no-reply', to: user.email, ...email });
};

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

// `tv` is the account's tokenVersion at issue time; verifyToken rejects the
// token once the account's tokenVersion moves on (see logoutAll).
const signToken = (account, role) => jwt.sign(
  { userId: account._id, email: account.email, name: account.name, role, tv: Number(account.tokenVersion) || 0 },
  JWT_SECRET,
  { expiresIn: role === 'admin' ? '12h' : '7d' }
);

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  district: user.district,
  plan: user.plan,
  joined: user.joined,
  visitedDistricts: user.visitedDistricts || [],
});

module.exports = ({ AdminCollection, UserCollection, PasswordResetCollection }) => ({
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

      const token = signToken(admin, 'admin');

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
    const body = req.body || {};
    if (!body.name || !readCredentials(body)) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    const checks = {
      name: validateName(body.name),
      email: validateEmail(body.email),
      password: validateNewPassword(body.password),
      phone: validateOptionalPhone(body.phone),
      district: validateOptionalDistrict(body.district),
    };
    const failed = Object.values(checks).find((c) => c.error);
    if (failed) return res.status(400).json({ success: false, message: failed.error });
    const name = checks.name.value;
    const email = checks.email.value;
    const password = checks.password.value;

    try {
      const existing = await UserCollection.findOne({ email }, { collation: EMAIL_COLLATION });
      if (existing) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = {
        name,
        email,
        phone: checks.phone.value,
        district: checks.district.value,
        passwordHash,
        tokenVersion: 0,
        plan: 'Free',
        joined: new Date().toISOString().slice(0, 10),
        visitedDistricts: [],
      };

      const result = await UserCollection.insertOne(newUser);

      const created = { ...newUser, _id: result.insertedId };
      const token = signToken(created, 'user');
      sendAccountEmail(created, welcomeEmail(created));

      return res.status(201).json({
        success: true,
        message: 'Signup successful',
        token,
        user: publicUser(created),
      });
    } catch (err) {
      // Lost a race with a concurrent signup for the same email (unique index).
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists' });
      }
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

      const token = signToken(user, 'user');

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: publicUser(user),
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },

  // Fresh account data from the database (never the token's copy).
  me: async (req, res) => {
    const isAdmin = req.user.role === 'admin';
    const collection = isAdmin ? AdminCollection : UserCollection;
    const account = await collection.findOne(
      { _id: toObjectId(req.user.userId) },
      { projection: { passwordHash: 0, tokenVersion: 0 } }
    );
    if (!account) return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    const user = isAdmin
      ? { id: account._id, userId: account._id, name: account.name, email: account.email, role: 'admin' }
      : { ...publicUser(account), userId: account._id, role: 'user' };
    res.json({ success: true, user });
  },

  // Signed-in user changes their password. Every other session is signed out
  // (tokenVersion moves on) and this one gets a fresh token.
  // Body: { currentPassword, newPassword } -> { success, token }
  changePassword: async (req, res) => {
    if (req.user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admin passwords are changed by the seed script' });
    }
    const body = req.body || {};
    const current = typeof body.currentPassword === 'string' ? body.currentPassword : '';
    const next = validateNewPassword(body.newPassword);
    if (next.error) return res.status(400).json({ success: false, message: next.error });

    const _id = toObjectId(req.user.userId);
    const user = _id && await UserCollection.findOne({ _id });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    if (!current || !(await bcrypt.compare(current, user.passwordHash || DUMMY_HASH))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    if (await bcrypt.compare(next.value, user.passwordHash)) {
      return res.status(400).json({ success: false, message: 'New password must be different from the current one' });
    }

    const passwordHash = await bcrypt.hash(next.value, 10);
    const updated = await UserCollection.findOneAndUpdate(
      { _id, passwordHash: user.passwordHash },
      { $set: { passwordHash }, $inc: { tokenVersion: 1 } },
      { returnDocument: 'after' }
    );
    if (!updated) return res.status(409).json({ success: false, message: 'Your password was changed elsewhere. Sign in again.' });
    sendAccountEmail(updated, passwordChangedEmail(updated));
    res.json({ success: true, message: 'Password changed', token: signToken(updated, 'user') });
  },

  // Emails a one-time reset link. Always answers the same way, and sends the
  // email in the background, so the response never reveals whether the
  // address has an account. Body: { email }
  forgotPassword: async (req, res) => {
    const checked = validateEmail(req.body?.email);
    if (checked.error) return res.status(400).json({ success: false, message: checked.error });

    const user = await UserCollection.findOne(
      { email: checked.value },
      { collation: EMAIL_COLLATION, projection: { name: 1, email: 1 } }
    );
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const now = new Date();
      // Only the newest link works.
      await PasswordResetCollection.deleteMany({ userId: user._id });
      await PasswordResetCollection.insertOne({
        userId: user._id,
        tokenHash: hashResetToken(token),
        createdAt: now,
        expiresAt: new Date(now.getTime() + RESET_TOKEN_MINUTES * 60 * 1000),
      });
      sendAccountEmail(user, passwordResetEmail(user, `/reset-password?token=${token}`, RESET_TOKEN_MINUTES));
    }
    res.json({ success: true, message: RESET_LINK_SENT });
  },

  // Sets a new password from a reset link and signs out every session.
  // Body: { token, newPassword }. The user signs in again afterwards.
  resetPassword: async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const next = validateNewPassword(req.body?.newPassword);
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired' });
    }
    if (next.error) return res.status(400).json({ success: false, message: next.error });

    // Deleting the token as it is read makes the link single-use, even when
    // it is submitted twice at once.
    const reset = await PasswordResetCollection.findOneAndDelete({
      tokenHash: hashResetToken(token),
      expiresAt: { $gt: new Date() },
    });
    if (!reset) return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired' });

    const passwordHash = await bcrypt.hash(next.value, 10);
    const updated = await UserCollection.findOneAndUpdate(
      { _id: reset.userId },
      { $set: { passwordHash }, $inc: { tokenVersion: 1 } },
      { returnDocument: 'after', projection: { name: 1, email: 1 } }
    );
    if (!updated) return res.status(400).json({ success: false, message: 'This reset link is invalid or has expired' });
    await PasswordResetCollection.deleteMany({ userId: reset.userId });

    sendAccountEmail(updated, passwordChangedEmail(updated));
    res.json({ success: true, message: 'Password reset. Sign in with your new password.' });
  },

  // Revoke every token issued to the caller (all devices). The caller's own
  // token stops working too; the client should discard it and log in again.
  logoutAll: async (req, res) => {
    const collection = req.user.role === 'admin' ? AdminCollection : UserCollection;
    const result = await collection.updateOne(
      { _id: toObjectId(req.user.userId) },
      { $inc: { tokenVersion: 1 } }
    );
    if (!result.matchedCount) return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    res.json({ success: true, message: 'Logged out from all devices' });
  },
});
