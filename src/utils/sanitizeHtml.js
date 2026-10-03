const sanitizeHtml = require('sanitize-html');

// Matches what the admin RichTextEditor (contenteditable + execCommand) produces:
// headings, lists, inline formatting, <font> from fontSize/foreColor, inline
// text-align / indent styles, links and images. No scripts, event handlers or
// javascript: URLs survive.
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]+)$/i;
const LENGTH = /^\d+(\.\d+)?(px|em|rem|%)?$/;

const OPTIONS = {
  allowedTags: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'div', 'span', 'font',
    'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'sub', 'sup',
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    font: ['color', 'size', 'face'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    '*': ['style'],
  },
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify|start|end)$/],
      color: [COLOR],
      'background-color': [COLOR],
      'font-size': [LENGTH, /^(x{0,2}-?small|medium|x{0,3}-?large)$/],
      'font-weight': [/^(normal|bold|\d{3})$/],
      'font-style': [/^(normal|italic)$/],
      'text-decoration': [/^[a-z\s-]+$/],
      'margin-left': [LENGTH],
      'padding-left': [LENGTH],
      margin: [/^[\d\s.pxemr%]+$/],
      border: [/^none$/],
      padding: [/^[\d\s.pxemr%]+$/],
      width: [LENGTH],
      height: [LENGTH],
    },
  },
  // Relative URLs (/uploads/...) are always allowed; absolute ones only with these schemes.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => (attribs.target === '_blank'
      ? { tagName, attribs: { ...attribs, rel: 'noopener noreferrer' } }
      : { tagName, attribs }),
  },
};

// Sanitize stored rich text. Values without any "<" are plain text (older
// entries) and are returned untouched so "&" etc. are not entity-encoded.
const sanitizeRichText = (value) => {
  if (typeof value !== 'string' || !value.includes('<')) return value;
  return sanitizeHtml(value, OPTIONS);
};

module.exports = { sanitizeRichText };
