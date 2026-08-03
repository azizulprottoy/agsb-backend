const toPublicUrl = (pic) => {
  if (!pic) return '';
  if (pic.startsWith('/uploads')) return pic;
  const uploadsIndex = pic.indexOf('/uploads');
  if (uploadsIndex !== -1) return pic.substring(uploadsIndex);
  return pic.replace(/\\/g, '/');
};

module.exports = { toPublicUrl };
