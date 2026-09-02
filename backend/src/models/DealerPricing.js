import mongoose from 'mongoose';

const dealerPricingSchema = new mongoose.Schema(
  {
    dealerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DealerProfile',
      required: [true, 'Dealer Profile ID is required'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    moq: {
      type: Number,
      required: [true, 'Minimum order quantity (MOQ) is required'],
      default: 1,
      min: [1, 'MOQ must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'MOQ must be an integer',
      },
    },
    packSize: {
      type: Number,
      min: [1, 'Pack size must be at least 1'],
      validate: {
        validator: (val) => val === undefined || val === null || Number.isInteger(val),
        message: 'Pack size must be an integer',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring one pricing record per dealer and product
dealerPricingSchema.index({ dealerId: 1, productId: 1 }, { unique: true });

// Compound index for querying active pricing for a specific product
dealerPricingSchema.index({ productId: 1, isActive: 1 });

export const DealerPricing = mongoose.model('DealerPricing', dealerPricingSchema);
export default DealerPricing;
