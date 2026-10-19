// In-app notifications (the bell on the website) plus push to the user's
// devices. One row per notification in `notifications`:
//   { userId, title, message, data, isRead, createdAt }
// `data` carries tap routing, e.g. { type: 'booking', url: '/bookings/AB12/tickets' }.

const { ObjectId } = require('mongodb');
const { sendPushToUsers } = require('./push');
const { parseListQuery } = require('../utils/pagination');

const MAX_TITLE = 200;
const MAX_MESSAGE = 2000;

// Set once by initNotifications() (index.js, after connectDB).
let Notifications = null;
let Users = null;

const initNotifications = ({ NotificationCollection, UserCollection }) => {
  Notifications = NotificationCollection;
  Users = UserCollection;
};

const asObjectId = (id) => (id instanceof ObjectId ? id : new ObjectId(String(id)));

/**
 * Save an in-app notification for a user and push it to their devices.
 * Awaited and throwing; returns the saved notification, or null when the
 * user doesn't exist.
 */
const sendUserNotification = async (userId, { title, message, data = {} } = {}) => {
  if (!Notifications) throw new Error('Notifications used before initNotifications()');
  const _id = asObjectId(userId);
  const user = await Users.findOne({ _id }, { projection: { _id: 1 } });
  if (!user) return null;

  const doc = {
    userId: _id,
    title: String(title || '').slice(0, MAX_TITLE),
    message: String(message || '').slice(0, MAX_MESSAGE),
    data,
    isRead: false,
    createdAt: new Date(),
  };
  const { insertedId } = await Notifications.insertOne(doc);
  sendPushToUsers([_id], { title: doc.title, body: doc.message, data: { ...data, notificationId: insertedId } });
  return { ...doc, _id: insertedId };
};

/**
 * Fire-and-forget: never throws and never delays the caller's response, so a
 * notification problem can't fail the booking or payment that triggered it.
 * Call it after the action has succeeded, without awaiting it.
 */
const notifyUser = (userId, notification) => {
  if (!userId) return;
  sendUserNotification(userId, notification).catch((err) => {
    console.error('Notify user failed:', err.message);
  });
};

// GET /notifications/me: newest first, ?page&limit, plus the unread count.
const listForUser = async (userId, query = {}) => {
  const { page, limit } = parseListQuery(query);
  const filter = { userId: asObjectId(userId) };
  if (query.unread === 'true') filter.isRead = false;
  const [items, total, unread] = await Promise.all([
    Notifications.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
    Notifications.countDocuments(filter),
    Notifications.countDocuments({ userId: filter.userId, isRead: false }),
  ]);
  return { items, total, unread, page, limit, pages: Math.ceil(total / limit) };
};

// Only the recipient may change or delete their notification; anything else
// reads as "not found".
const setRead = async (userId, id, isRead = true) =>
  Notifications.findOneAndUpdate(
    { _id: id, userId: asObjectId(userId) },
    { $set: { isRead: Boolean(isRead) } },
    { returnDocument: 'after' }
  );

const markAllRead = async (userId) => {
  const result = await Notifications.updateMany({ userId: asObjectId(userId), isRead: false }, { $set: { isRead: true } });
  return result.modifiedCount;
};

const remove = async (userId, id) => {
  const result = await Notifications.deleteOne({ _id: id, userId: asObjectId(userId) });
  return result.deletedCount === 1;
};

module.exports = {
  initNotifications,
  sendUserNotification,
  notifyUser,
  listForUser,
  setRead,
  markAllRead,
  remove,
  MAX_TITLE,
  MAX_MESSAGE,
};
