const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { toWebp } = require('../utils/webp');

const rootDir = path.join(__dirname, '..', '..');

const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Only raster images are accepted, and every one is re-encoded to WebP before
// it is stored, so nothing can be stored as .html/.svg and later be served as
// an active document.
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const webpName = () => `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.webp`;

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error('Only JPEG, PNG, WebP or GIF images are allowed');
    err.status = 400;
    return cb(err);
  }
  cb(null, true);
};

// Writes each in-memory upload to dirPath as WebP and fills in the fields a
// disk-stored multer file has (filename, path, ...), so controllers and the
// failed-request cleanup in index.js work unchanged.
const storeAsWebp = (dirPath) => async (req, res, next) => {
  const files = [req.file, ...(Array.isArray(req.files) ? req.files : [])].filter(Boolean);
  const written = [];
  try {
    ensureDir(dirPath);
    for (const file of files) {
      const filename = webpName();
      const filePath = path.join(dirPath, filename);
      const info = await toWebp(file.buffer, filePath);
      written.push(filePath);
      Object.assign(file, {
        destination: dirPath,
        filename,
        path: filePath,
        mimetype: 'image/webp',
        size: info.size,
        buffer: undefined,
      });
    }
    next();
  } catch (err) {
    for (const p of written) fs.unlink(p, () => {});
    const badImage = new Error('The uploaded file is not a valid image');
    badImage.status = 400;
    console.error('Image conversion failed:', err.message);
    next(badImage);
  }
};

// Same .single()/.array() API as multer; each returns [parse, convert] which
// Express accepts anywhere a middleware is expected.
const uploaderFor = (dirPath, maxFiles = 1) => {
  const parser = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: maxFiles },
  });
  const convert = storeAsWebp(dirPath);
  return {
    single: (field) => [parser.single(field), convert],
    array: (field, max) => [parser.array(field, max), convert],
  };
};

const fixedUploader = (...subdirs) => uploaderFor(path.join(rootDir, 'uploads', ...subdirs));

// Products have a gallery: up to this many images per request.
const MAX_PRODUCT_IMAGES = 6;

module.exports = {
  ensureDir,
  MAX_FILE_SIZE,
  MAX_PRODUCT_IMAGES,
  uploadDistrict: fixedUploader('districts'),
  uploadBlog: fixedUploader('blog'),
  uploadPlan: fixedUploader('plans'),
  uploadPartner: fixedUploader('partners'),
  // Frames land in the private folder first; frameController publishes free
  // ones and keeps premium originals private (see utils/frameFiles.js).
  uploadFrame: uploaderFor(path.join(rootDir, 'private-uploads', 'frames')),
  uploadHotel: fixedUploader('hotels'),
  uploadAttraction: fixedUploader('attractions'),
  uploadTransport: fixedUploader('transports'),
  uploadGuide: fixedUploader('guides'),
  uploadDistrictAgent: fixedUploader('districtagents'),
  uploadRichText: fixedUploader('richtext'),
  uploadProduct: uploaderFor(path.join(rootDir, 'uploads', 'products'), MAX_PRODUCT_IMAGES),
  uploadProductCategory: fixedUploader('productcategories'),
};
