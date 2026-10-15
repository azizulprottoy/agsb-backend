const sharp = require('sharp');

const WEBP_OPTIONS = { quality: 82, alphaQuality: 100, effort: 4 };

// Re-encodes any image sharp can read (a Buffer or file path) to WebP at
// outPath. Animated GIF/WebP stay animated; transparency is kept (frame
// overlays rely on it). EXIF orientation is applied, since WebP output drops
// the metadata. Returns sharp's output info ({ size, width, height, ... }).
const toWebp = async (input, outPath) => {
  const meta = await sharp(input).metadata();
  const animated = (meta.pages || 1) > 1;
  let image = sharp(input, { animated });
  if (!animated) image = image.rotate();
  return image.webp(WEBP_OPTIONS).toFile(outPath);
};

module.exports = { toWebp, WEBP_OPTIONS };
