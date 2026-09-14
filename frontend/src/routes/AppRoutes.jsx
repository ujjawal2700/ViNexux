import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import PublicLayout from '../layouts/PublicLayout';
import DealerLayout from '../layouts/DealerLayout';
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
import ProductsPage from '../pages/public/ProductsPage';
import ProductDetailPage from '../pages/public/ProductDetailPage';
import CategoriesPage from '../pages/public/CategoriesPage';
import CmsPage from '../pages/public/CmsPage';
import UnauthorizedPage from '../pages/public/UnauthorizedPage';
import NotFoundPage from '../pages/public/NotFoundPage';
import UiPreviewPage from '../pages/public/UiPreviewPage';

// Customer Pages
import CustomerDashboardPage from '../pages/customer/CustomerDashboardPage';
import CartPage from '../pages/customer/CartPage';
import CheckoutEnquiryPage from '../pages/customer/CheckoutEnquiryPage';
import CustomerEnquiriesPage from '../pages/customer/CustomerEnquiriesPage';
import CustomerEnquiryDetailPage from '../pages/customer/CustomerEnquiryDetailPage';
import CustomerProfilePage from '../pages/customer/CustomerProfilePage';
import CustomerProfileUpdatePage from '../pages/customer/CustomerProfileUpdatePage';

// Dealer Pages
import DealerDashboardPage from '../pages/dealer/DealerDashboardPage';
import DealerKycPage from '../pages/dealer/DealerKycPage';
import DealerKycStatusPage from '../pages/dealer/DealerKycStatusPage';
import DealerPricingPage from '../pages/dealer/DealerPricingPage';
import DealerCartPage from '../pages/dealer/DealerCartPage';
import DealerEnquiriesPage from '../pages/dealer/DealerEnquiriesPage';
import DealerEnquiryDetailPage from '../pages/dealer/DealerEnquiryDetailPage';
import DealerProfilePage from '../pages/dealer/DealerProfilePage';
import DealerProfileUpdatePage from '../pages/dealer/DealerProfileUpdatePage';

// Admin Pages
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminCategoriesPage from '../pages/admin/AdminCategoriesPage';
import AdminProductsPage from '../pages/admin/AdminProductsPage';
import AdminProductDetailPage from '../pages/admin/AdminProductDetailPage';
import AdminDealersPage from '../pages/admin/AdminDealersPage';
import AdminDealerDetailPage from '../pages/admin/AdminDealerDetailPage';
import AdminCustomersPage from '../pages/admin/AdminCustomersPage';
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

const AppRoutes = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES (WITH PUBLIC LAYOUT) */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:id" element={<ProductDetailPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/content/pages/:slug" element={<CmsPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/not-found" element={<NotFoundPage />} />
        
        {/* Internal Component Library Showcase */}
        <Route path="/ui-preview" element={<UiPreviewPage />} />

        {/* Guest Auth Routes */}
        <Route element={<PublicRoute restricted={true} />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage initialTab="signup" />} />
          <Route path="/signup" element={<LoginPage initialTab="signup" />} />
          <Route path="/customer/login" element={<Navigate to="/login" replace />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
        </Route>

        {/* CUSTOMER PROTECTED ROUTES */}
        <Route element={<ProtectedRoute />}>
          <Route element={<RoleRoute allowedRoles={[ROLES.CUSTOMER]} />}>
            <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />
            <Route path="/customer/cart" element={<CartPage />} />
            <Route path="/customer/checkout-enquiry" element={<CheckoutEnquiryPage />} />
            <Route path="/customer/enquiries" element={<CustomerEnquiriesPage />} />
            <Route path="/customer/enquiries/:id" element={<CustomerEnquiryDetailPage />} />
            <Route path="/customer/profile" element={<CustomerProfilePage />} />
            <Route path="/customer/profile/update" element={<CustomerProfileUpdatePage />} />
          </Route>
        </Route>
      </Route>

      {/* DEDICATED ADMIN LOGIN (standalone, no storefront chrome) */}
      <Route element={<PublicRoute restricted={true} />}>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin/verify-otp" element={<VerifyOtpPage />} />
      </Route>

      {/* DEALER PROTECTED ROUTES (WITH DEALER LAYOUT) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRoute allowedRoles={[ROLES.DEALER]} />}>
          <Route element={<DealerLayout />}>
            <Route path="/dealer/dashboard" element={<DealerDashboardPage />} />
            <Route path="/dealer/kyc" element={<DealerKycPage />} />
            <Route path="/dealer/kyc/status" element={<DealerKycStatusPage />} />
            <Route path="/dealer/pricing" element={<DealerPricingPage />} />
            <Route path="/dealer/cart" element={<DealerCartPage />} />
            <Route path="/dealer/enquiries" element={<DealerEnquiriesPage />} />
            <Route path="/dealer/enquiries/:id" element={<DealerEnquiryDetailPage />} />
            <Route path="/dealer/profile" element={<DealerProfilePage />} />
            <Route path="/dealer/profile/update" element={<DealerProfileUpdatePage />} />
          </Route>
        </Route>
      </Route>

      {/* ADMIN PROTECTED ROUTES (WITH ADMIN LAYOUT) */}
      <Route element={<ProtectedRoute loginPath="/admin/login" />}>
        <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/categories" element={<AdminCategoriesPage />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/products/new" element={<AdminProductDetailPage />} />
            <Route path="/admin/products/:id" element={<AdminProductDetailPage />} />
            <Route path="/admin/dealers" element={<AdminDealersPage />} />
            <Route path="/admin/dealers/:id" element={<AdminDealerDetailPage />} />
            <Route path="/admin/customers" element={<AdminCustomersPage />} />
            <Route path="/admin/enquiries" element={<AdminEnquiriesPage />} />
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
