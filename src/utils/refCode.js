const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '123456789';

const randomReferenceCode = () => {
  const l1 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const l2 = LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const nums = Array.from({ length: 4 }, () => DIGITS[Math.floor(Math.random() * DIGITS.length)]).join('');
  return `${l1}${l2}${nums}`;
};

const generateUniqueReferenceCode = async (collection) => {
  while (true) {
    const code = randomReferenceCode();
    const existing = await collection.findOne({ referenceCode: code });
    if (!existing) return code;
  }
};

// URL key -> query: frontends address bookings/orders by reference code
// (e.g. SC9931) so database ids never show in the address bar; an ObjectId
// still works for older links. null when the key is neither.
const REF_CODE = /^[A-Z]{2}[1-9]{4}$/;
const refOrIdFilter = (raw, toObjectId) => {
  const id = toObjectId(raw);
  if (id) return { _id: id };
  const code = String(raw || '').trim().toUpperCase();
  return REF_CODE.test(code) ? { referenceCode: code } : null;
};

module.exports = { generateUniqueReferenceCode, refOrIdFilter };
