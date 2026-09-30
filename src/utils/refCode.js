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

module.exports = { generateUniqueReferenceCode };
