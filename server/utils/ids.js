// Utility to normalize possible populated ObjectId documents or raw ObjectId/strings into string form
function normalizeId(v) {
  if (!v) return '';
  if (typeof v === 'object' && v._id) return String(v._id);
  return String(v);
}

module.exports = { normalizeId };
