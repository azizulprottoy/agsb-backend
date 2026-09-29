const multer = require('multer');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..', '..');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const filename = (req, file, cb) => {
  cb(null, Date.now() + path.extname(file.originalname));
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
  });
};

module.exports = {
  ensureDir,
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
