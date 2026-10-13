// Wrapping the removal predicate in $or stops Mongoose's update validators
// from treating its regex as a new specification.key value. The stock change
// and removal remain one atomic update, with validators enabled.
export const stockUpdate = (delta, at = new Date(), clearLegacy = true) => ({
  $inc: { stockQuantity: delta },
  $set: { stockUpdatedAt: at },
  ...(clearLegacy ? { $pull: { specifications: { $or: [{ key: /^\s*(stock|inventory)\s*$/i }] } } } : {}),
});
