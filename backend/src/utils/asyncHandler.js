const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const pick = (obj, keys) =>
  Object.fromEntries(keys.filter((k) => obj && k in obj).map((k) => [k, obj[k]]));

module.exports = { asyncHandler, pick };