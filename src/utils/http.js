// An Error carrying an HTTP status; the final error handler in index.js turns
// it into `{ success: false, message }` with that status.
const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const isDuplicateKeyError = (err) => Boolean(err) && err.code === 11000;

// "Slug already exists" for a duplicate on the slug index, etc.
const duplicateKeyMessage = (err) => {
  const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'Value';
  const name = field.split('.').pop();
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} already exists`;
};

module.exports = { httpError, isDuplicateKeyError, duplicateKeyMessage };
