import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SCREENS } from './screensData';
import { ScreenRenderer } from './components/ScreenRenderer';
import { NotFoundPage } from './components/NotFoundPage';
import { DevShowcase } from './components/DevShowcase';
import { ScreenDefinition } from './types';
import { AuthProvider } from './context/AuthContext';
import { CustomerProtectedRoute } from './components/CustomerProtectedRoute';
import { AdminProtectedRoute } from './components/AdminProtectedRoute';

function getScreen(id: string): ScreenDefinition {
  const found = SCREENS.find((s) => s.id === id);
  if (!found) {
    throw new Error(`Screen ${id} not found in screensData`);
  }
  return found;
}

export default function App() {
  // Storefront screens
  const homeScreen = getScreen('storefront-home');
  const productsScreen = getScreen('storefront-products');
  const productDetailScreen = getScreen('storefront-product-detail');
  const cartScreen = getScreen('storefront-cart');
  const orderSuccessScreen = getScreen('storefront-order-success');
  const loginScreen = getScreen('storefront-login');
  const registerScreen = getScreen('storefront-register');
  const accountScreen = getScreen('storefront-account');
  const profileScreen = getScreen('storefront-profile');
  const myOrdersScreen = getScreen('storefront-my-orders');
  const orderDetailScreen = getScreen('storefront-order-detail');

  // Admin screens
  const adminLoginScreen = getScreen('admin-login');
  const adminDashboardScreen = getScreen('admin-dashboard');
  const adminProductsScreen = getScreen('admin-products');
  const adminAddProductScreen = getScreen('admin-add-product');
  const adminEditProductScreen = getScreen('admin-edit-product');
  const adminOrdersScreen = getScreen('admin-orders');
  const adminOrderDetailScreen = getScreen('admin-order-detail');
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
          element={<Navigate to="/cart" replace />}
        />
        <Route
          path="/order-success"
          element={
            <ScreenRenderer
              screen={orderSuccessScreen}
              routeType="storefront"
              backFallback="/products"
            />
          }
        />
        <Route
          path="/login"
          element={
            <ScreenRenderer
              screen={loginScreen}
              routeType="storefront"
              backFallback="/"
            />
          }
        />
        <Route
          path="/register"
          element={
            <ScreenRenderer
              screen={registerScreen}
              routeType="storefront"
              backFallback="/login"
            />
          }
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
              <ScreenRenderer
                screen={myOrdersScreen}
                routeType="storefront"
                backFallback="/account"
              />
            </CustomerProtectedRoute>
          }
        />
        <Route
          path="/account/orders/:orderId"
          element={
            <CustomerProtectedRoute>
              <ScreenRenderer
                screen={orderDetailScreen}
                routeType="storefront"
                backFallback="/account/orders"
              />
            </CustomerProtectedRoute>
          }
        />

        {/* ========================================================= */}
        {/* ADMIN & SUPER ADMIN ROUTES                                */}
        {/* ========================================================= */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route
          path="/admin/login"
          element={
            <ScreenRenderer
              screen={adminLoginScreen}
              routeType="admin"
              backFallback="/admin/dashboard"
            />
          }
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
              <ScreenRenderer
                screen={adminOrdersScreen}
                routeType="admin"
                backFallback="/admin/dashboard"
              />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/orders/:orderId"
          element={
            <AdminProtectedRoute>
              <ScreenRenderer
                screen={adminOrderDetailScreen}
                routeType="admin"
                backFallback="/admin/orders"
              />
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
        <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </BrowserRouter>
    </AuthProvider>
  );
}
