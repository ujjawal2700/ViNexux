// Private identifiers keep existing unique indexes intact for unnamed drafts.
export const isDraftIdentifier = value => /^__DRAFT__[a-f\d]{24}$/i.test(value || '');
export const editableProductIdentifier = value => isDraftIdentifier(value) ? '' : (value || '');
