import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import AdminLayout from '../layouts/AdminLayout';

// Route Guards
import PublicRoute from './PublicRoute';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// Constants
import { ROLES } from '../constants';

// Public Pages
import HomePage from '../pages/public/HomePage';
import LoginPage from '../pages/auth/LoginPage';
import AdminLoginPage from '../pages/auth/AdminLoginPage';
import VerifyOtpPage from '../pages/auth/VerifyOtpPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import ProductsPage from '../pages/public/ProductsPage';
import ProductDetailPage from '../pages/public/ProductDetailPage';
import WishlistPage from '../pages/public/WishlistPage';
import CategoriesPage from '../pages/public/CategoriesPage';
import BrandsPage from '../pages/public/BrandsPage';
import CmsPage from '../pages/public/CmsPage';
import UnauthorizedPage from '../pages/public/UnauthorizedPage';
import NotFoundPage from '../pages/public/NotFoundPage';
import UiPreviewPage from '../pages/public/UiPreviewPage';
import {
  CategoryRoute,
  CategoryLevel2Route,
  CategoryLevel3Route,
} from './HierarchicalCategoryRoutes';

// Account Pages (shared by customer & dealer roles - no more separate
// dealer portal; see pages/account/)
import CartPage from '../pages/account/CartPage';
import CheckoutEnquiryPage from '../pages/account/CheckoutEnquiryPage';
import EnquiriesPage from '../pages/account/EnquiriesPage';
import EnquiryDetailPage from '../pages/account/EnquiryDetailPage';
import ProfilePage from '../pages/account/ProfilePage';
import ProfileUpdatePage from '../pages/account/ProfileUpdatePage';

// Admin Pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import AdminHeaderCategoriesPage from '../pages/admin/AdminHeaderCategoriesPage';
import AdminMainCategoriesPage from '../pages/admin/AdminMainCategoriesPage';
import AdminSubCategoriesPage from '../pages/admin/AdminSubCategoriesPage';
import AdminProductsPage from '../pages/admin/AdminProductsPage';
import AdminProductDetailPage from '../pages/admin/AdminProductDetailPage';
import AdminDealersPage from '../pages/admin/AdminDealersPage';
import AdminDealerDetailPage from '../pages/admin/AdminDealerDetailPage';
import AdminCustomersPage from '../pages/admin/AdminCustomersPage';
import AdminCustomerDetailPage from '../pages/admin/AdminCustomerDetailPage';
import AdminEnquiriesPage from '../pages/admin/AdminEnquiriesPage';
import AdminEnquiryDetailPage from '../pages/admin/AdminEnquiryDetailPage';
import AdminSessionsPage from '../pages/admin/AdminSessionsPage';
import AdminReportsPage from '../pages/admin/AdminReportsPage';
import AdminCmsBannersPage from '../pages/admin/AdminCmsBannersPage';
import AdminCmsPromoPage from '../pages/admin/AdminCmsPromoPage';
import AdminCmsPagesPage from '../pages/admin/AdminCmsPagesPage';
import AdminCmsBadgesPage from '../pages/admin/AdminCmsBadgesPage';
import AdminCmsFooterPage from '../pages/admin/AdminCmsFooterPage';
import AdminProfilePage from '../pages/admin/AdminProfilePage';
import AdminProfileUpdatePage from '../pages/admin/AdminProfileUpdatePage';

