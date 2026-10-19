import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SCREENS } from './screensData';
import { ScreenRenderer } from './components/ScreenRenderer';
import type { ScreenDefinition } from './types';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CustomerProtectedRoute } from './components/CustomerProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { StorefrontArticlePage, StorefrontContentPage, userFacingPages } from './components/storefront/StorefrontContentPage';

const NotFoundPage = lazy(() => import('./components/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));
const DevShowcase = lazy(() => import('./components/DevShowcase').then((module) => ({ default: module.DevShowcase })));
const AccountAuthPage = lazy(() => import('./components/AccountAuthPage').then((module) => ({ default: module.AccountAuthPage })));
const StorefrontLegalPage = lazy(() => import('./components/storefront/StorefrontLegalPage').then((module) => ({ default: module.StorefrontLegalPage })));
const AdminCustomersPage = lazy(() => import('./components/AdminCustomersPage').then((module) => ({ default: module.AdminCustomersPage })));
const AdminCustomerDetailPage = lazy(() => import('./components/AdminCustomersPage').then((module) => ({ default: module.AdminCustomerDetailPage })));
const AdminOrdersPage = lazy(() => import('./components/OrderPages').then((module) => ({ default: module.AdminOrdersPage })));
const AdminPaymentSettingsPage = lazy(() => import('./components/OrderPages').then((module) => ({ default: module.AdminPaymentSettingsPage })));
const CustomerOrdersPage = lazy(() => import('./components/OrderPages').then((module) => ({ default: module.CustomerOrdersPage })));
const OrderConfirmationPage = lazy(() => import('./components/OrderPages').then((module) => ({ default: module.OrderConfirmationPage })));
const AdminFulfillmentPage = lazy(() => import('./components/AdminFulfillmentPage').then((module) => ({ default: module.AdminFulfillmentPage })));
const AdminBannersPage = lazy(() => import('./components/AdminBannersPage').then((module) => ({ default: module.AdminBannersPage })));
const AdminBannerFormPage = lazy(() => import('./components/AdminBannersPage').then((module) => ({ default: module.AdminBannerFormPage })));
const AdminRoleManagementPage = lazy(() => import('./components/AdminRoleManagementPage').then((module) => ({ default: module.AdminRoleManagementPage })));
const ResetPasswordActionPage = lazy(() => import('./components/ResetPasswordActionPage').then((module) => ({ default: module.ResetPasswordActionPage })));

function getScreen(id: string): ScreenDefinition {
  const found = SCREENS.find((s) => s.id === id);
  if (!found) {
    throw new Error(`Screen ${id} not found in screensData`);
  }
  return found;
}

function RouteNotFound() {
  const location = useLocation();
  return location.pathname.startsWith('/admin')
    ? <NotFoundPage />
    : <StorefrontContentPage {...userFacingPages.notFound} />;
}

export default function App() {
  // Storefront screens
  const homeScreen = getScreen('storefront-home');
  const productsScreen = getScreen('storefront-products');
  const productDetailScreen = getScreen('storefront-product-detail');
  const cartScreen = getScreen('storefront-cart');
  const checkoutScreen = getScreen('storefront-checkout');
  const accountScreen = getScreen('storefront-account');
  const profileScreen = getScreen('storefront-profile');
  const shippingAddressScreen = getScreen('storefront-shipping-address');

  // Admin screens
  const adminDashboardScreen = getScreen('admin-dashboard');
  const adminProductsScreen = getScreen('admin-products');
  const adminAddProductScreen = getScreen('admin-add-product');
  const adminEditProductScreen = getScreen('admin-edit-product');
  const adminCouponsScreen = getScreen('admin-coupons');
  const adminAddCouponScreen = getScreen('admin-add-coupon');
  const adminEditCouponScreen = getScreen('admin-edit-coupon');
  const adminSettingsScreen = getScreen('admin-settings');

  // Brand screen
  const brandLogoScreen = getScreen('brand-logo');

  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Suspense fallback={<div role="status" className="p-6">กำลังโหลดหน้า…</div>}>
          <Routes>
            {/* ========================================================= */}
            {/* CUSTOMER STOREFRONT ROUTES                               */}
            {/* ========================================================= */}
            <Route
              path="/"
              element={
                <ScreenRenderer
                  screen={homeScreen}
                  routeType="storefront"
                  backFallback="/"
                />
              }
            />
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route
              path="/products"
              element={
                <ScreenRenderer
                  screen={productsScreen}
                  routeType="storefront"
                  backFallback="/"
                />
              }
            />
            <Route
              path="/products/:slug"
              element={
                <ScreenRenderer
                  screen={productDetailScreen}
                  routeType="storefront"
                  backFallback="/products"
                />
              }
            />
            <Route
              path="/cart"
              element={
                <ScreenRenderer
                  screen={cartScreen}
                  routeType="storefront"
                  backFallback="/products"
                />
              }
            />
            <Route
              path="/checkout"
              element={
                <ScreenRenderer
                  screen={checkoutScreen}
                  routeType="storefront"
                  backFallback="/cart"
                />
              }
            />
              <Route path="/order-success" element={<OrderConfirmationPage />} />
            <Route
              path="/login"
              element={<AccountAuthPage mode="login" />}
            />
            <Route path="/reset-password" element={<ResetPasswordActionPage />} />
            <Route
              path="/register"
              element={<AccountAuthPage mode="register" />}
            />
            <Route
              path="/account"
              element={
                <CustomerProtectedRoute>
                  <ScreenRenderer
                    screen={accountScreen}
                    routeType="storefront"
                    backFallback="/"
                  />
                </CustomerProtectedRoute>
              }
            />
            <Route
              path="/account/profile"
              element={
                <CustomerProtectedRoute>
                  <ScreenRenderer
                    screen={profileScreen}
                    routeType="storefront"
                    backFallback="/account"
                  />
                </CustomerProtectedRoute>
              }
            />
            <Route
              path="/account/orders"
              element={
                <CustomerProtectedRoute>
                  <CustomerOrdersPage />
                </CustomerProtectedRoute>
              }
            />
            <Route
              path="/account/orders/:orderId"
              element={
                <CustomerProtectedRoute>
                  <CustomerOrdersPage />
                </CustomerProtectedRoute>
              }
            />

            {/* Additional user-facing sitemap destinations */}
            <Route path="/about" element={<StorefrontContentPage {...userFacingPages.about} />} />
            <Route path="/articles" element={<StorefrontArticlePage />} />
            <Route path="/articles/:articleId" element={<StorefrontArticlePage />} />
            <Route path="/community" element={<StorefrontContentPage {...userFacingPages.community} />} />
            <Route path="/contact" element={<StorefrontContentPage {...userFacingPages.contact} />} />
            <Route path="/product/:slug" element={<ScreenRenderer screen={productDetailScreen} routeType="storefront" backFallback="/products" />} />
            <Route path="/profile" element={<Navigate to="/account/profile" replace />} />
            <Route path="/orders" element={<Navigate to="/account/orders" replace />} />
            <Route
              path="/addresses"
              element={<Navigate to="/account/addresses" replace />}
            />
            <Route
              path="/wishlist"
              element={
                <CustomerProtectedRoute>
                  <StorefrontContentPage {...userFacingPages.wishlist} />
                </CustomerProtectedRoute>
              }
            />
            <Route
              path="/account/addresses"
              element={
                <CustomerProtectedRoute>
                  <ScreenRenderer
                    screen={shippingAddressScreen}
                    routeType="storefront"
                    backFallback="/account"
                  />
                </CustomerProtectedRoute>
              }
            />
            <Route
              path="/account/wishlist"
              element={
                <CustomerProtectedRoute>
                  <StorefrontContentPage {...userFacingPages.wishlist} />
                </CustomerProtectedRoute>
              }
            />
            <Route path="/privacy" element={<StorefrontLegalPage kind="privacy" />} />
            <Route path="/terms" element={<StorefrontLegalPage kind="terms" />} />
            <Route path="/coming-soon" element={<StorefrontContentPage {...userFacingPages.comingSoon} />} />
            <Route path="/maintenance" element={<StorefrontContentPage {...userFacingPages.maintenance} />} />
            <Route path="/404" element={<StorefrontContentPage {...userFacingPages.notFound} />} />

            {/* ========================================================= */}
            {/* ADMIN & SUPER ADMIN ROUTES                                */}
            {/* ========================================================= */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route
              path="/admin/login"
              element={<AccountAuthPage mode="admin" />}
            />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminDashboardScreen}
                    routeType="admin"
                    backFallback="/admin/dashboard"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/products"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminProductsScreen}
                    routeType="admin"
                    backFallback="/admin/dashboard"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/products/new"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminAddProductScreen}
                    routeType="admin"
                    backFallback="/admin/products"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/products/:productId/edit"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminEditProductScreen}
                    routeType="admin"
                    backFallback="/admin/products"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/orders"
              element={
                <AdminProtectedRoute>
                  <AdminOrdersPage />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/orders/:orderId"
              element={
                <AdminProtectedRoute>
                  <AdminOrdersPage />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/fulfillment"
              element={<AdminProtectedRoute><AdminFulfillmentPage /></AdminProtectedRoute>}
            />
            <Route
              path="/admin/customers"
              element={
                <AdminProtectedRoute>
                  <AdminCustomersPage />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/customers/:customerId"
              element={
                <AdminProtectedRoute>
                  <AdminCustomerDetailPage />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/banners"
              element={<AdminProtectedRoute><AdminBannersPage /></AdminProtectedRoute>}
            />
            <Route
              path="/admin/banners/new"
              element={<AdminProtectedRoute><AdminBannerFormPage /></AdminProtectedRoute>}
            />
            <Route
              path="/admin/banners/:bannerId/edit"
              element={<AdminProtectedRoute><AdminBannerFormPage /></AdminProtectedRoute>}
            />
            <Route
              path="/admin/coupons"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer screen={adminCouponsScreen} routeType="admin" backFallback="/admin/dashboard" />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/coupons/new"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer screen={adminAddCouponScreen} routeType="admin" backFallback="/admin/coupons" />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/coupons/:couponId/edit"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer screen={adminEditCouponScreen} routeType="admin" backFallback="/admin/coupons" />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/admins"
              element={<AdminProtectedRoute requiredRole="super_admin"><AdminRoleManagementPage /></AdminProtectedRoute>}
            />
            <Route
              path="/admin/settings"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminSettingsScreen}
                    routeType="admin"
                    backFallback="/admin/dashboard"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/payment"
              element={
                <AdminProtectedRoute requiredRole="super_admin">
                  <AdminPaymentSettingsPage />
                </AdminProtectedRoute>
              }
            />

            {/* Brand Asset Route */}
            <Route
              path="/brand/logo"
              element={
                <ScreenRenderer
                  screen={brandLogoScreen}
                  routeType="storefront"
                  backFallback="/"
                />
              }
            />

            {/* Development-Only Internal Showcase */}
            <Route path="/_dev" element={<DevShowcase />} />
            <Route path="/_dev/showcase" element={<DevShowcase />} />

            {/* 404 Fallback */}
            <Route path="*" element={<RouteNotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
