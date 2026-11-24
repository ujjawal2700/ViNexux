// Apply the private account adjustment after ordinary dealer/installer pricing.
export const applyDealerDiscount = (price, percent = 0) => Math.round(Number(price) * (100 - percent)) / 100;
export const dealerDiscountExpression = (price, percent = 0) => percent > 0
  ? { $divide: [{ $floor: { $add: [{ $multiply: [price, 100 - percent] }, 0.5] } }, 100] }
  : price;
