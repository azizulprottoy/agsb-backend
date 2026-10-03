const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const rootDir = path.join(__dirname, '..', '..');

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Only raster images. The saved extension comes from the MIME type, never from
// the client's filename, so nothing can be stored as .html/.svg and later be
// served as an active document.
const EXTENSION_FOR_TYPE = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const filename = (req, file, cb) => {
  cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${EXTENSION_FOR_TYPE[file.mimetype]}`);
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!EXTENSION_FOR_TYPE[file.mimetype] || !ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error('Only JPEG, PNG, WebP or GIF images are allowed');
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

const fixedUploader = (...subdirs) => {
  const dirPath = path.join(rootDir, 'uploads', ...subdirs);
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        ensureDir(dirPath);
        cb(null, dirPath);
      },
      filename,
    }),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  });
};

module.exports = {
  ensureDir,
  MAX_FILE_SIZE,
  uploadDistrict: fixedUploader('districts'),
  uploadBlog: fixedUploader('blog'),
  uploadPlan: fixedUploader('plans'),
  uploadPartner: fixedUploader('partners'),
  uploadFrame: fixedUploader('frames'),
  uploadHotel: fixedUploader('hotels'),
  uploadTransport: fixedUploader('transports'),
  uploadGuide: fixedUploader('guides'),
  uploadDistrictAgent: fixedUploader('districtagents'),
  uploadRichText: fixedUploader('richtext'),
};
