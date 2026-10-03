// Multipart form fields arrive as strings; arrays/objects are sent JSON-encoded.
// Empty or unparseable input gives `fallback`; non-strings pass through.
const parseJsonField = (val, fallback) => {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val !== 'string') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
};

module.exports = { parseJsonField };
