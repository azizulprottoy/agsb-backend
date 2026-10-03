const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');

// Delete a stored upload given its public path ('/uploads/<subdir>/<file>').
// Anything else (empty, external URL, legacy value) is ignored, as is any path
// that would resolve outside uploads/. A missing file is fine; other errors
// are logged. Never throws.
const removeUpload = async (publicPath) => {
  try {
    if (typeof publicPath !== 'string' || !publicPath.startsWith('/uploads/')) return;
    const relative = publicPath.slice('/uploads/'.length).split(/[?#]/)[0];
    if (!relative) return;
    const resolved = path.resolve(UPLOADS_DIR, relative);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep)) return;
    await fs.promises.unlink(resolved);
  } catch (err) {
    if (err.code !== 'ENOENT') console.error(`Could not delete upload ${publicPath}:`, err.message);
  }
};

module.exports = { UPLOADS_DIR, removeUpload };
