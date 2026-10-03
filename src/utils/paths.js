// Stored image value -> URL the frontends can use. Uploads are stored as
// '/uploads/...' (older records as a filesystem path containing '/uploads');
// external URLs are returned unchanged, even if they contain '/uploads'.
const toPublicUrl = (pic) => {
  if (!pic) return '';
  if (/^https?:\/\//i.test(pic)) return pic;
  if (pic.startsWith('/uploads')) return pic;
  const uploadsIndex = pic.indexOf('/uploads');
  if (uploadsIndex !== -1) return pic.substring(uploadsIndex);
  return pic.replace(/\\/g, '/');
};

module.exports = { toPublicUrl };
