import { Cart } from '../models/Cart.js';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { User } from '../models/User.js';
import { DealerProfile } from '../models/DealerProfile.js';
import { DealerPricing } from '../models/DealerPricing.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../constants/errorCodes.js';

/**
 * Validate that product exists, is active, and belongs to an active category
 */
export const validateProductAndCategoryActive = async (productId) => {
  const product = await Product.findById(productId);
  if (!product) {
    throw new AppError('Product not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  if (product.isActive === false) {
    throw new AppError(
      'Product is currently inactive and cannot be added to cart',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST
    );
  }

  const category = await Category.findById(product.categoryId);
  if (!category || category.isActive === false) {
    throw new AppError(
      'Product belongs to an inactive category and cannot be added to cart',
      HTTP_STATUS.BAD_REQUEST,
      ERROR_CODES.BAD_REQUEST
    );
  }

  return product;
};

/**
 * Calculate applicable price based on user role and approval status:
 * - Approved dealer -> DealerPricing or product.dealerPrice (fallback to standardPrice)
 * - Customer / Pending Dealer / Rejected Dealer -> product.standardPrice
 * - Dealer pricing is NEVER exposed to non-approved users.
 */
export const calculateApplicablePrice = async (userId, product) => {
  const user = await User.findById(userId);
  if (!user) return product.standardPrice || 0;

  if (user.role === 'dealer') {
    const dealerProfile = await DealerProfile.findOne({ userId });
    if (dealerProfile && dealerProfile.status === 'approved') {
      const customPricing = await DealerPricing.findOne({
        dealerId: dealerProfile._id,
        productId: product._id,
        isActive: true,
      });

      if (customPricing && customPricing.price !== undefined) {
        return customPricing.price;
      }

      if (product.dealerPrice !== undefined && product.dealerPrice > 0) {
        return product.dealerPrice;
      }
    }
  }

  return product.standardPrice || 0;
};

/**
 * Helper to populate and format cart response object with priceSnapshot
 */
const formatPopulatedCart = async (cart, userId) => {
  if (!cart) {
    return {
      _id: null,
      userId,
      items: [],
      itemCount: 0,
      totalQuantity: 0,
    };
  }

  await cart.populate({
    path: 'items.productId',
    select: 'sku name categoryId description images specifications isFeatured isActive standardPrice',
    populate: {
      path: 'categoryId',
      select: 'name slug isActive',
    },
  });

  // Filter valid items where the product actually exists in database
  const validItems = (cart.items || []).filter(
    (item) => item.productId && item.productId._id
  );

  // If orphan items existed (e.g. deleted products), clean them from DB
  if (validItems.length !== (cart.items || []).length) {
    cart.items = validItems;
    await cart.save();
  }

  const items = validItems;
  const itemCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const subtotal = items.reduce((sum, item) => {
    const price =
      item.priceSnapshot !== undefined
        ? item.priceSnapshot
        : (item.productId?.standardPrice || 0);
    return sum + price * (item.quantity || 1);
  }, 0);

  return {
    _id: cart._id,
    userId: cart.userId,
    items,
    itemCount,
    totalQuantity,
    subtotal,
    updatedAt: cart.updatedAt,
  };
};

/**
 * Add item to authenticated user's cart with priceSnapshot
 */
export const addToCart = async (userId, productId, quantity = 1) => {
  const product = await validateProductAndCategoryActive(productId);
  const priceSnapshot = await calculateApplicablePrice(userId, product);

  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  if (existingItemIndex > -1) {
    const newQty = cart.items[existingItemIndex].quantity + quantity;
    cart.items[existingItemIndex].quantity = Math.min(1000, newQty);
    cart.items[existingItemIndex].priceSnapshot = priceSnapshot;
  } else {
    cart.items.push({
      productId,
      quantity: Math.min(1000, quantity),
      priceSnapshot,
    });
  }

  await cart.save();
  return await formatPopulatedCart(cart, userId);
};

/**
 * Get authenticated user's cart
 */
export const getCart = async (userId) => {
  const cart = await Cart.findOne({ userId });
  return await formatPopulatedCart(cart, userId);
};

/**
 * Update quantity for a specific product in user's cart
 */
export const updateCartItem = async (userId, productId, quantity) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  if (itemIndex === -1) {
    throw new AppError(
      'Product not found in user cart',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  await validateProductAndCategoryActive(productId);

  cart.items[itemIndex].quantity = quantity;
  await cart.save();

  return await formatPopulatedCart(cart, userId);
};

/**
 * Remove specific product from user's cart
 */
export const removeCartItem = async (userId, productId) => {
  const cart = await Cart.findOne({ userId });
  if (!cart) {
    throw new AppError('Cart not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.productId.toString() === productId.toString()
  );

  if (itemIndex === -1) {
    throw new AppError(
      'Product not found in user cart',
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.NOT_FOUND
    );
  }

  cart.items.splice(itemIndex, 1);
  await cart.save();

  return await formatPopulatedCart(cart, userId);
};

/**
 * Clear all items from user's cart
 */
export const clearCart = async (userId) => {
  const cart = await Cart.findOne({ userId });
  if (cart) {
    cart.items = [];
    await cart.save();
  }

  return await formatPopulatedCart(cart, userId);
};
