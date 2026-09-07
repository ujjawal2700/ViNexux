import {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../services/cart.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { HTTP_STATUS } from '../constants/httpStatusCodes.js';

export const addItem = asyncHandler(async (req, res) => {
  const { productId, quantity } = req.body;
  const cart = await addToCart(req.user._id, productId, quantity);

  return ApiResponse.success(
    res,
    'Item added to cart successfully',
    cart,
    HTTP_STATUS.OK
  );
});

export const fetchCart = asyncHandler(async (req, res) => {
  const cart = await getCart(req.user._id);

  return ApiResponse.success(
    res,
    'Cart retrieved successfully',
    cart,
    HTTP_STATUS.OK
  );
});

export const updateItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;
  const cart = await updateCartItem(req.user._id, productId, quantity);

  return ApiResponse.success(
    res,
    'Cart item updated successfully',
    cart,
    HTTP_STATUS.OK
  );
});

export const removeItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const cart = await removeCartItem(req.user._id, productId);

  return ApiResponse.success(
    res,
    'Item removed from cart successfully',
    cart,
    HTTP_STATUS.OK
  );
});

export const emptyCart = asyncHandler(async (req, res) => {
  const cart = await clearCart(req.user._id);

  return ApiResponse.success(
    res,
    'Cart cleared successfully',
    cart,
    HTTP_STATUS.OK
  );
});