// Tiny helper so the one dynamic-param legacy redirect
// (/customer/enquiries/:id) can interpolate :id - <Navigate> alone can't.
const EnquiryDetailRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/account/enquiries/${id}`} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES (WITH PUBLIC LAYOUT) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/brands" element={<BrandsPage />} />
        <Route path="/shop-by-brand" element={<BrandsPage />} />
        <Route path="/content/pages/:slug" element={<CmsPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/not-found" element={<NotFoundPage />} />

        {/* Internal Component Library Showcase */}
        <Route path="/ui-preview" element={<UiPreviewPage />} />

        {/* Guest Auth Routes (Customer / Dealer) */}
        <Route element={<PublicRoute restricted={true} portal="customer" />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage initialTab="signup" />} />
          <Route path="/signup" element={<LoginPage initialTab="signup" />} />
          <Route path="/customer/login" element={<Navigate to="/login" replace />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* ACCOUNT ROUTES - shared by customer & dealer roles. */}
        <Route path="/account/cart" element={<Navigate to="/cart" replace />} />
        <Route element={<ProtectedRoute loginPath="/login" portal="customer" />}>
          <Route element={<RoleRoute allowedRoles={[ROLES.CUSTOMER, ROLES.DEALER]} portal="customer" />}>
            <Route path="/account/checkout-enquiry" element={<CheckoutEnquiryPage />} />
            <Route path="/account/enquiries" element={<EnquiriesPage />} />
            <Route path="/account/enquiries/:id" element={<EnquiryDetailPage />} />
            <Route path="/account/profile" element={<ProfilePage />} />
            <Route path="/account/quotations" element={<ProfilePage initialTab="quotations" />} />
            <Route path="/account/profile/update" element={<ProfileUpdatePage />} />
          </Route>
        </Route>

        {/* Legacy /customer/* and /dealer/* link redirects - the dealer
            portal and the old /customer/* prefix were retired in favor of
            the unified /account/* routes above. Kept so old bookmarks and
            any stray hardcoded links still resolve instead of 404ing. */}
        <Route path="/customer/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/customer/cart" element={<Navigate to="/account/cart" replace />} />
        <Route path="/customer/checkout-enquiry" element={<Navigate to="/account/checkout-enquiry" replace />} />
        <Route path="/customer/enquiries" element={<Navigate to="/account/enquiries" replace />} />
        <Route path="/customer/enquiries/:id" element={<EnquiryDetailRedirect />} />
        <Route path="/customer/profile" element={<Navigate to="/account/profile" replace />} />
        <Route path="/customer/profile/update" element={<Navigate to="/account/profile/update" replace />} />
        <Route path="/dealer/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/dealer/cart" element={<Navigate to="/account/cart" replace />} />
        <Route path="/dealer/enquiries" element={<Navigate to="/account/enquiries" replace />} />
        <Route path="/dealer/profile" element={<Navigate to="/account/profile" replace />} />
        <Route path="/dealer/profile/update" element={<Navigate to="/account/profile/update" replace />} />
        <Route path="/dealer/kyc" element={<Navigate to="/account/profile/update" replace />} />
        <Route path="/dealer/kyc/status" element={<Navigate to="/account/profile" replace />} />
        <Route path="/dealer/pricing" element={<Navigate to="/products" replace />} />

        {/* HIERARCHICAL BRAND & CATEGORY ROUTES (SEO-Friendly multi-level URLs matching Mega Jaipur) */}
        {/* Brand: /brands/:brandSlug and /brands/:brandSlug/:id */}
        <Route path="/brands/:brandSlug" element={<ProductsPage />} />
        <Route path="/brands/:brandSlug/:id" element={<ProductDetailPage />} />

        {/* 4 segments: /:headerSlug/:param2/:param3/:id -> Product Detail in 3rd tier subcategory */}
        <Route path="/:headerSlug/:param2/:param3/:id" element={<ProductDetailPage />} />

        {/* 3 segments: /:headerSlug/:param2/:param3 -> Subcategory OR Product Detail in 2nd tier main category */}
        <Route path="/:headerSlug/:param2/:param3" element={<CategoryLevel3Route />} />

        {/* 2 segments: /:headerSlug/:param2 -> Main Category OR Product Detail in 1st tier header category */}
        <Route path="/:headerSlug/:param2" element={<CategoryLevel2Route />} />

        {/* 1 segment: /:headerSlug -> Header Category */}
        <Route path="/:headerSlug" element={<CategoryRoute />} />
      </Route>

      {/* DEDICATED ADMIN LOGIN (standalone, no storefront chrome) */}
      <Route element={<PublicRoute restricted={true} portal="admin" />}>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/verify-otp" element={<VerifyOtpPage />} />
      </Route>

      {/* ADMIN PROTECTED ROUTES (WITH ADMIN LAYOUT) */}
      <Route element={<ProtectedRoute loginPath="/admin/login" portal="admin" />}>
        <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} portal="admin" />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/categories/header" element={<AdminHeaderCategoriesPage />} />
            <Route path="/admin/categories/main" element={<AdminMainCategoriesPage />} />
            <Route path="/admin/categories/sub" element={<AdminSubCategoriesPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/products/new" element={<AdminProductDetailPage />} />
            <Route path="/admin/products/:id" element={<AdminProductDetailPage />} />
            <Route path="/admin/dealers" element={<AdminDealersPage />} />
            <Route path="/admin/dealers/:id" element={<AdminDealerDetailPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/customers/:id" element={<AdminCustomerDetailPage />} />
            {/* B2C / B2B enquiry split - both routes render the same
                AdminEnquiriesPage, locked to a userType via prop. */}
            {/* key forces a fresh mount when switching scopes directly via
                nav (userTypeFilter etc. are initialized once from the
                forcedUserType prop, so a remount - not just a re-render -
                is what resets them correctly). */}
            <Route path="/admin/enquiries/customers" element={<AdminEnquiriesPage key="customer" forcedUserType="customer" />} />
            <Route path="/admin/enquiries/dealers" element={<AdminEnquiriesPage key="dealer" forcedUserType="dealer" />} />
            <Route path="/admin/enquiries" element={<Navigate to="/admin/enquiries/dealers" replace />} />
            <Route path="/admin/enquiries/:id" element={<AdminEnquiryDetailPage />} />
            <Route path="/admin/sessions" element={<AdminSessionsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/cms/banners" element={<AdminCmsBannersPage />} />
            <Route path="/admin/cms/promotional-banners" element={<AdminCmsPromoPage />} />
            <Route path="/admin/cms/pages" element={<AdminCmsPagesPage />} />
            <Route path="/admin/cms/trust-badges" element={<AdminCmsBadgesPage />} />
            <Route path="/admin/cms/footer-content" element={<AdminCmsFooterPage />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />
            <Route path="/admin/profile/update" element={<AdminProfileUpdatePage />} />
          </Route>
        </Route>
      </Route>

      {/* FALLBACK CATCH-ALL */}
      <Route path="*" element={<Navigate to="/not-found" replace />} />
    </Routes>
  );
};

export default AppRoutes;
