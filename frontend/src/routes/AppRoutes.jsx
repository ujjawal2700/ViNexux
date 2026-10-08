import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';

// Route Guards
import PublicRoute from './PublicRoute';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

import lazyWithRetry from '../utils/lazyWithRetry';
import RouteFallback from '../components/ui/RouteFallback';

// Constants
import { ROLES } from '../constants';

// Storefront core pages stay in the main bundle; everything else is split
// into per-route chunks so shoppers never download the admin panel.
import HomePage from '../pages/public/HomePage';
import ProductsPage from '../pages/public/ProductsPage';
import ProductDetailPage from '../pages/public/ProductDetailPage';
import NotFoundPage from '../pages/public/NotFoundPage';
import {
  CategoryRoute,
  CategoryLevel2Route,
  CategoryLevel3Route,
} from './HierarchicalCategoryRoutes';

const AdminLayout = lazyWithRetry(() => import('../layouts/AdminLayout'));

// Public Pages
const LoginPage = lazyWithRetry(() => import('../pages/auth/LoginPage'));
const AdminLoginPage = lazyWithRetry(() => import('../pages/auth/AdminLoginPage'));
const VerifyOtpPage = lazyWithRetry(() => import('../pages/auth/VerifyOtpPage'));
const ForgotPasswordPage = lazyWithRetry(() => import('../pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazyWithRetry(() => import('../pages/auth/ResetPasswordPage'));
const WishlistPage = lazyWithRetry(() => import('../pages/public/WishlistPage'));
const BrandsPage = lazyWithRetry(() => import('../pages/public/BrandsPage'));
const CmsPage = lazyWithRetry(() => import('../pages/public/CmsPage'));
const LegalPage = lazyWithRetry(() => import('../pages/public/LegalPage'));
const UnauthorizedPage = lazyWithRetry(() => import('../pages/public/UnauthorizedPage'));
const UiPreviewPage = lazyWithRetry(() => import('../pages/public/UiPreviewPage'));
const LowStockProductsPage = lazyWithRetry(() => import('../pages/public/LowStockProductsPage'));

// Account Pages (shared by customer & dealer roles - no more separate
// dealer portal; see pages/account/)
const CartPage = lazyWithRetry(() => import('../pages/account/CartPage'));
const CheckoutEnquiryPage = lazyWithRetry(() => import('../pages/account/CheckoutEnquiryPage'));
const EnquiryDetailPage = lazyWithRetry(() => import('../pages/account/EnquiryDetailPage'));
const ProfilePage = lazyWithRetry(() => import('../pages/account/ProfilePage'));
const ProfileUpdatePage = lazyWithRetry(() => import('../pages/account/ProfileUpdatePage'));

// Admin Pages
const AdminDashboardPage = lazyWithRetry(() => import('../pages/admin/AdminDashboardPage'));
const AdminCategoriesPage = lazyWithRetry(() => import('../pages/admin/AdminCategoriesPage'));
const AdminHeaderCategoriesPage = lazyWithRetry(() => import('../pages/admin/AdminHeaderCategoriesPage'));
const AdminMainCategoriesPage = lazyWithRetry(() => import('../pages/admin/AdminMainCategoriesPage'));
const AdminSubCategoriesPage = lazyWithRetry(() => import('../pages/admin/AdminSubCategoriesPage'));
const AdminProductsPage = lazyWithRetry(() => import('../pages/admin/AdminProductsPage'));
const AdminBrandsPage = lazyWithRetry(() => import('../pages/admin/AdminBrandsPage'));
const AdminProductDetailPage = lazyWithRetry(() => import('../pages/admin/AdminProductDetailPage'));
const AdminProductImportPage = lazyWithRetry(() => import('../pages/admin/AdminProductImportPage'));
const AdminDealersPage = lazyWithRetry(() => import('../pages/admin/AdminDealersPage'));
const AdminDealerDetailPage = lazyWithRetry(() => import('../pages/admin/AdminDealerDetailPage'));
const AdminCustomersPage = lazyWithRetry(() => import('../pages/admin/AdminCustomersPage'));
const AdminCustomerDetailPage = lazyWithRetry(() => import('../pages/admin/AdminCustomerDetailPage'));
const AdminEnquiriesPage = lazyWithRetry(() => import('../pages/admin/AdminEnquiriesPage'));
const AdminEnquiryDetailPage = lazyWithRetry(() => import('../pages/admin/AdminEnquiryDetailPage'));
const AdminSessionsPage = lazyWithRetry(() => import('../pages/admin/AdminSessionsPage'));
const AdminReportsPage = lazyWithRetry(() => import('../pages/admin/AdminReportsPage'));
const AdminCmsBannersPage = lazyWithRetry(() => import('../pages/admin/AdminCmsBannersPage'));
const AdminCmsPromoPage = lazyWithRetry(() => import('../pages/admin/AdminCmsPromoPage'));
const AdminCmsPagesPage = lazyWithRetry(() => import('../pages/admin/AdminCmsPagesPage'));

const AdminCmsFooterPage = lazyWithRetry(() => import('../pages/admin/AdminCmsFooterPage'));
const AdminWebsiteSettingsPage = lazyWithRetry(() => import('../pages/admin/AdminWebsiteSettingsPage'));
const AdminSeasonalThemesPage = lazyWithRetry(() => import('../pages/admin/AdminSeasonalThemesPage'));
const AdminProfilePage = lazyWithRetry(() => import('../pages/admin/AdminProfilePage'));
const AdminProfileUpdatePage = lazyWithRetry(() => import('../pages/admin/AdminProfileUpdatePage'));

// Tiny helper so the one dynamic-param legacy redirect
// (/customer/enquiries/:id) can interpolate :id - <Navigate> alone can't.
const EnquiryDetailRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/account/enquiries/${id}`} replace />;
};

const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* PUBLIC ROUTES (WITH PUBLIC LAYOUT) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/theme-preview" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/search" element={<ProductsPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/low-stock" element={<LowStockProductsPage />} />
        <Route path="/limited-stock" element={<Navigate to="/low-stock" replace />} />
        <Route path="/categories" element={<Navigate to="/" replace />} />
        <Route path="/brands" element={<BrandsPage />} />
        <Route path="/shop-by-brand" element={<BrandsPage />} />
        <Route path="/content/pages/:slug" element={<CmsPage />} />
        <Route path="/privacy" element={<LegalPage type="privacy" />} />
        <Route path="/terms" element={<LegalPage type="terms" />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/not-found" element={<NotFoundPage />} />

        {/* Internal Component Library Showcase */}
        <Route path="/ui-preview" element={<UiPreviewPage />} />

        {/* Guest Auth Routes (Customer / Dealer) */}
        <Route element={<PublicRoute restricted={true} portal="customer" />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage initialTab="signup" />} />
          <Route path="/signup" element={<Navigate to="/register" replace />} />
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
            <Route path="/account/enquiries" element={<ProfilePage />} />
            <Route path="/account/enquiries/:id" element={<EnquiryDetailPage />} />
            <Route path="/account/profile" element={<ProfilePage />} />
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
        <Route path="/dealer/pricing" element={<Navigate to="/" replace />} />

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
        <Route path="/admin/forgot-password" element={<ForgotPasswordPage portal="admin" />} />
        <Route path="/admin/reset-password" element={<ResetPasswordPage portal="admin" />} />
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
            <Route path="/admin/brands" element={<AdminBrandsPage />} />
            <Route path="/admin/products/new" element={<AdminProductDetailPage />} />
            <Route path="/admin/products/import" element={<AdminProductImportPage />} />
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
            <Route path="/admin/enquiries" element={<Navigate to="/admin/enquiries/customers" replace />} />
            <Route path="/admin/enquiries/:id" element={<AdminEnquiryDetailPage />} />
            <Route path="/admin/sessions" element={<AdminSessionsPage />} />
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/cms/banners" element={<AdminCmsBannersPage />} />
            <Route path="/admin/cms/promotional-banners" element={<AdminCmsPromoPage />} />
            <Route path="/admin/cms/pages" element={<AdminCmsPagesPage />} />

            <Route path="/admin/cms/footer-content" element={<AdminCmsFooterPage />} />
            <Route path="/admin/cms/website-settings" element={<AdminWebsiteSettingsPage />} />
            <Route path="/admin/cms/themes" element={<AdminSeasonalThemesPage />} />
            <Route path="/admin/cms/themes/new" element={<AdminSeasonalThemesPage />} />
            <Route path="/admin/cms/themes/:id" element={<AdminSeasonalThemesPage />} />
            <Route path="/admin/profile" element={<AdminProfilePage />} />
            <Route path="/admin/profile/update" element={<AdminProfileUpdatePage />} />
          </Route>
        </Route>
      </Route>

      {/* FALLBACK CATCH-ALL (Preserves URL in browser and displays Header & Footer) */}
      <Route element={<PublicLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
    </Suspense>
  );
};

export default AppRoutes;
