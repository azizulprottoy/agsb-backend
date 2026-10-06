const { ObjectId } = require('mongodb');
const { generateUniqueReferenceCode, refOrIdFilter } = require('../utils/refCode');
const { BD_PHONE } = require('../utils/contactValidation');
const { sendList } = require('../utils/pagination');
const { httpError } = require('../utils/http');
const { toObjectId, requireId } = require('../utils/ids');
const { toPublicUrl } = require('../utils/paths');

// Shop orders: products bought or rented from the catalog. Same payment flow
// as trip bookings — the customer sends an advance by mobile banking, an
// admin verifies it — and the same seat-hold idea applied to stock.

const ADVANCE_RATE = 0.4;
const MAX_LINES = 20;
const MAX_QTY = 10;
const MAX_RENT_DAYS = 60;
const HOLD_MINUTES = Number(process.env.ORDER_HOLD_MINUTES) > 0 ? Number(process.env.ORDER_HOLD_MINUTES) : 60;
const MAX_UNPAID_ORDERS = 2;

const PAYMENT_STATUSES = ['unpaid', 'pending_verification', 'advance_paid', 'paid_full', 'failed'];
const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'rented_out', 'returned', 'completed', 'cancelled'];
const FULFILMENT = ['delivery', 'pickup'];
const AWAITING_PAYMENT = ['unpaid', 'pending_verification', 'failed'];
const EXPIRABLE_PAYMENT = ['unpaid', 'failed'];
const TRX_ID = /^[A-Z0-9]{6,30}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const ORDER_SEARCH_FIELDS = ['referenceCode', 'userName', 'userEmail', 'contact.phone', 'items.name', 'payment.transactionId'];

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;
const todayInDhaka = () => new Date(Date.now() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
const daysBetween = (start, end) => Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;

const historyEntry = (status, note) => ({ status, note: note || '', date: new Date().toISOString() });
const newHoldExpiry = (from = new Date()) => new Date(from.getTime() + HOLD_MINUTES * 60 * 1000).toISOString();
const text = (val, max) => String(val ?? '').trim().slice(0, max);

// Stock field and released-flag for each kind of line.
const STOCK = {
  buy: { field: 'saleStock', flag: 'saleStockReleased' },
  rent: { field: 'rentStock', flag: 'rentStockReleased' },
};

// Shared by the request handlers and the periodic sweep started in index.js.
const createOrderHoldHelpers = ({ OrderCollection, ProductCollection }) => {
  // Give the order's stock of `kind` back, at most once per order: the flag
  // is claimed with a conditional update first, so concurrent callers (admin
  // cancel racing the sweep) cannot both restock.
  const releaseStock = async (order, kind) => {
    const { field, flag } = STOCK[kind];
    const lines = (order.items || []).filter((i) => i.kind === kind);
    if (!lines.length) return;
    const claimed = await OrderCollection.updateOne({ _id: order._id, [flag]: { $ne: true } }, { $set: { [flag]: true } });
    if (!claimed.modifiedCount) return;
    await Promise.all(lines.map((line) => ProductCollection.updateOne({ _id: line.productId }, { $inc: { [field]: line.qty } })));
  };

  const expiredHoldFilter = (now) => ({
    paymentStatus: { $in: EXPIRABLE_PAYMENT },
    orderStatus: 'pending',
    holdExpiresAt: { $exists: true, $lt: now },
  });

  const expireHold = async (order, now) => {
    const result = await OrderCollection.updateOne(
      { _id: order._id, ...expiredHoldFilter(now) },
      {
        $set: { orderStatus: 'cancelled', cancelReason: 'expired' },
        $push: { statusHistory: historyEntry('cancelled', 'Payment hold expired') },
        $unset: { holdExpiresAt: '' },
      }
    );
    if (result.modifiedCount !== 1) return false;
    await releaseStock(order, 'buy');
    await releaseStock(order, 'rent');
    return true;
  };

  const sweepExpiredOrderHolds = async () => {
    const now = new Date().toISOString();
    const expired = await OrderCollection.find(expiredHoldFilter(now), { projection: { _id: 1, items: 1 } }).toArray();
    let n = 0;
    for (const order of expired) if (await expireHold(order, now)) n++;
    return n;
  };

  return { releaseStock, expireHold, sweepExpiredOrderHolds };
};

// Validates the cart against the catalog. Returns { lines, itemsTotal, depositTotal }.
const priceCart = async (rawItems, ProductCollection) => {
  if (!Array.isArray(rawItems) || !rawItems.length) throw httpError(400, 'Your cart is empty');
  if (rawItems.length > MAX_LINES) throw httpError(400, `An order can have at most ${MAX_LINES} lines`);

  const ids = [...new Set(rawItems.map((i) => String(i?.productId || '')))].map(toObjectId);
  if (ids.some((id) => !id)) throw httpError(400, 'Invalid product in cart');
  const products = await ProductCollection.find({ _id: { $in: ids }, active: { $ne: false } }).toArray();
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const today = todayInDhaka();

  let itemsTotal = 0;
  let depositTotal = 0;
  const lines = rawItems.map((raw) => {
    const product = byId.get(String(raw.productId));
    if (!product) throw httpError(400, 'A product in your cart is no longer available');
    const label = product.name;
    const kind = raw.kind === 'rent' ? 'rent' : raw.kind === 'buy' ? 'buy' : null;
    if (!kind) throw httpError(400, `${label}: choose buy or rent`);
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw httpError(400, `${label}: quantity must be 1 to ${MAX_QTY}`);

    // Every option the product has must be picked, from its list.
    const chosen = raw.options && typeof raw.options === 'object' ? raw.options : {};
    const options = {};
    for (const opt of product.options || []) {
      const value = String(chosen[opt.name] ?? '');
      if (!opt.values.includes(value)) throw httpError(400, `${label}: choose a ${opt.name.toLowerCase()}`);
      options[opt.name] = value;
    }

    const line = {
      productId: product._id,
      slug: product.slug,
      name: product.name,
      name_bn: product.name_bn || '',
      image: (product.images || [])[0] || '',
      kind,
      qty,
      options,
    };
    if (kind === 'buy') {
      if (!(product.salePrice > 0)) throw httpError(400, `${label} is not for sale`);
      line.unitPrice = product.salePrice;
      line.lineTotal = product.salePrice * qty;
    } else {
      if (!(product.rentPerDay > 0)) throw httpError(400, `${label} is not for rent`);
      const startDate = String(raw.startDate || '').slice(0, 10);
      const endDate = String(raw.endDate || '').slice(0, 10);
      if (!DATE.test(startDate) || !DATE.test(endDate)) throw httpError(400, `${label}: choose rental dates`);
      if (startDate < today) throw httpError(400, `${label}: rental cannot start in the past`);
      if (endDate < startDate) throw httpError(400, `${label}: return date must be on or after the start date`);
      const days = daysBetween(startDate, endDate);
      if (days > MAX_RENT_DAYS) throw httpError(400, `${label}: rentals are limited to ${MAX_RENT_DAYS} days`);
      Object.assign(line, {
        startDate, endDate, days,
        unitPrice: product.rentPerDay,
        deposit: (product.rentDeposit || 0) * qty,
        lineTotal: product.rentPerDay * days * qty,
      });
      depositTotal += line.deposit;
    }
    itemsTotal += line.lineTotal;
    return line;
  });
  return { lines, itemsTotal, depositTotal };
};

const publicOrder = (order) => ({ ...order, items: (order.items || []).map((i) => ({ ...i, image: toPublicUrl(i.image) })) });

module.exports = (collections) => {
  const { OrderCollection, ProductCollection, PaymentMethodCollection, BookingCollection } = collections;
  const { releaseStock, expireHold, sweepExpiredOrderHolds } = createOrderHoldHelpers(collections);

  const canView = (req, order) => req.user.role === 'admin' || String(order.userId) === String(req.user.userId);

  // Take stock for every line, all or nothing.
  const reserveStock = async (lines) => {
    const need = new Map(); // "<id>|<kind>" -> qty
    for (const l of lines) need.set(`${l.productId}|${l.kind}`, (need.get(`${l.productId}|${l.kind}`) || 0) + l.qty);
    const taken = [];
    for (const [key, qty] of need) {
      const [id, kind] = key.split('|');
      const { field } = STOCK[kind];
      const result = await ProductCollection.updateOne(
        { _id: new ObjectId(id), active: { $ne: false }, [field]: { $gte: qty } },
        { $inc: { [field]: -qty } }
      );
      if (!result.modifiedCount) {
        await Promise.all(taken.map((t) => ProductCollection.updateOne({ _id: t.id }, { $inc: { [t.field]: t.qty } })));
        const fresh = await ProductCollection.findOne({ _id: new ObjectId(id) }, { projection: { name: 1, [field]: 1 } });
        const left = fresh?.[field] || 0;
        const what = kind === 'rent' ? 'available to rent' : 'in stock';
        throw httpError(409, left > 0 ? `${fresh.name}: only ${left} ${what}` : `${fresh?.name || 'A product'} is out of stock`);
      }
      taken.push({ id: new ObjectId(id), field, qty });
    }
  };

  return {
    sweepExpiredOrderHolds,

    // Body: { items: [{ productId, kind: 'buy'|'rent', qty, options?, startDate?, endDate? }],
    //         fulfilment: 'delivery'|'pickup', contact: { name, phone, address?, district? }, note? }
    createOrder: async (req, res) => {
      const body = req.body || {};
      const fulfilment = FULFILMENT.includes(body.fulfilment) ? body.fulfilment : 'delivery';
      const c = body.contact || {};
      const contact = {
        name: text(c.name, 100),
        phone: String(c.phone || '').replace(/[\s-]/g, ''),
        address: text(c.address, 300),
        district: text(c.district, 60),
      };
      if (!contact.name) throw httpError(400, 'Enter a contact name');
      if (!BD_PHONE.test(contact.phone)) throw httpError(400, 'Enter a valid Bangladeshi phone number');
      if (fulfilment === 'delivery' && !contact.address) throw httpError(400, 'Enter a delivery address');

      const { lines, itemsTotal, depositTotal } = await priceCart(body.items, ProductCollection);

      const userId = new ObjectId(req.user.userId);
      const outstanding = { userId, paymentStatus: { $in: AWAITING_PAYMENT }, orderStatus: 'pending' };
      if (await OrderCollection.countDocuments(outstanding) >= MAX_UNPAID_ORDERS) {
        throw httpError(409, `You have ${MAX_UNPAID_ORDERS} orders awaiting payment — complete them or wait for them to expire first`);
      }

      const referenceCode = await generateUniqueReferenceCode(OrderCollection);
      await reserveStock(lines);

      const totalAmount = itemsTotal + depositTotal;
      const createdAt = new Date();
      const holdExpiresAt = newHoldExpiry(createdAt);
      const order = {
        referenceCode,
        userId,
        userName: req.user.name || '',
        userEmail: req.user.email || '',
        items: lines,
        itemsTotal,
        depositTotal,
        totalAmount,
        advanceAmount: Math.ceil(totalAmount * ADVANCE_RATE),
        paidAmount: 0,
        dueAmount: totalAmount,
        fulfilment,
        contact,
        note: text(body.note, 1000),
        paymentStatus: 'unpaid',
        orderStatus: 'pending',
        payment: null,
        statusHistory: [historyEntry('pending', 'Order placed')],
        createdAt: createdAt.toISOString(),
        holdExpiresAt,
      };

      let result;
      try {
        result = await OrderCollection.insertOne(order);
      } catch (err) {
        await Promise.all(lines.map((l) => ProductCollection.updateOne({ _id: l.productId }, { $inc: { [STOCK[l.kind].field]: l.qty } })));
        throw err;
      }
      res.status(201).json({ success: true, orderId: result.insertedId, referenceCode, holdExpiresAt });
    },

    getMyOrders: async (req, res) => {
      const rows = await OrderCollection.find({ userId: new ObjectId(req.user.userId) }).sort({ _id: -1 }).toArray();
      res.json(rows.map(publicOrder));
    },

    getOrder: async (req, res) => {
      // :id is the reference code (or, for older links, the database id).
      const filter = refOrIdFilter(req.params.id, toObjectId);
      const order = filter && await OrderCollection.findOne(filter);
      if (!order || !canView(req, order)) throw httpError(404, 'Order not found');
      res.json(publicOrder(order));
    },

    // Customer reports the advance they sent; an admin verifies it later.
    submitPayment: async (req, res) => {
      const id = requireId(req.params.id);
      const methodId = toObjectId(req.body.paymentMethodId);
      const senderNumber = String(req.body.senderNumber || '').replace(/[\s-]/g, '');
      const transactionId = String(req.body.transactionId || '').trim().toUpperCase();

      const [order, method] = await Promise.all([
        OrderCollection.findOne({ _id: id }),
        methodId ? PaymentMethodCollection.findOne({ _id: methodId, active: { $ne: false } }) : null,
      ]);
      if (!order || String(order.userId) !== String(req.user.userId)) throw httpError(404, 'Order not found');
      if (order.orderStatus === 'cancelled') throw httpError(409, 'This order was cancelled');
      if (!EXPIRABLE_PAYMENT.includes(order.paymentStatus)) throw httpError(409, 'Payment has already been submitted for this order');
      const nowIso = () => new Date().toISOString();
      if (order.holdExpiresAt && order.holdExpiresAt < nowIso()) {
        await expireHold(order, nowIso());
        throw httpError(409, 'Your order hold expired; please order again');
      }
      if (!method) throw httpError(400, 'Select a payment method');
      if (!BD_PHONE.test(senderNumber)) throw httpError(400, 'Enter the number you sent the money from');
      if (!TRX_ID.test(transactionId)) throw httpError(400, 'Enter a valid transaction ID');
      // A TrxID can pay for one booking or one order, never two.
      const [usedByOrder, usedByBooking] = await Promise.all([
        OrderCollection.findOne({ 'payment.transactionId': transactionId, _id: { $ne: id } }, { projection: { _id: 1 } }),
        BookingCollection.findOne({ 'payment.transactionId': transactionId }, { projection: { _id: 1 } }),
      ]);
      if (usedByOrder || usedByBooking) throw httpError(409, 'This transaction ID has already been used');

      const payment = {
        methodId: method._id,
        method: method.method,
        number: method.number,
        senderNumber,
        transactionId,
        amount: order.advanceAmount,
        submittedAt: nowIso(),
      };
      const result = await OrderCollection.updateOne(
        {
          _id: id,
          paymentStatus: { $in: EXPIRABLE_PAYMENT },
          orderStatus: { $ne: 'cancelled' },
          $or: [{ holdExpiresAt: { $exists: false } }, { holdExpiresAt: { $gte: nowIso() } }],
        },
        {
          $set: { payment, paymentStatus: 'pending_verification' },
          $push: { statusHistory: historyEntry('pending_verification', `${method.method} TrxID ${transactionId}`) },
          $unset: { holdExpiresAt: '' },
        }
      );
      if (!result.modifiedCount) throw httpError(409, 'Payment has already been submitted for this order');
      res.json({ success: true, message: 'Payment submitted for verification' });
    },

    // Admin list: ?page&limit&q plus ?paymentStatus / ?orderStatus filters.
    getAllOrders: async (req, res) => {
      const filter = {};
      const { paymentStatus, orderStatus } = req.query;
      if (paymentStatus) {
        if (!PAYMENT_STATUSES.includes(paymentStatus)) throw httpError(400, 'Invalid payment status');
        filter.paymentStatus = paymentStatus;
      }
      if (orderStatus) {
        if (!ORDER_STATUSES.includes(orderStatus)) throw httpError(400, 'Invalid order status');
        filter.orderStatus = orderStatus;
      }
      await sendList(req, res, OrderCollection, { filter, searchFields: ORDER_SEARCH_FIELDS });
    },

    updatePaymentStatus: async (req, res) => {
      const id = requireId(req.params.id);
      const { paymentStatus } = req.body || {};
      if (!PAYMENT_STATUSES.includes(paymentStatus)) throw httpError(400, 'Invalid payment status');
      const order = await OrderCollection.findOne({ _id: id });
      if (!order) throw httpError(404, 'Order not found');
      if (order.orderStatus === 'cancelled') throw httpError(409, 'This order was cancelled');

      const paidAmount = paymentStatus === 'paid_full' ? order.totalAmount
        : paymentStatus === 'advance_paid' ? order.advanceAmount
        : 0;
      const set = { paymentStatus, paidAmount, dueAmount: order.totalAmount - paidAmount };
      const unset = {};
      if (['advance_paid', 'paid_full'].includes(paymentStatus) && order.orderStatus === 'pending') set.orderStatus = 'confirmed';
      // Payment rejected: the customer gets a fresh hold to pay again.
      if (EXPIRABLE_PAYMENT.includes(paymentStatus) && order.orderStatus === 'pending') set.holdExpiresAt = newHoldExpiry();
      else unset.holdExpiresAt = '';

      const result = await OrderCollection.updateOne(
        { _id: id, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus },
        {
          $set: set,
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
          $push: { statusHistory: historyEntry(paymentStatus, 'Payment status updated by admin') },
        }
      );
      if (!result.matchedCount) throw httpError(409, 'This order changed while you were editing it. Reload and try again.');
      res.json({ success: true, order: publicOrder(await OrderCollection.findOne({ _id: id })) });
    },

    // Cancelling returns all stock; marking rented items returned (or the
    // order completed) puts the rental units back.
    updateOrderStatus: async (req, res) => {
      const id = requireId(req.params.id);
      const { status } = req.body || {};
      if (!ORDER_STATUSES.includes(status)) throw httpError(400, 'Invalid order status');
      const order = await OrderCollection.findOne({ _id: id });
      if (!order) throw httpError(404, 'Order not found');
      if (order.orderStatus === 'cancelled' && status !== 'cancelled') {
        throw httpError(409, 'A cancelled order cannot be reopened; ask the customer to order again');
      }

      const result = await OrderCollection.updateOne(
        { _id: id, orderStatus: { $ne: 'cancelled' } },
        {
          $set: { orderStatus: status },
          $push: { statusHistory: historyEntry(status, 'Order status updated by admin') },
          ...(status === 'cancelled' ? { $unset: { holdExpiresAt: '' } } : {}),
        }
      );
      if (result.modifiedCount === 1) {
        if (status === 'cancelled') {
          // Sold items already handed over are not restocked.
          if (!['shipped', 'delivered', 'completed'].includes(order.orderStatus)) await releaseStock(order, 'buy');
          await releaseStock(order, 'rent');
        }
        if (['returned', 'completed'].includes(status)) await releaseStock(order, 'rent');
      } else if (status !== 'cancelled') {
        throw httpError(409, 'A cancelled order cannot be reopened; ask the customer to order again');
      }
      res.json({ success: true, order: publicOrder(await OrderCollection.findOne({ _id: id })) });
    },
  };
};

module.exports.createOrderHoldHelpers = createOrderHoldHelpers;
