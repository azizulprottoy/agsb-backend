// Firebase Cloud Messaging (push notifications).
// Configured by FIREBASE_SERVICE_ACCOUNT_PATH (path to the service-account
// JSON) or FIREBASE_SERVICE_ACCOUNT (the JSON itself, for hosts that only take
// env vars). When neither is set, pushes are a silent no-op, so local dev
// works without Firebase.
//
// Tokens are FCM registration tokens (web: getToken() with the VAPID key;
// a future mobile app: FirebaseMessaging.getToken()), one row per device in
// `devicetokens`.
//
// Every send is fire-and-forget: it never throws. Failures are only logged.

const fs = require('fs');
const admin = require('firebase-admin');
const { webAppUrl } = require('./links');

// FCM accepts at most 500 tokens per multicast.
const MAX_TOKENS_PER_SEND = 500;
const DEAD_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);
const PLATFORMS = ['web', 'android', 'ios'];
const MAX_TOKEN_LENGTH = 4096;

// Set once by initPush() (index.js, after connectDB).
let DeviceTokens = null;
let messaging;
let warnedUnconfigured = false;

const initPush = ({ DeviceTokenCollection }) => {
  DeviceTokens = DeviceTokenCollection;
};

const loadServiceAccount = () => {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) return JSON.parse(fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8'));
  return null;
};

const getMessaging = () => {
  if (messaging !== undefined) return messaging;
  try {
    const serviceAccount = loadServiceAccount();
    if (!serviceAccount) {
      if (!warnedUnconfigured) {
        console.warn('Firebase not configured (FIREBASE_SERVICE_ACCOUNT_PATH / FIREBASE_SERVICE_ACCOUNT); push notifications are not sent.');
        warnedUnconfigured = true;
      }
      return (messaging = null);
    }
    const app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messaging = admin.messaging(app);
  } catch (err) {
    console.error('Firebase init failed:', err.message);
    messaging = null;
  }
  return messaging;
};

// Returns the cleaned { token, platform } or { error }.
const validateDeviceToken = ({ token, platform } = {}) => {
  if (typeof token !== 'string' || !token.trim() || token.length > MAX_TOKEN_LENGTH) return { error: 'token is required' };
  const p = platform === undefined || platform === '' ? 'web' : platform;
  if (!PLATFORMS.includes(p)) return { error: `platform must be one of ${PLATFORMS.join(', ')}` };
  return { token: token.trim(), platform: p };
};

// Save a device's token for a user. Re-registering moves the token to this
// user (the device was signed in as someone else before).
const registerDeviceToken = async (userId, token, platform) => {
  const now = new Date();
  await DeviceTokens.updateOne(
    { token },
    { $set: { userId, platform, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true }
  );
};

// Forget a device's token (logout). Only the owner can remove it.
const removeDeviceToken = async (userId, token) => {
  await DeviceTokens.deleteOne({ userId, token });
};

// FCM data values must be strings.
const stringifyData = (data = {}) =>
  Object.fromEntries(Object.entries(data).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]));

/**
 * Push to every device of one or more users.
 * `data.url` (an app path such as /bookings/AB12CD/tickets) is where a click
 * on the notification opens. Always resolves; callers don't need to await it.
 */
const sendPushToUsers = async (userIds, { title, body, data = {} } = {}) => {
  try {
    const fcm = getMessaging();
    if (!fcm || !DeviceTokens) return;

    const ids = [].concat(userIds).filter(Boolean);
    if (!ids.length) return;
    const devices = await DeviceTokens.find({ userId: { $in: ids } }, { projection: { token: 1 } }).toArray();
    const tokens = devices.map((d) => d.token);
    const link = webAppUrl(data.url);

    for (let i = 0; i < tokens.length; i += MAX_TOKENS_PER_SEND) {
      const batch = tokens.slice(i, i + MAX_TOKENS_PER_SEND);
      const res = await fcm.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: stringifyData(data),
        webpush: {
          notification: { icon: webAppUrl('/favicon.png') },
          ...(link.startsWith('https://') ? { fcmOptions: { link } } : {}),
        },
        android: { priority: 'high', notification: { channelId: 'agsb_default', sound: 'default' } },
        apns: { payload: { aps: { sound: 'default' } } },
      });

      const dead = batch.filter((_, idx) => DEAD_TOKEN_CODES.has(res.responses[idx].error?.code));
      if (dead.length) await DeviceTokens.deleteMany({ token: { $in: dead } });
    }
  } catch (err) {
    console.error('Push send failed:', err.message);
  }
};

module.exports = { initPush, validateDeviceToken, registerDeviceToken, removeDeviceToken, sendPushToUsers };
