const { ObjectId } = require('mongodb');
const { httpError } = require('../utils/http');
const { toObjectId, requireId } = require('../utils/ids');
const { sendList } = require('../utils/pagination');

// Reviews and comments on trip plans, products and blog posts, kept in one
// collection:
// - kind 'review':  a 1-5 star rating with optional text; one per user per
//   item (posting again replaces it). Visible ratings are summed into
//   `rating: { avg, count }` on the item, so list pages can show stars.
// - kind 'comment': text only; a user can post any number.
// Anyone can read. Posting (review or comment) on trip plans and products
// needs a completed booking / order for that item; blog posts are open to
// any signed-in traveller.
// Everything is published at once; admins can hide or delete entries.

const KINDS = ['review', 'comment'];
const STATUSES = ['visible', 'hidden'];
const MAX_BODY = 2000;
const PUBLIC_LIMIT = 100;


const targetsFor = (c) => ({
  plan: { collection: c.TravelPlanCollection, title: (d) => d.title_en || d.title_bn || d.slug },
  product: { collection: c.ProductCollection, title: (d) => d.name || d.name_bn || d.slug },
  blog: { collection: c.BlogCollection, title: (d) => d.title_en || d.title_bn || d.slug },
});

// Plain text: trim, drop control characters (newlines kept), cap the length.
const cleanBody = (value) => String(value ?? '')
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .replace(/\n{3,}/g, '\n\n')
  .trim()
  .slice(0, MAX_BODY);

// What visitors see: no user ids or emails.
const publicEntry = (r) => ({
  _id: r._id,
  kind: r.kind,
  rating: r.rating ?? null,
  body: r.body,
  userName: r.userName,
  verified: Boolean(r.verified),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt || null,
});

