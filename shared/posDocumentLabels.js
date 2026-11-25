export const posBillLabel = record => record?.billType === 'b2b' ? 'Proforma Bill' : 'Sale Bill';
export const posDocumentLabel = record => record?.documentType === 'delivery-note' ? 'Delivery Note' : posBillLabel(record);
