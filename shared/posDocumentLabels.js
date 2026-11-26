export const posBillLabel = () => 'Tax Invoice';
export const posDocumentLabel = record => record?.documentType === 'delivery-note' ? 'Delivery Note' : posBillLabel(record);
