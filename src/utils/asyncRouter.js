const express = require('express');

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

// Express 4 does not forward rejected promises from async handlers to the
// error middleware; an unhandled rejection then kills the process. This
// wraps every handler so a rejection is passed to next(err) instead.
const wrap = (fn) => {
  if (typeof fn !== 'function' || fn.length === 4) return fn;
  return function wrapped(req, res, next) {
    const result = fn(req, res, next);
    if (result && typeof result.catch === 'function') result.catch(next);
    return result;
  };
};

const asyncRouter = (options) => {
  const router = express.Router(options);
  METHODS.forEach((method) => {
    const original = router[method].bind(router);
    router[method] = (path, ...handlers) => original(path, ...handlers.flat().map(wrap));
  });
  return router;
};

module.exports = { asyncRouter };
