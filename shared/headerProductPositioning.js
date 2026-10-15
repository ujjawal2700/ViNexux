export const hasProductPosition = category => Number.isInteger(category.productPriority) && category.productPriority >= 0;

// Sequence records when a header received its current position. Saving the
// same position preserves it; changing or clearing it gives up the old place.
export const compareHeaderProductPositions = (a, b) => {
  const priority = category => hasProductPosition(category) ? category.productPriority : Infinity;
  const sequence = category => category.productPositionSequence ?? Infinity;
  return (priority(a) - priority(b) || sequence(a) - sequence(b)
    || String(a._id).localeCompare(String(b._id)));
};
