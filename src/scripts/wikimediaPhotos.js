// Wikimedia Commons photo lookup shared by the image import scripts
// (fetchDistrictImages.js, fetchPlanImages.js): an English Wikipedia article's
// lead photo, kept only when the Commons file is under a free licence
// (CC0 / public domain / CC BY / CC BY-SA), plus its credit.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const USER_AGENT = "AGSB-images/1.0 (Bangladesh travel site; one-off import of freely licensed photos)";
const WIDTH = 1600;

const NOT_A_PHOTO = /map|locator|location|flag|seal|logo|emblem|coat[_ ]of[_ ]arms|division|upazila|\.svg$|\.gif$|\.tiff?$/i;
const FREE_LICENSE = /^(cc0|public domain|pd\b|pd-|cc[ -]by(-sa)?([ -][\d.]+)?)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// GET a MediaWiki API; waits and retries when rate limited (HTTP 429).
const api = async (host, params, attempt = 0) => {
  const url = `https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (res.status === 429 && attempt < 5) {
    const wait = (Number(res.headers.get('retry-after')) || 5 * 2 ** attempt) * 1000;
    await sleep(wait);
    return api(host, params, attempt + 1);
  }
  if (!res.ok) throw new Error(`${host} API ${res.status}`);
  return res.json();
};

const stripHtml = (html) => String(html || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const chunks = (list, size) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, i * size + size));

// Article title -> lead image file name (photos only), 50 titles per request.
const leadImages = async (titles) => {
  const found = new Map();
  for (const batch of chunks([...new Set(titles)], 50)) {
    const data = await api('en.wikipedia.org', { action: 'query', prop: 'pageimages', piprop: 'name', pilimit: '50', redirects: '1', titles: batch.join('|') });
    // Map requested titles through normalisation and redirects to the final page.
    const finalTitle = new Map(batch.map((t) => [t, t]));
    for (const { from, to } of [...(data.query?.normalized || []), ...(data.query?.redirects || [])]) {
      for (const [req, cur] of finalTitle) if (cur === from) finalTitle.set(req, to);
    }
    const imageOf = new Map((data.query?.pages || []).map((p) => [p.title, p.pageimage]));
    for (const [req, cur] of finalTitle) {
      const name = imageOf.get(cur);
      if (name && !NOT_A_PHOTO.test(name)) found.set(req, name);
    }
    await sleep(500);
  }
  return found;
};

// File name -> { thumbUrl, credit } for freely licensed Commons files.
const commonsInfo = async (fileNames) => {
  const found = new Map();
  for (const batch of chunks([...new Set(fileNames)], 50)) {
    const data = await api('commons.wikimedia.org', {
      action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata|mime', iiurlwidth: String(WIDTH),
      titles: batch.map((f) => `File:${f}`).join('|'),
    });
    const titleFor = new Map(batch.map((f) => [`File:${f}`, f]));
    for (const { from, to } of data.query?.normalized || []) {
      if (titleFor.has(from)) titleFor.set(to, titleFor.get(from));
    }
    for (const page of data.query?.pages || []) {
      const info = !page.missing && page.imageinfo?.[0];
      if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) continue;
      const meta = info.extmetadata || {};
      const license = stripHtml(meta.LicenseShortName?.value);
      if (!FREE_LICENSE.test(license)) continue;
      found.set(titleFor.get(page.title), {
        thumbUrl: info.thumburl || info.url,
        credit: {
          title: page.title.replace(/^File:/, ''),
          author: stripHtml(meta.Artist?.value) || 'Unknown',
          license,
          license_url: meta.LicenseUrl?.value || '',
          source_url: info.descriptionurl,
        },
      });
    }
    await sleep(500);
  }
  return found;
};

// Downloads a photo into outDir as <prefix>-<random>.jpg, resized to WIDTH.
// Returns the file name, or null when the download fails.
const savePhoto = async (photo, outDir, prefix) => {
  const res = await fetch(photo.thumbUrl, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  fs.mkdirSync(outDir, { recursive: true });
  const fileName = `${prefix}-${crypto.randomBytes(4).toString('hex')}.jpg`;
  await sharp(Buffer.from(await res.arrayBuffer()))
    .rotate()
    .resize({ width: WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(path.join(outDir, fileName));
  return fileName;
};

module.exports = { sleep, leadImages, commonsInfo, savePhoto };
