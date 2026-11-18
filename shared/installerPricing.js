// Price in rupees, rounded to the nearest paisa (the catalogue uses the same formula).
export const applyInstallerPriceIncrease = (price, percent = 0) => percent > 0 ? Math.round(Number(price) * (100 + percent)) / 100 : Number(price);
export const installerPriceExpression = (price, percent = 0) => percent > 0
  ? { $divide: [{ $floor: { $add: [{ $multiply: [price, 100 + percent] }, 0.5] } }, 100] }
  : price;
