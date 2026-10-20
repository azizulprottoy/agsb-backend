const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const { toObjectId } = require('../utils/ids');
const {
  validateName, validateEmail, validateNewPassword, validateOptionalPhone, validateOptionalDistrict,
} = require('../utils/authValidation');
const { sendMailQuietly } = require('../services/mail');
const { welcomeEmail, passwordResetCodeEmail, passwordChangedEmail } = require('../services/emailTemplates');

// Forgot password: a 6-digit code is emailed (valid RESET_CODE_MINUTES,
// MAX_CODE_ATTEMPTS guesses), and a correct code is traded for a reset token
// (valid RESET_TOKEN_MINUTES) that sets the new password. Both are single use.
const RESET_CODE_MINUTES = 10;
const RESET_TOKEN_MINUTES = 15;
const RESEND_AFTER_SECONDS = 60;
const MAX_CODE_ATTEMPTS = 5;
const RESET_CODE_SENT = 'We sent a 6-digit code to your email.';
const NO_ACCOUNT = 'No account found with this email';
const INVALID_CODE = 'The code is wrong or has expired';
const RESET_EXPIRED = 'Your reset session has expired. Please request a new code.';
const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
// Keyed with the server secret: a 6-digit code has too few values for a plain hash.
const hashResetCode = (userId, code) => crypto.createHmac('sha256', JWT_SECRET).update(`${userId}:${code}`).digest('hex');
const safeEqualHex = (a, b) => {
  const x = Buffer.from(String(a), 'hex');
  const y = Buffer.from(String(b), 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

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

module.exports = ({ AdminCollection, UserCollection, PasswordResetCollection, PasswordResetCodeCollection }) => ({
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

  // Step 1: emails a 6-digit code (in the background). Says so when no account
  // uses the email; signup reveals that anyway, and this route is rate limited.
  // Body: { email }
  forgotPassword: async (req, res) => {
    const checked = validateEmail(req.body?.email);
    if (checked.error) return res.status(400).json({ success: false, message: checked.error });
    const answer = () => res.json({
      success: true, message: RESET_CODE_SENT, resendAfterSeconds: RESEND_AFTER_SECONDS, codeMinutes: RESET_CODE_MINUTES,
    });

    const user = await UserCollection.findOne(
      { email: checked.value },
      { collation: EMAIL_COLLATION, projection: { name: 1, email: 1 } }
    );
    if (!user) return res.status(404).json({ success: false, message: NO_ACCOUNT });

    // One live code per user; a new request replaces it, but not more often
    // than every RESEND_AFTER_SECONDS (silently, so mailboxes can't be flooded).
    const now = new Date();
    const existing = await PasswordResetCodeCollection.findOne({ userId: user._id });
    if (existing && now - existing.createdAt < RESEND_AFTER_SECONDS * 1000) return answer();

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await PasswordResetCodeCollection.updateOne(
      { userId: user._id },
      {
        $set: {
          codeHash: hashResetCode(user._id, code),
          attempts: 0,
          createdAt: now,
          expiresAt: new Date(now.getTime() + RESET_CODE_MINUTES * 60 * 1000),
        },
      },
      { upsert: true }
    );
    sendAccountEmail(user, passwordResetCodeEmail(user, code, RESET_CODE_MINUTES));
    answer();
  },

  // Step 2: checks the code and trades it for a short-lived reset token.
  // Body: { email, code } -> { resetToken, expiresInMinutes }
  verifyResetCode: async (req, res) => {
    const checked = validateEmail(req.body?.email);
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    if (checked.error || !/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: INVALID_CODE });

    const user = await UserCollection.findOne({ email: checked.value }, { collation: EMAIL_COLLATION, projection: { _id: 1 } });
    if (!user) return res.status(400).json({ success: false, message: INVALID_CODE });

    // Count the attempt before comparing, atomically, so parallel guesses
    // can't get past the limit.
    const entry = await PasswordResetCodeCollection.findOneAndUpdate(
      { userId: user._id, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_CODE_ATTEMPTS } },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' }
    );
    if (!entry) return res.status(400).json({ success: false, message: INVALID_CODE });

    if (!safeEqualHex(entry.codeHash, hashResetCode(user._id, code))) {
      if (entry.attempts >= MAX_CODE_ATTEMPTS) {
        await PasswordResetCodeCollection.deleteOne({ _id: entry._id });
        return res.status(400).json({ success: false, message: 'Too many wrong codes. Request a new code.' });
      }
      return res.status(400).json({ success: false, message: INVALID_CODE });
    }

    // Single use: only the request that deletes the code gets a token.
    const used = await PasswordResetCodeCollection.deleteOne({ _id: entry._id, codeHash: entry.codeHash });
    if (!used.deletedCount) return res.status(400).json({ success: false, message: INVALID_CODE });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    await PasswordResetCollection.deleteMany({ userId: user._id });
    await PasswordResetCollection.insertOne({
      userId: user._id,
      tokenHash: hashResetToken(resetToken),
      createdAt: now,
      expiresAt: new Date(now.getTime() + RESET_TOKEN_MINUTES * 60 * 1000),
    });
    res.json({ success: true, resetToken, expiresInMinutes: RESET_TOKEN_MINUTES });
  },

  // Step 3: sets the new password and signs out every session.
  // Body: { resetToken, newPassword }. The user signs in again afterwards.
  resetPassword: async (req, res) => {
    const raw = req.body?.resetToken ?? req.body?.token;
    const token = typeof raw === 'string' ? raw.trim() : '';
    const next = validateNewPassword(req.body?.newPassword);
    if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ success: false, message: RESET_EXPIRED });
    if (next.error) return res.status(400).json({ success: false, message: next.error });

    // Deleting the token as it is read makes it single-use, even when it is
    // submitted twice at once.
    const reset = await PasswordResetCollection.findOneAndDelete({
      tokenHash: hashResetToken(token),
      expiresAt: { $gt: new Date() },
    });
    if (!reset) return res.status(400).json({ success: false, message: RESET_EXPIRED });

    const passwordHash = await bcrypt.hash(next.value, 10);
    const updated = await UserCollection.findOneAndUpdate(
      { _id: reset.userId },
      { $set: { passwordHash }, $inc: { tokenVersion: 1 } },
      { returnDocument: 'after', projection: { name: 1, email: 1 } }
    );
    if (!updated) return res.status(400).json({ success: false, message: RESET_EXPIRED });
    await Promise.all([
      PasswordResetCollection.deleteMany({ userId: reset.userId }),
      PasswordResetCodeCollection.deleteMany({ userId: reset.userId }),
    ]);

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