module.exports = (collections) => {
  const { ReviewCollection, BookingCollection, OrderCollection } = collections;
  const TARGETS = targetsFor(collections);

  // :type/:target (slug or id) -> { type, doc }. Unknown type or item -> 404.
  const findTarget = async (type, key) => {
    const target = TARGETS[type];
    if (!target) throw httpError(404, 'Not found');
    const id = toObjectId(key);
    const doc = await target.collection.findOne(id ? { _id: id } : { slug: String(key || '') });
    if (!doc) throw httpError(404, 'Not found');
    return { type, target, doc };
  };

  // Recount the item's visible star ratings into its `rating` field.
  const refreshRating = async (type, targetId) => {
    const target = TARGETS[type];
    if (!target) return;
    const [agg] = await ReviewCollection.aggregate([
      { $match: { targetType: type, targetId, kind: 'review', status: 'visible' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]).toArray();
    const rating = agg ? { avg: Math.round(agg.avg * 10) / 10, count: agg.count } : { avg: 0, count: 0 };
    await target.collection.updateOne({ _id: targetId }, { $set: { rating } });
  };

  // Has this user finished a trip on the plan / an order with the product?
  // (Status 'completed' is set by an admin.) Blog posts need no purchase.
  const hasCompleted = async (type, targetId, userId) => {
    if (type === 'plan') {
      return Boolean(await BookingCollection.findOne({ planId: targetId, userId, bookingStatus: 'completed' }, { projection: { _id: 1 } }));
    }
    if (type === 'product') {
      return Boolean(await OrderCollection.findOne({ 'items.productId': targetId, userId, orderStatus: 'completed' }, { projection: { _id: 1 } }));
    }
    return false;
  };
  const needsPurchase = (type) => type === 'plan' || type === 'product';

  return {
    // GET /reviews/:type/:target -> { rating, breakdown, reviews, comments, mine, canReview }
    // `mine` is the signed-in user's own review (even if hidden), else null.
    // `canReview`: whether the signed-in user may post a review or comment (false when signed out).
    getFeedback: async (req, res) => {
      const { type, doc } = await findTarget(req.params.type, req.params.target);
      const base = { targetType: type, targetId: doc._id };
      const isUser = req.user?.role === 'user';
      const userId = isUser ? new ObjectId(req.user.userId) : null;
      const [reviews, comments, counts, mine, completed] = await Promise.all([
        ReviewCollection.find({ ...base, kind: 'review', status: 'visible' }).sort({ createdAt: -1, _id: -1 }).limit(PUBLIC_LIMIT).toArray(),
        ReviewCollection.find({ ...base, kind: 'comment', status: 'visible' }).sort({ createdAt: -1, _id: -1 }).limit(PUBLIC_LIMIT).toArray(),
        ReviewCollection.aggregate([
          { $match: { ...base, kind: 'review', status: 'visible' } },
          { $group: { _id: '$rating', n: { $sum: 1 } } },
        ]).toArray(),
        isUser ? ReviewCollection.findOne({ ...base, kind: 'review', userId }) : null,
        isUser && needsPurchase(type) ? hasCompleted(type, doc._id, userId) : false,
      ]);
      const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      counts.forEach((c) => { if (breakdown[c._id] !== undefined) breakdown[c._id] = c.n; });
      const mineOwn = (r) => req.user?.role === 'user' && String(r.userId) === req.user.userId;
      res.json({
        rating: doc.rating || { avg: 0, count: 0 },
        breakdown,
        reviews: reviews.map((r) => ({ ...publicEntry(r), own: mineOwn(r) })),
        comments: comments.map((r) => ({ ...publicEntry(r), own: mineOwn(r) })),
        mine: mine ? { ...publicEntry(mine), status: mine.status } : null,
        canReview: isUser && (!needsPurchase(type) || completed),
      });
    },

    // POST /reviews/:type/:target  body { kind, rating?, body }
    // A review replaces the user's earlier review of the same item.
    addFeedback: async (req, res) => {
      if (req.user.role !== 'user') throw httpError(403, 'Sign in with a traveller account to post');
      const { type, target, doc } = await findTarget(req.params.type, req.params.target);
      const kind = req.body?.kind;
      if (!KINDS.includes(kind)) throw httpError(400, 'Invalid kind');
      const body = cleanBody(req.body?.body);
      const userId = new ObjectId(req.user.userId);
      const now = new Date().toISOString();
      const base = {
        targetType: type,
        targetId: doc._id,
        targetTitle: target.title(doc),
        targetSlug: doc.slug || '',
        userId,
        userName: req.user.name || 'Traveller',
        userEmail: req.user.email || '',
      };

      // Trip plans and products: only customers who completed a booking /
      // order may post (reviews and comments alike). Blog posts are open.
      const completed = needsPurchase(type) && await hasCompleted(type, doc._id, userId);
      if (needsPurchase(type) && !completed) {
        throw httpError(403, type === 'plan'
          ? 'You can give feedback on this trip after your booking is completed'
          : 'You can give feedback on this product after your order is completed');
      }

      if (kind === 'comment') {
        if (!body) throw httpError(400, 'Write a comment first');
        const entry = { ...base, kind, rating: null, body, verified: completed, status: 'visible', createdAt: now };
        const { insertedId } = await ReviewCollection.insertOne(entry);
        return res.status(201).json({ success: true, entry: { ...publicEntry({ ...entry, _id: insertedId }), own: true } });
      }

      const rating = Number(req.body?.rating);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw httpError(400, 'Choose a rating from 1 to 5 stars');
      const verified = completed;
      // An edited review keeps its status, so a hidden review stays hidden.
      const saved = await ReviewCollection.findOneAndUpdate(
        { targetType: type, targetId: doc._id, kind, userId },
        {
          $set: { ...base, rating, body, verified, updatedAt: now },
          $setOnInsert: { kind, status: 'visible', createdAt: now },
        },
        { upsert: true, returnDocument: 'after' },
      );
      await refreshRating(type, doc._id);
      res.status(201).json({ success: true, entry: { ...publicEntry(saved), own: true, status: saved.status } });
    },

    // DELETE /reviews/:id — the author or an admin.
    deleteFeedback: async (req, res) => {
      const id = requireId(req.params.id);
      const entry = await ReviewCollection.findOne({ _id: id });
      const isOwner = entry && req.user.role === 'user' && String(entry.userId) === req.user.userId;
      if (!entry || (!isOwner && req.user.role !== 'admin')) throw httpError(404, 'Not found');
      const result = await ReviewCollection.deleteOne({ _id: id });
      if (entry.kind === 'review') await refreshRating(entry.targetType, entry.targetId);
      res.json({ success: true, acknowledged: result.acknowledged, deletedCount: result.deletedCount });
    },

    // GET /reviews/admin?kind=review|comment&targetType=&status=&page=&q=
    getAllFeedback: async (req, res) => {
      const filter = {};
      if (KINDS.includes(req.query.kind)) filter.kind = req.query.kind;
      if (TARGETS[req.query.targetType]) filter.targetType = req.query.targetType;
      if (STATUSES.includes(req.query.status)) filter.status = req.query.status;
      await sendList(req, res, ReviewCollection, {
        filter,
        searchFields: ['body', 'userName', 'userEmail', 'targetTitle'],
        projection: { userId: 0 },
      });
    },

    // PATCH /reviews/:id  body { status: 'visible' | 'hidden' }
    setFeedbackStatus: async (req, res) => {
      const id = requireId(req.params.id);
      const status = req.body?.status;
      if (!STATUSES.includes(status)) throw httpError(400, 'Invalid status');
      const entry = await ReviewCollection.findOneAndUpdate({ _id: id }, { $set: { status } }, { returnDocument: 'after' });
      if (!entry) throw httpError(404, 'Not found');
      if (entry.kind === 'review') await refreshRating(entry.targetType, entry.targetId);
      res.json({ success: true });
    },
  };
};
