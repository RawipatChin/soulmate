import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SCREENS } from './screensData';
import { ScreenRenderer } from './components/ScreenRenderer';
import { NotFoundPage } from './components/NotFoundPage';
import { DevShowcase } from './components/DevShowcase';
import { ScreenDefinition } from './types';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CustomerProtectedRoute } from './components/CustomerProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';
import { AccountAuthPage } from './components/AccountAuthPage';
import { StorefrontArticlePage, StorefrontContentPage, userFacingPages } from './components/storefront/StorefrontContentPage';
import { AdminOrdersPage, CustomerOrdersPage, OrderConfirmationPage } from './components/OrderPages';

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
  const adminCustomersScreen = getScreen('admin-customers');
  const adminCustomerDetailScreen = getScreen('admin-customer-detail');
  const adminBannersScreen = getScreen('admin-banners');
  const adminAddBannerScreen = getScreen('admin-add-banner');
  const adminEditBannerScreen = getScreen('admin-edit-banner');
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
            <Route path="/privacy" element={<StorefrontContentPage {...userFacingPages.privacy} />} />
            <Route path="/terms" element={<StorefrontContentPage {...userFacingPages.terms} />} />
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
              path="/admin/customers"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminCustomersScreen}
                    routeType="admin"
                    backFallback="/admin/dashboard"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/customers/:customerId"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminCustomerDetailScreen}
                    routeType="admin"
                    backFallback="/admin/customers"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/banners"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminBannersScreen}
                    routeType="admin"
                    backFallback="/admin/dashboard"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/banners/new"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminAddBannerScreen}
                    routeType="admin"
                    backFallback="/admin/banners"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/banners/:bannerId/edit"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminEditBannerScreen}
                    routeType="admin"
                    backFallback="/admin/banners"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/coupons"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminCouponsScreen}
                    routeType="admin"
                    backFallback="/admin/dashboard"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/coupons/new"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminAddCouponScreen}
                    routeType="admin"
                    backFallback="/admin/coupons"
                  />
                </AdminProtectedRoute>
              }
            />
            <Route
              path="/admin/coupons/:couponId/edit"
              element={
                <AdminProtectedRoute>
                  <ScreenRenderer
                    screen={adminEditCouponScreen}
                    routeType="admin"
                    backFallback="/admin/coupons"
                  />
                </AdminProtectedRoute>
              }
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
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
