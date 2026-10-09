import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScreenDefinition, CustomerProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getCartSnapshot,
  addCartItem,
  updateCartItemQuantity,
  removeCartItem as removeCartItemFromService,
  replaceCartItems,
  sanitizePersistedCartItems,
} from '../services/cartService';
import type {
  StorefrontCartItem,
  StorefrontCartSnapshot,
} from '../services/cartService';
import { mapFirebaseAuthError } from '../utils/authErrors';
import { getMembershipProgress } from '../utils/membership';
import {
  getProducts,
  getProductById,
  getProductBySlugOrId,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteDraftProduct,
  subscribeToProducts,
  generateSlug,
  canonicalizeProductImages,
  extractFdaRegistrationNumber,
  buildProductPayload,
  validateForPublish,
  resolveAllProductImages,
} from '../services/productService';
import type { Product, ProductStatus, ProductShipping, ProductImage } from '../types/product';
import { collection, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  validateProductImages,
  uploadProductImage,
  uploadProductImageFile,
  deleteProductImageFiles,
} from '../services/productImageService';
import { mountVariantManager } from '../utils/productVariantManager';
import { StorefrontShell } from './storefront/StorefrontShell';
import { mountGuidancePanel } from './storefront/guidancePanel';
import { canAccessAdmin } from '../utils/accountAccess';
import { renderStorefrontProductCard } from './storefront/StorefrontProductCard';
import { clearPendingOrderRequestKey, createPendingOrder, listAdminOrders, OrderReviewError } from '../services/orderService';
import { orderFailureMessage } from '../services/orderFailure';

function installStorefrontDesktopStyles(doc: Document) {
  if (doc.getElementById('soulmate-desktop-storefront-styles')) return;
  const style = doc.createElement('style');
  style.id = 'soulmate-desktop-storefront-styles';
  style.textContent = `
    @media (min-width: 769px) {
      html, body { width: 100% !important; max-width: none !important; min-height: 0 !important; height: auto !important; overflow-x: hidden !important; }
      body { display: block !important; margin: 0 auto !important; padding-bottom: 0 !important; }
      body > header, body > nav, body > footer { display: none !important; }
      main { width: min(100%, 1600px) !important; max-width: 1600px !important; min-height: 0 !important; margin: 0 auto !important; padding-top: 24px !important; padding-bottom: 32px !important; }
      main > div { max-width: 100% !important; }
      #state-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 20px !important; }
      #view-detail { display: grid !important; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr) !important; align-items: start !important; gap: 20px !important; }
      #view-detail > div:first-child { grid-row: 1 / span 5 !important; border: 1px solid #e4e4e7 !important; border-radius: 20px !important; }
      #view-detail > section { border: 1px solid #e4e4e7 !important; border-radius: 16px !important; }
      #real-product-detail { width: 100% !important; max-width: 1600px !important; margin: 0 auto !important; padding: 24px 0 32px !important; }
      #real-product-detail > div:first-child { width: 100% !important; max-width: 1440px !important; margin: 0 auto !important; padding: 0 32px !important; display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important; align-items: start !important; gap: 20px 28px !important; }
      #real-product-primary-column, #real-product-secondary-column { min-width: 0 !important; display: flex !important; flex-direction: column !important; gap: 20px !important; }
      #real-product-primary-column { grid-column: 1 !important; grid-row: 1 !important; }
      #real-product-secondary-column { grid-column: 2 !important; grid-row: 1 !important; }
      #real-back-to-products { align-self: flex-start !important; margin-bottom: -4px !important; }
      #real-product-overview { min-height: 0 !important; }
      #real-product-summary { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 16px !important; }
      #real-product-description { min-height: 0 !important; }
      #real-product-attributes { display: grid !important; grid-template-columns: repeat(2, minmax(0, 1fr)) !important; align-content: start !important; gap: 12px !important; }
      #real-product-attributes > section { min-width: 0 !important; }
      #soulmate-product-reviews { margin-top: 0 !important; }
      #soulmate-related-products { grid-column: 1 / -1 !important; grid-row: 2 !important; }
      #real-product-purchase-bar { position: fixed !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 50 !important; }
      #soulmate-related-grid { display: grid !important; grid-template-columns: repeat(4, minmax(0, 1fr)) !important; gap: 16px !important; }
      #checkoutForm { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(300px, 380px) !important; align-items: start !important; gap: 20px !important; }
      #checkoutOrderSummarySection { grid-column: 2 !important; grid-row: 1 / span 5 !important; position: sticky !important; top: 16px !important; }
      #checkoutForm > section:not(#checkoutOrderSummarySection) { grid-column: 1 !important; }
      #state-filled { display: grid !important; grid-template-columns: minmax(0, 1fr) minmax(300px, 380px) !important; align-items: start !important; gap: 20px !important; }
      #cart-item-list { min-width: 0 !important; }
      #state-filled > #cart-item-list { grid-column: 1 !important; grid-row: 1 / span 3 !important; }
      #state-filled > #coupon-section { grid-column: 2 !important; grid-row: 1 !important; }
      #state-filled > section:not(#cart-item-list):not(#coupon-section) { grid-column: 2 !important; grid-row: 2 !important; }
      #sticky-purchase-bar { position: static !important; grid-column: 2 !important; grid-row: 3 !important; }
      .soulmate-home-feature-grid { display: grid !important; grid-template-columns: minmax(0, 1.4fr) minmax(320px, .8fr) !important; align-items: stretch !important; gap: 24px !important; }
      .soulmate-account-nav { width: min(100% - 48px, 1600px); margin: 18px auto 0; display: flex; flex-wrap: wrap; gap: 8px; }
      .soulmate-account-nav a { padding: 9px 14px; border: 1px solid #dce7e1; border-radius: 999px; color: #2d6857; text-decoration: none; font-size: 13px; }
      .soulmate-account-nav a[aria-current="page"], .soulmate-account-nav a:hover { background: #e8f8f2; }
      .soulmate-category-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 0 0 14px; }
      .soulmate-category-filters a { padding: 8px 14px; border: 1px solid #dce7e1; border-radius: 999px; color: #2d6857; text-decoration: none; font-size: 13px; }
      .soulmate-category-filters a[aria-current="page"], .soulmate-category-filters a:hover { background: #a8e5cf; }
      .soulmate-category-filters span { color: #71717a; font-size: 13px; }
      .soulmate-home-feature-grid > [data-cms-slot="hero_banner_1"] { padding: 0 !important; }
      .soulmate-guidance-panel { display: flex !important; flex-direction: column !important; justify-content: center !important; padding: 28px !important; border: 1px solid #d8eee4 !important; border-radius: 20px !important; background: #e8f8f2 !important; }
      .soulmate-guidance-panel h2 { margin: 0 !important; color: #1b4d3e !important; font-size: 23px !important; line-height: 1.45 !important; }
      .soulmate-guidance-panel p { margin: 10px 0 18px !important; color: #53615d !important; font-size: 14px !important; line-height: 1.75 !important; }
      .soulmate-guidance-panel textarea { width: 100% !important; min-height: 106px !important; padding: 12px 14px !important; border: 1px solid #dce7e1 !important; border-radius: 14px !important; background: white !important; resize: vertical !important; }
      .soulmate-guidance-panel button { min-height: 44px !important; margin-top: 12px !important; border: 0 !important; border-radius: 999px !important; background: #ca5a9a !important; color: white !important; font-weight: 700 !important; opacity: .58 !important; }
      .soulmate-guidance-panel small { margin-top: 12px !important; color: #53615d !important; line-height: 1.6 !important; }
      .real-home-product-card { border: 1px solid #d3ded8 !important; box-shadow: 0 8px 24px rgba(31, 66, 53, .14) !important; transition: box-shadow .18s ease, transform .18s ease !important; }
      .real-home-product-card:hover, .real-home-product-card:focus-within { box-shadow: 0 12px 30px rgba(31, 66, 53, .2) !important; transform: translateY(-2px); }
    }
    @media (min-width: 769px) and (max-width: 1050px) {
      #state-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
      .soulmate-home-feature-grid { grid-template-columns: minmax(0, 1.15fr) minmax(270px, .85fr) !important; gap: 16px !important; }
    }
    @media (max-width: 768px) {
      #real-product-detail > div:first-child { display: flex !important; flex-direction: column !important; gap: 16px !important; padding: 0 16px !important; }
      #real-product-primary-column, #real-product-secondary-column { display: contents !important; }
      #real-back-to-products { order: 0 !important; align-self: flex-start !important; }
      #real-product-gallery { order: 1 !important; }
      #real-product-overview { order: 2 !important; }
      #real-product-attributes { order: 3 !important; }
      #real-product-summary { order: 4 !important; }
      #real-product-config { order: 5 !important; }
      #soulmate-product-reviews { order: 6 !important; }
      #soulmate-related-products { order: 7 !important; }
      #real-product-overview, #real-product-summary, #real-product-config, #real-product-attributes, #soulmate-product-reviews, #soulmate-related-products { width: 100% !important; }
      #real-product-summary { display: block !important; }
      #real-product-attributes { display: flex !important; flex-direction: column !important; }
      #real-product-purchase-bar { position: fixed !important; left: 0 !important; right: 0 !important; bottom: 0 !important; z-index: 50 !important; }
      .soulmate-category-filters { display: flex; gap: 8px; overflow-x: auto; padding: 0 16px 8px; }
      .soulmate-category-filters a { flex: 0 0 auto; padding: 7px 12px; border: 1px solid #dce7e1; border-radius: 999px; color: #2d6857; text-decoration: none; font-size: 12px; }
      .soulmate-category-filters a[aria-current="page"] { background: #a8e5cf; }
      .soulmate-category-filters span { color: #71717a; font-size: 12px; }
      .soulmate-account-nav { display: flex !important; gap: 8px; overflow-x: auto; padding: 0 16px 8px; }
      .soulmate-account-nav a { flex: 0 0 auto; padding: 7px 12px; border: 1px solid #dce7e1; border-radius: 999px; color: #2d6857; text-decoration: none; font-size: 12px; }
      .soulmate-home-feature-grid { display: flex; flex-direction: column; gap: 16px; }
      .soulmate-guidance-panel { margin: 0 16px; padding: 18px; border: 1px solid #d8eee4; border-radius: 18px; background: #e8f8f2; }
      .soulmate-guidance-panel h2 { margin: 0; color: #1b4d3e; font-size: 19px; }
      .soulmate-guidance-panel p { margin: 8px 0 14px; color: #53615d; font-size: 13px; line-height: 1.7; }
      .soulmate-guidance-panel textarea { width: 100%; min-height: 82px; padding: 10px 12px; border: 1px solid #dce7e1; border-radius: 12px; background: white; }
      .soulmate-guidance-panel button { width: 100%; min-height: 42px; margin-top: 10px; border: 0; border-radius: 999px; background: #ca5a9a; color: white; font-weight: 700; opacity: .58; }
      .soulmate-guidance-panel small { display: block; margin-top: 10px; color: #53615d; line-height: 1.6; }
    }
  `;
  doc.head.appendChild(style);
}

function mountHomeGuidancePanel(doc: Document) {
  const hero = doc.querySelector<HTMLElement>('[data-cms-slot="hero_banner_1"]');
  if (!hero) return;
  const existing = doc.getElementById('soulmate-guidance-panel');
  if (existing) return mountGuidancePanel(existing);

  const featureGrid = doc.createElement('div');
  featureGrid.className = 'soulmate-home-feature-grid';
  const panel = doc.createElement('section');
  panel.id = 'soulmate-guidance-panel';
  panel.className = 'soulmate-guidance-panel';
  panel.setAttribute('aria-labelledby', 'soulmate-guidance-heading');
  hero.parentElement?.insertBefore(featureGrid, hero);
  featureGrid.append(hero, panel);
  return mountGuidancePanel(panel);
}

function mountAccountNavigation(doc: Document, pathname: string) {
  if (!pathname.startsWith('/account') || doc.querySelector('.soulmate-account-nav')) return;
  const main = doc.querySelector('main');
  if (!main) return;
  const nav = doc.createElement('nav');
  nav.className = 'soulmate-account-nav';
  nav.setAttribute('aria-label', 'เมนูบัญชี');
  const links = [
    ['ภาพรวมบัญชี', '/account'],
    ['โปรไฟล์', '/account/profile'],
    ['คำสั่งซื้อ', '/account/orders'],
    ['ที่อยู่', '/account/addresses'],
    ['รายการที่ชื่นชอบ', '/account/wishlist'],
  ];
  nav.innerHTML = links.map(([label, href]) =>
    `<a href="${href}"${pathname === href ? ' aria-current="page"' : ''}>${label}</a>`
  ).join('');
  main.parentElement?.insertBefore(nav, main);
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showAdminToast(
  doc: Document,
  message: string,
  type: 'success' | 'error' | 'info' = 'success'
) {
  const existing = doc.getElementById('soulmate-admin-toast');
  if (existing) existing.remove();

  const toast = doc.createElement('div');
  toast.id = 'soulmate-admin-toast';
  const bgColor =
    type === 'success'
      ? 'bg-emerald-600 text-white'
      : type === 'error'
      ? 'bg-rose-600 text-white'
      : 'bg-zinc-800 text-white';
  const icon =
    type === 'success'
      ? 'check_circle'
      : type === 'error'
      ? 'error'
      : 'info';

  toast.className = `fixed bottom-6 right-6 z-[10000] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg ${bgColor} text-sm font-medium transition-all duration-200 select-none`;
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[20px] shrink-0 pointer-events-none">${icon}</span>
    <span class="pointer-events-none">${escapeHtml(message)}</span>
  `;

  doc.body.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }
  }, 3500);
}

function showDeleteDraftDialog(
  doc: Document,
  productName: string,
  onConfirm: () => Promise<void>
) {
  const existing = doc.getElementById('soulmate-delete-confirm-modal');
  if (existing) existing.remove();

  const modal = doc.createElement('div');
  modal.id = 'soulmate-delete-confirm-modal';
  modal.className =
    'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4';
  modal.innerHTML = `
    <div class="bg-surface-container-lowest text-on-surface rounded-2xl shadow-2xl border border-surface-container-high max-w-sm w-full p-6 space-y-4" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
      <div class="flex items-start gap-3.5">
        <div class="w-10 h-10 rounded-full bg-error-container/80 text-error flex items-center justify-center shrink-0">
          <span class="material-symbols-outlined text-[24px]">delete_forever</span>
        </div>
        <div class="flex-1 min-w-0">
          <h3 id="delete-dialog-title" class="text-base font-bold text-on-surface">ลบสินค้าแบบร่าง?</h3>
          <p class="text-xs text-secondary mt-0.5 truncate">${escapeHtml(productName || 'สินค้าแบบร่าง')}</p>
        </div>
      </div>
      <p class="text-sm text-secondary leading-relaxed">
        สินค้านี้จะถูกลบออกจากระบบอย่างถาวร และไม่สามารถกู้คืนได้
      </p>
      <div class="flex items-center justify-end gap-2.5 pt-2">
        <button type="button" id="btn-cancel-modal-delete" class="px-4 py-2 text-sm font-medium rounded-xl text-secondary hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer">
          ยกเลิก
        </button>
        <button type="button" id="btn-confirm-modal-delete" class="px-4 py-2 text-sm font-semibold rounded-xl bg-error text-on-error hover:opacity-95 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95">
          <span class="material-symbols-outlined text-[16px] pointer-events-none">delete</span>
          <span id="btn-confirm-delete-text" class="pointer-events-none">ลบสินค้า</span>
        </button>
      </div>
    </div>
  `;

  doc.body.appendChild(modal);

  const cancelBtn = modal.querySelector('#btn-cancel-modal-delete') as HTMLButtonElement | null;
  const confirmBtn = modal.querySelector('#btn-confirm-modal-delete') as HTMLButtonElement | null;
  const confirmText = modal.querySelector('#btn-confirm-delete-text');

  const closeModal = () => {
    modal.remove();
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  cancelBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });

  confirmBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    if (confirmText) confirmText.textContent = 'กำลังลบ...';
    try {
      await onConfirm();
      closeModal();
    } catch {
      confirmBtn.disabled = false;
      if (confirmText) confirmText.textContent = 'ลบสินค้า';
    }
  });
}

function ensureHeaderSearchIcon(doc: Document, navigate: (path: string) => void) {
  try {
    // Clean up any remaining injected gray header styles
    const oldStyle = doc.getElementById('soulmate-gray-header-style');
    if (oldStyle) oldStyle.remove();

    const headers = doc.querySelectorAll('header');
    headers.forEach((header) => {
      // Don't inject into admin search headers that already have a large search input
      if (header.querySelector('input[type="text"], input[type="search"]')) return;
      if (header.querySelector('#header-search-icon-btn, [data-role="header-search-btn"]')) return;

      // Find the profile/account element in this header
      const profileEl = header.querySelector<HTMLElement>(
        '[data-path="account"], a[href*="account"], a[href*="profile"], [aria-label*="Account"], [aria-label*="บัญชี"], [aria-label*="โปรไฟล์"]'
      ) || Array.from(header.querySelectorAll<HTMLElement>('.material-symbols-outlined')).find(
        (el) => el.textContent?.trim() === 'person' || el.textContent?.trim() === 'manage_accounts'
      )?.closest<HTMLElement>('a, button, div.rounded-full, .w-8, .w-9, .w-10, .w-11');

      if (profileEl && profileEl.parentElement) {
        const searchBtn = doc.createElement('a');
        searchBtn.id = 'header-search-icon-btn';
        searchBtn.setAttribute('data-role', 'header-search-btn');
        searchBtn.setAttribute('aria-label', 'ค้นหาสินค้า');
        searchBtn.setAttribute('href', '/products');
        searchBtn.setAttribute('data-path', 'products');
        searchBtn.className = profileEl.className || 'w-9 h-9 flex items-center justify-center rounded-full text-on-surface hover:text-[#CA5A9A] transition-colors cursor-pointer';
        if (searchBtn.classList.contains('bg-primary')) {
          searchBtn.className = 'w-9 h-9 flex items-center justify-center rounded-full text-on-surface hover:text-primary transition-colors cursor-pointer';
        }
        searchBtn.innerHTML = '<span class="material-symbols-outlined text-[22px]">search</span>';

        searchBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const searchInput = doc.getElementById('home-search-input') || doc.getElementById('product-search-input');
          if (searchInput) {
            searchInput.focus();
            searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            navigate('/products');
          }
        });

        profileEl.parentElement.insertBefore(searchBtn, profileEl);
      }
    });

    // Also attach click handler to any pre-existing search buttons in the template
    const existingSearchBtns = doc.querySelectorAll<HTMLElement>('#header-search-icon-btn, [data-role="header-search-btn"]');
    existingSearchBtns.forEach((btn) => {
      if ((btn as any)._searchBound) return;
      (btn as any)._searchBound = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const searchInput = doc.getElementById('home-search-input') || doc.getElementById('product-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          navigate('/products');
        }
      });
    });
  } catch (err) {
    console.error('Error ensuring header search icon:', err);
  }
}

function updateAllCartBadges(doc: Document, itemCount: number) {
  const countStr = `${itemCount}`;
  const countLabel = `${itemCount} ชิ้น`;

  const headerBadges = doc.querySelectorAll('.header-cart-badge, #header-cart-badge');
  headerBadges.forEach((el) => {
    el.textContent = countStr;
  });

  const headerCountBadge = doc.getElementById('header-count-badge');
  if (headerCountBadge) {
    headerCountBadge.textContent = countLabel;
  }

  const navBadges = doc.querySelectorAll('[data-path="cart"] span:last-child, #nav-cart-badge');
  navBadges.forEach((el) => {
    el.textContent = countStr;
  });
}


/**
 * Normalize imported Stitch Admin sidebar links so Admin navigation never
 * falls through to customer storefront routes such as /products.
 */
function normalizeAdminSidebarRoutes(doc: Document) {
  const links = doc.querySelectorAll<HTMLElement>(
    'aside a, aside button, nav[data-admin-nav] a, nav[data-admin-nav] button, .admin-sidebar a, .admin-sidebar button'
  );

  const resolveDestination = (el: HTMLElement): string | null => {
    const path = (el.getAttribute('data-path') || '').trim().toLowerCase();
    const route = (el.getAttribute('data-route') || '').trim().toLowerCase();
    const href = (el.getAttribute('href') || '').trim().toLowerCase().replace(/^#/, '');
    const text = (el.textContent || '').trim().toLowerCase();

    const values = new Set([path, route, href]);

    if (
      values.has('dashboard') ||
      values.has('admin-dashboard') ||
      values.has('/dashboard') ||
      values.has('/admin/dashboard') ||
      text.includes('dashboard') ||
      text.includes('แดชบอร์ด')
    ) {
      return '/admin/dashboard';
    }

    if (
      values.has('products') ||
      values.has('shop') ||
      values.has('admin-products') ||
      values.has('/products') ||
      values.has('/admin/products') ||
      text.includes('products') ||
      text.includes('สินค้า')
    ) {
      return '/admin/products';
    }

    if (
      values.has('orders') ||
      values.has('admin-orders') ||
      values.has('/orders') ||
      values.has('/admin/orders') ||
      text.includes('orders') ||
      text.includes('คำสั่งซื้อ')
    ) {
      return '/admin/orders';
    }

    if (
      values.has('customers') ||
      values.has('admin-customers') ||
      values.has('/customers') ||
      values.has('/admin/customers') ||
      text.includes('customers') ||
      text.includes('ลูกค้า')
    ) {
      return '/admin/customers';
    }

    if (
      values.has('banners') ||
      values.has('admin-banners') ||
      values.has('/banners') ||
      values.has('/admin/banners') ||
      text.includes('banners') ||
      text.includes('แบนเนอร์')
    ) {
      return '/admin/banners';
    }

    if (
      values.has('coupons') ||
      values.has('admin-coupons') ||
      values.has('/coupons') ||
      values.has('/admin/coupons') ||
      text.includes('coupons') ||
      text.includes('คูปอง')
    ) {
      return '/admin/coupons';
    }

    if (
      values.has('settings') ||
      values.has('admin-settings') ||
      values.has('/settings') ||
      values.has('/admin/settings') ||
      text.includes('settings') ||
      text.includes('ตั้งค่า')
    ) {
      return '/admin/settings';
    }

    if (
      values.has('logout') ||
      values.has('admin-login') ||
      values.has('/admin/login') ||
      text.includes('ออกจากระบบ') ||
      text.includes('log out') ||
      text.includes('logout')
    ) {
      return '/admin/login';
    }

    return null;
  };

  links.forEach((el) => {
    const destination = resolveDestination(el);
    if (!destination) return;

    // data-route is the source of truth for iframe click interception.
    el.setAttribute('data-route', destination);

    // Keep native anchor behavior correct too.
    if (el.tagName.toLowerCase() === 'a') {
      el.setAttribute('href', destination);
    }
  });
}

const dashboardHtmlPath =
  '/stitch_soulmate_e_commerce/soulmate_responsive_admin_dashboard_with_date_filtering/code.html';
let dashboardShellRequest: Promise<string> | null = null;

async function installDashboardAdminShell(doc: Document, pathname: string) {
  if (pathname === '/admin/dashboard') return;

  dashboardShellRequest ??= fetch(dashboardHtmlPath).then((response) => {
    if (!response.ok) throw new Error(`Dashboard shell failed to load: ${response.status}`);
    return response.text();
  }).catch((error) => {
    dashboardShellRequest = null;
    throw error;
  });

  const source = new DOMParser().parseFromString(await dashboardShellRequest, 'text/html');
  const sourceAside = source.body.querySelector('aside');
  const sourceHeader = source.body.querySelector('header');
  const targetAside = doc.body.querySelector('aside');
  const targetHeader = doc.body.querySelector('header');
  if (!sourceAside || !sourceHeader || !targetAside || !targetHeader) return;

  const oldDrawer = doc.body.querySelector<HTMLInputElement>('input[type="checkbox"][id*="drawer"]');
  if (oldDrawer) {
    doc.body.querySelectorAll(`label[for="${oldDrawer.id}"]`).forEach((label) => label.remove());
    oldDrawer.remove();
  }

  const drawer = source.body.querySelector<HTMLInputElement>('#nav-drawer-toggle');
  const backdrop = source.body.querySelector<HTMLLabelElement>('label[for="nav-drawer-toggle"]');
  if (drawer && backdrop) {
    doc.body.insertBefore(doc.importNode(backdrop, true), targetAside);
    doc.body.insertBefore(doc.importNode(drawer, true), doc.body.firstChild);
  }

  const aside = doc.importNode(sourceAside, true);
  const header = doc.importNode(sourceHeader, true);
  const logoLink = aside.querySelector('img[alt="SOULMATE"]')?.closest<HTMLAnchorElement>('a');
  logoLink?.setAttribute('href', '/admin/dashboard');
  logoLink?.setAttribute('data-path', 'admin-dashboard');
  logoLink?.setAttribute('data-route', '/admin/dashboard');
  const title = header.querySelector('h1');
  const section = pathname.split('/')[2] || 'dashboard';
  const titles: Record<string, string> = {
    dashboard: 'Dashboard', products: 'Products', orders: 'Orders',
    customers: 'Customers', banners: 'Banners', coupons: 'Coupons', settings: 'Settings',
  };
  if (title) title.textContent = titles[section] || 'Dashboard';
  header.querySelector('#topbar-active-period-badge')?.remove();
  header.querySelector('#refresh-dashboard-btn')?.remove();

  const content = targetAside.nextElementSibling;
  content?.classList.add('soulmate-admin-layout');
  const style = doc.createElement('style');
  style.textContent = `
    @media (min-width: 1024px) {
      .soulmate-admin-layout { padding-left: 260px !important; }
    }
    @media (max-width: 1023px) {
      .soulmate-admin-layout { padding-left: 0 !important; }
    }
  `;
  doc.head.appendChild(style);
  targetAside.replaceWith(aside);
  targetHeader.replaceWith(header);
}

function normalizeAdminShellSizing(doc: Document) {
  const sidebar = doc.body.querySelector('aside');
  const header = doc.body.querySelector('header');
  if (!sidebar || !header) return;

  sidebar.id = 'soulmate-admin-sidebar';
  header.id = 'soulmate-admin-header';
  if (doc.getElementById('soulmate-admin-shell-sizing')) return;

  const style = doc.createElement('style');
  style.id = 'soulmate-admin-shell-sizing';
  style.textContent = `
    #soulmate-admin-sidebar { width: 260px !important; font-size: 14px !important; line-height: 20px !important; }
    #soulmate-admin-sidebar > div:first-child > div:first-child { height: 64px !important; padding: 0 24px !important; }
    #soulmate-admin-sidebar > div:first-child > div:nth-child(2) { height: 40px !important; padding: 8px 24px !important; }
    #soulmate-admin-sidebar nav { gap: 4px !important; padding: 0 16px !important; }
    #soulmate-admin-sidebar nav a { box-sizing: border-box !important; display: flex !important; align-items: center !important; gap: 8px !important; width: 100% !important; height: 40px !important; padding: 8px 16px !important; font-size: 14px !important; line-height: 20px !important; }
    #soulmate-admin-sidebar nav a .material-symbols-outlined { font-size: 20px !important; line-height: 20px !important; }
    #soulmate-admin-sidebar > div:last-child { padding: 16px !important; gap: 16px !important; }
    #soulmate-admin-sidebar > div:last-child > div:first-child { padding: 16px !important; gap: 4px !important; }
    #soulmate-admin-header { height: 64px !important; padding-left: 24px !important; padding-right: 24px !important; }
    #soulmate-admin-header h1 { font-size: 18px !important; line-height: 24px !important; }
    @media (max-width: 767px) {
      #soulmate-admin-header { padding-left: 16px !important; padding-right: 16px !important; }
    }
  `;
  doc.head.appendChild(style);
}

function configureAdminTopbar(doc: Document) {
  const header = doc.body.querySelector('header');
  if (!header) return;

  header.querySelector('#topbar-active-period-badge')?.remove();
  header.querySelector('#refresh-dashboard-btn')?.remove();
  header.querySelectorAll('div').forEach((element) => {
    if (element.textContent?.trim() === 'Cloud Sync Active') element.remove();
  });
  header.querySelectorAll('button, a').forEach((element) => {
    const icon = element.querySelector('.material-symbols-outlined')?.textContent?.trim();
    if (element.id === 'header-search-icon-btn' || icon === 'search') element.remove();
  });

  if (header.querySelector('#admin-storefront-link')) return;
  const actions = header.lastElementChild;
  if (!actions) return;

  const link = doc.createElement('a');
  link.id = 'admin-storefront-link';
  link.href = '/';
  link.setAttribute('aria-label', 'กลับไปหน้าร้าน');
  link.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">storefront</span><span>กลับไปหน้าร้าน</span>';
  actions.insertBefore(link, actions.firstChild);

  const style = doc.createElement('style');
  style.textContent = `
    #admin-storefront-link { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px; padding: 8px 14px; border: 1px solid #a8e5cf; border-radius: 999px; background: #e8f8f2; color: #1d5a46; font-size: 13px; font-weight: 700; white-space: nowrap; text-decoration: none; cursor: pointer; transition: background-color 150ms ease; }
    #admin-storefront-link:hover { background: #a8e5cf; }
    #admin-storefront-link:focus-visible { outline: 2px solid #2d6857; outline-offset: 2px; }
    #admin-storefront-link .material-symbols-outlined { font-size: 18px; }
  `;
  doc.head.appendChild(style);
}

function syncStorefrontAdminMobileTab(doc: Document, showAdminTab: boolean) {
  const existing = doc.getElementById('storefront-admin-nav-link');
  if (!showAdminTab) {
    existing?.remove();
    return;
  }

  // The imported storefront screens own their mobile navbar inside the iframe.
  // Add the admin destination there so it follows the same fixed navigation.
  const nav = doc.querySelector<HTMLElement>('nav[class~="fixed"][class~="bottom-0"]');
  const items = nav?.querySelector<HTMLElement>(':scope > div');
  if (!items || existing) return;

  const link = doc.createElement('a');
  link.id = 'storefront-admin-nav-link';
  link.href = '/admin/dashboard';
  link.dataset.route = '/admin/dashboard';
  link.setAttribute('aria-label', 'ไปหลังบ้าน');
  link.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">space_dashboard</span><span>หลังบ้าน</span>';
  items.appendChild(link);

  if (doc.getElementById('storefront-admin-nav-style')) return;
  const style = doc.createElement('style');
  style.id = 'storefront-admin-nav-style';
  style.textContent = `
    #storefront-admin-nav-link { box-sizing: border-box; display: flex; flex: 1 1 0; min-width: 0; height: 48px; padding: 2px 4px; flex-direction: column; align-items: center; justify-content: center; gap: 1px; border-radius: 12px; background: #e8f8f2; color: #1d5a46; font-size: 10px; line-height: 14px; font-weight: 700; text-decoration: none; white-space: nowrap; }
    #storefront-admin-nav-link .material-symbols-outlined { font-size: 22px; line-height: 24px; }
    #storefront-admin-nav-link:active { background: #c9eedf; }
    #storefront-admin-nav-link:focus-visible { outline: 2px solid #2d6857; outline-offset: -2px; }
    @media (min-width: 769px) { #storefront-admin-nav-link { display: none !important; } }
  `;
  doc.head.appendChild(style);
}

/**
 * When an imported Admin element still contains a customer route, force it
 * to the corresponding Admin route.
 */
function resolveAdminNavigationTarget(rawTarget: string): string {
  const cleaned = rawTarget.trim().toLowerCase().replace(/^#/, '');

  const adminRouteMap: Record<string, string> = {
    'dashboard': '/admin/dashboard',
    '/dashboard': '/admin/dashboard',
    'admin-dashboard': '/admin/dashboard',
    '/admin/dashboard': '/admin/dashboard',

    'products': '/admin/products',
    'shop': '/admin/products',
    '/products': '/admin/products',
    'admin-products': '/admin/products',
    '/admin/products': '/admin/products',

    'orders': '/admin/orders',
    '/orders': '/admin/orders',
    'admin-orders': '/admin/orders',
    '/admin/orders': '/admin/orders',

    'customers': '/admin/customers',
    '/customers': '/admin/customers',
    'admin-customers': '/admin/customers',
    '/admin/customers': '/admin/customers',

    'banners': '/admin/banners',
    '/banners': '/admin/banners',
    'admin-banners': '/admin/banners',
    '/admin/banners': '/admin/banners',

    'coupons': '/admin/coupons',
    '/coupons': '/admin/coupons',
    'admin-coupons': '/admin/coupons',
    '/admin/coupons': '/admin/coupons',

    'settings': '/admin/settings',
    '/settings': '/admin/settings',
    'admin-settings': '/admin/settings',
    '/admin/settings': '/admin/settings',

    'logout': '/admin/login',
    'admin-login': '/admin/login',
    '/admin/login': '/admin/login',
  };

  return adminRouteMap[cleaned] || rawTarget;
}

/**
 * Remove Stitch/dev "โหมดทดสอบ" controls from real storefront pages while
 * preserving the real state containers (#state-grid, #state-empty, etc.)
 * used by production data rendering.
 */
function removeStorefrontTestModeUI(doc: Document) {
  // Explicit known dev/test wrappers.
  doc
    .querySelectorAll<HTMLElement>(
      '[data-test-mode], [data-dev-toolbar], #test-mode-toolbar, #dev-state-toolbar, .test-mode-toolbar, .dev-state-toolbar'
    )
    .forEach((el) => el.remove());

  const markers = ['โหมดทดสอบ', 'โหมดแสดงผล:'];

  const stateLabels = [
    'ว่าง (Default)',
    'สินค้า',
    'สินค้า (Grid)',
    'สินค้า (List)',
    'ยังไม่มีสินค้า',
    'กำลังโหลด',
    'ข้อผิดพลาด',
    'ปกติ',
  ];

  // Imported Stitch HTML is inconsistent. Find the smallest element that
  // contains a marker, then remove only the compact toolbar ancestor that
  // contains multiple state buttons. Never remove the actual product/cart
  // content state containers.
  for (const markerText of markers) {
    for (let pass = 0; pass < 6; pass += 1) {
      const candidates = Array.from(
        doc.querySelectorAll<HTMLElement>('body *')
      )
        .filter((el) =>
          (el.textContent || '')
            .replace(/\s+/g, ' ')
            .trim()
            .includes(markerText)
        )
        .sort(
          (a, b) =>
            (a.textContent || '').length -
            (b.textContent || '').length
        );

      const marker = candidates[0];
      if (!marker) break;

      let current: HTMLElement | null = marker;
      let toolbar: HTMLElement | null = null;

      for (let depth = 0; depth < 7 && current; depth += 1) {
        const currentText = (current.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();

        const stateMatches = stateLabels.filter((label) =>
          currentText.includes(label)
        ).length;

        // Compact prototype toolbar only. Avoid deleting the whole page.
        if (
          currentText.includes(markerText) &&
          stateMatches >= 2 &&
          currentText.length < 1800
        ) {
          toolbar = current;
          break;
        }

        current = current.parentElement;
      }

      (toolbar || marker).remove();
    }
  }
}

function isRenderableProductImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const url = value.trim();
  if (!url || url.startsWith('[object')) return false;

  return (
    url.startsWith('https://') ||
    url.startsWith('http://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:image/')
  );
}

/**
 * Resolve the image that should actually be rendered for a product.
 * Prefer the product's uploaded Storage-backed image list. Only fall back to
 * primaryImageURL when no image in the list can be resolved.
 *
 * IMPORTANT: Never use the promotional homepage banner as a product fallback.
 */

type StorefrontPricing = {
  regularPrice: number;
  specialPrice: number | null;
  sellingPrice: number;
  hasSpecialPrice: boolean;
};

function resolveStorefrontPricing(
  source: any,
  fallbackRegularPrice: number = 0,
  fallbackSpecialPrice: number | null = null
): StorefrontPricing {
  const toNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  // SOULMATE product schema currently stores:
  //   price          = regular price
  //   compareAtPrice = special / sale price
  const regularCandidate =
    toNumber(source?.price) ??
    toNumber(source?.regularPrice) ??
    toNumber(fallbackRegularPrice) ??
    0;

  const specialCandidate =
    toNumber(source?.compareAtPrice) ??
    toNumber(source?.salePrice) ??
    toNumber(fallbackSpecialPrice);

  const regularPrice = Math.max(0, regularCandidate);

  const hasSpecialPrice =
    specialCandidate !== null &&
    specialCandidate > 0 &&
    regularPrice > 0 &&
    specialCandidate < regularPrice;

  const specialPrice = hasSpecialPrice ? specialCandidate : null;

  return {
    regularPrice,
    specialPrice,
    sellingPrice: specialPrice ?? regularPrice,
    hasSpecialPrice,
  };
}

function renderStorefrontPrice(
  pricing: StorefrontPricing,
  options: {
    regularClass?: string;
    specialClass?: string;
    wrapperClass?: string;
  } = {}
): string {
  const {
    regularClass = 'text-xs text-on-surface-variant line-through',
    specialClass = 'text-base font-bold text-tertiary',
    wrapperClass = 'flex items-baseline gap-2 flex-wrap',
  } = options;

  if (pricing.hasSpecialPrice && pricing.specialPrice !== null) {
    return `
      <div class="${wrapperClass}">
        <span class="${regularClass}">
          ฿${pricing.regularPrice.toLocaleString('th-TH')}
        </span>
        <span class="${specialClass}">
          ฿${pricing.specialPrice.toLocaleString('th-TH')}
        </span>
      </div>
    `;
  }

  return `
    <div class="${wrapperClass}">
      <span class="${specialClass}">
        ฿${pricing.regularPrice.toLocaleString('th-TH')}
      </span>
    </div>
  `;
}

async function resolveProductDisplayImage(product: Product): Promise<string | null> {
  try {
    const sourceImages = Array.isArray(product.images) ? product.images : [];

    if (sourceImages.length > 0) {
      const { images: resolved } = await resolveAllProductImages(sourceImages, product.id);

      const primary = resolved.find(
        (img) => img?.isPrimary && isRenderableProductImageUrl(img?.url)
      );
      if (primary?.url) return primary.url;

      const firstUsable = resolved.find((img) =>
        isRenderableProductImageUrl(img?.url)
      );
      if (firstUsable?.url) return firstUsable.url;
    }
  } catch (err) {
    console.warn(
      '[SOULMATE Product Image] Could not resolve uploaded product images:',
      product.id,
      err
    );
  }

  if (isRenderableProductImageUrl(product.primaryImageURL)) {
    return product.primaryImageURL;
  }

  return null;
}

function renderMissingProductImage(label = 'ยังไม่มีรูปสินค้า') {
  return `
    <div class="product-image-fallback w-full h-full flex flex-col items-center justify-center bg-surface-container-low text-on-surface-variant">
      <span class="material-symbols-outlined text-[24px]">image_not_supported</span>
      <span class="text-[10px] mt-1 text-center px-1">${escapeHtml(label)}</span>
    </div>
  `;
}


type PersistedCartItem = StorefrontCartItem;

type CartContextType = {
  items: StorefrontCartItem[];
  itemCount: number;
  subtotal: number;
  addToCart: (input: any) => Promise<void>;
  updateCartQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeCartItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
};

function loadPersistedCart(): PersistedCartItem[] {
  return getCartSnapshot().items;
}

function savePersistedCart(
  items: PersistedCartItem[]
): PersistedCartItem[] {
  return replaceCartItems(items).items;
}

function addPersistedCartItem(input: {
  productId: string;
  productName: string;
  variantId?: string | null;
  variantName?: string | null;
  unitPrice: number;
  quantity?: number;
  productImage?: string | null;
}): PersistedCartItem[] {
  return addCartItem(input).items;
}

function updatePersistedCartQuantity(
  cartId: string,
  quantity: number
): PersistedCartItem[] {
  return updateCartItemQuantity(cartId, quantity).items;
}

function removePersistedCartItem(
  cartId: string
): PersistedCartItem[] {
  return removeCartItemFromService(cartId).items;
}

function getServiceCartAdapter(): CartContextType {
  const snapshot = getCartSnapshot();

  return {
    items: snapshot.items,
    itemCount: snapshot.itemCount,
    subtotal: snapshot.subtotal,

    // Storefront writes are performed directly through cartService.
    // These no-op async functions preserve the existing renderer API
    // without requiring CartProvider.
    addToCart: async () => undefined,
    updateCartQuantity: async () => undefined,
    removeCartItem: async () => undefined,
    clearCart: async () => undefined,
  };
}

function createEffectiveCart(
  _cart?: CartContextType
): CartContextType {
  return getServiceCartAdapter();
}

function removeLegacyProductDetailPurchaseControls(doc: Document) {
  const buttons = Array.from(
    doc.querySelectorAll<HTMLButtonElement>('button')
  ).filter((button) =>
    (button.textContent || '').replace(/\s+/g, ' ').trim().includes('เพิ่มลงตะกร้า')
  );

  for (const button of buttons) {
    if (button.id === 'real-add-to-cart') continue;

    const legacyBar =
      button.closest<HTMLElement>(
        '[id*="sticky"], [class*="fixed"], [class*="sticky"], footer'
      );

    if (legacyBar) {
      legacyBar.remove();
    } else {
      button.remove();
    }
  }

  // Remove obvious preview/mock total labels that belonged to Stitch's
  // prototype purchase footer.
  Array.from(doc.querySelectorAll<HTMLElement>('body *')).forEach((el) => {
    const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (
      txt.includes('รายการรวม (ตัวอย่าง)') ||
      txt.includes('P-PREVIEW')
    ) {
      const legacy =
        el.closest<HTMLElement>(
          '[id*="sticky"], [class*="fixed"], [class*="sticky"], footer'
        ) || el;
      legacy.remove();
    }
  });
}

function renderCartScreen(doc: Document, win: any, cart: CartContextType) {
  cart = createEffectiveCart(cart);

  // Cart page always reflects the persistent cart source, never the imported
  // Stitch preview state.
  updateAllCartBadges(doc, cart.itemCount);

  const emptyState = doc.getElementById('state-empty');
  const filledState = doc.getElementById('state-filled');
  const cartItemList = doc.getElementById('cart-item-list');
  const stickyBar = doc.getElementById('sticky-purchase-bar');
  const checkoutBtn = doc.getElementById('btn-checkout') as HTMLButtonElement | null;
  const headerBadge = doc.getElementById('header-count-badge');
  const navBadge = doc.getElementById('nav-cart-badge');
  const subtotalVal = doc.getElementById('summary-subtotal-val');
  const discountVal = doc.getElementById('summary-discount-val');
  const grandtotalVal = doc.getElementById('summary-grandtotal-val');
  const barSubtotalVal = doc.getElementById('bar-subtotal-val');
  const couponSection = doc.getElementById('coupon-section');

  if (couponSection) {
    couponSection.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="material-symbols-outlined text-primary" aria-hidden="true">confirmation_number</span>
        <div>
          <h2 class="font-semibold text-on-surface">คูปองส่วนลด</h2>
          <p class="mt-1 text-sm text-on-surface-variant">ระบบใช้คูปองยังไม่พร้อมใช้งาน ยอดรวมด้านล่างยังไม่หักส่วนลด</p>
        </div>
      </div>
    `;
  }

  Array.from(doc.querySelectorAll<HTMLElement>('body *')).forEach((element) => {
    if ((element.textContent || '').replace(/\s+/g, ' ').trim() === 'ผลิตภัณฑ์สารสกัดธรรมชาติ ปลอดภัย 100%') {
      element.closest<HTMLElement>('div')?.remove();
    }
  });

  // Some imported Stitch cart screens do not contain the expected summary IDs.
  // Fall back to the visible Thai row labels so the real cart totals are always
  // written into the summary UI without redesigning the page.
  const setSummaryValueByLabel = (label: string, value: string) => {
    const normalize = (value: string | null | undefined) =>
      (value || '').replace(/\s+/g, ' ').trim();

    const labelEl = Array.from(
      doc.querySelectorAll<HTMLElement>('body *')
    ).find(
      (el) =>
        el.children.length === 0 &&
        normalize(el.textContent) === label
    );

    if (!labelEl) return;

    let row: HTMLElement | null = labelEl.parentElement;

    for (let depth = 0; row && depth < 5; depth += 1) {
      const moneyLeaves = Array.from(
        row.querySelectorAll<HTMLElement>('*')
      ).filter((el) => {
        if (el === labelEl || el.children.length > 0) return false;
        const txt = normalize(el.textContent);
        return /^-?฿[\d,]+(?:\.\d+)?$/.test(txt);
      });

      if (moneyLeaves.length > 0) {
        moneyLeaves[moneyLeaves.length - 1].textContent = value;
        return;
      }

      row = row.parentElement;
    }
  };

  if (cart.items.length === 0) {
    if (emptyState) {
      emptyState.classList.remove('hidden');
      emptyState.classList.add('flex');
    }
    if (filledState) {
      filledState.classList.remove('flex');
      filledState.classList.add('hidden');
    }
    if (stickyBar) {
      stickyBar.classList.add('hidden');
    }
    if (checkoutBtn) {
      checkoutBtn.setAttribute('disabled', 'true');
    }
    if (headerBadge) headerBadge.textContent = '0 ชิ้น';
    if (navBadge) navBadge.textContent = '0';
    if (cartItemList) cartItemList.innerHTML = '';

    if (subtotalVal) subtotalVal.textContent = '฿0';
    if (discountVal) discountVal.textContent = '-฿0';
    if (grandtotalVal) grandtotalVal.textContent = '฿0';
    if (barSubtotalVal) barSubtotalVal.textContent = '฿0';

    setSummaryValueByLabel('ยอดรวมสินค้า', '฿0');
    setSummaryValueByLabel('ส่วนลดคูปอง', '-฿0');
    setSummaryValueByLabel('ค่าจัดส่ง', '฿0');
    setSummaryValueByLabel('ยอดรวมสุทธิ', '฿0');
  } else {
    if (emptyState) {
      emptyState.classList.remove('flex');
      emptyState.classList.add('hidden');
    }
    if (filledState) {
      filledState.classList.remove('hidden');
      filledState.classList.add('flex');
    }
    if (stickyBar) {
      stickyBar.classList.remove('hidden');
    }
    if (checkoutBtn) {
      checkoutBtn.removeAttribute('disabled');
    }
    if (headerBadge) headerBadge.textContent = `${cart.itemCount} ชิ้น`;
    if (navBadge) navBadge.textContent = `${cart.itemCount}`;

    if (cartItemList) {
      cartItemList.innerHTML = cart.items
        .map((item) => {
          const lineTotal = item.unitPrice * item.quantity;
          return `
          <article class="bg-surface-container-lowest rounded-xl p-space-md flex flex-col gap-space-sm shadow-xs" data-cart-item-id="${item.id}">
            <div class="flex gap-space-md">
              <div class="w-20 h-20 rounded-lg bg-surface-container-low flex items-center justify-center overflow-hidden shrink-0">
                ${
                  item.productImage
                    ? `<img class="w-full h-full object-cover" src="${item.productImage}" alt="${item.productName}">`
                    : `<span class="material-symbols-outlined text-primary text-[32px]">spa</span>`
                }
              </div>
              <div class="flex flex-col flex-1 min-w-0 justify-between">
                <div>
                  <span class="font-label-sm text-label-sm text-primary font-semibold">SOULMATE</span>
                  <h3 class="font-headline-sm text-headline-sm text-on-surface truncate">${item.productName}</h3>
                  ${item.variantName ? `<p class="font-label-sm text-label-sm text-on-surface-variant mt-0.5">${item.variantName}</p>` : ''}
                </div>
                <div class="flex items-center justify-between mt-space-xs">
                  <span class="font-headline-sm text-headline-sm text-on-surface font-bold">฿${item.unitPrice.toLocaleString('th-TH')}</span>
                  <span class="font-label-sm text-label-sm text-on-surface-variant">ยอดสุทธิ: ฿${lineTotal.toLocaleString('th-TH')}</span>
                </div>
              </div>
            </div>
            <!-- Stepper & Actions -->
            <div class="flex items-center justify-between pt-space-xs bg-surface-container-low/50 px-space-sm py-1.5 rounded-lg">
              <button class="flex items-center gap-1 text-on-surface-variant hover:text-error transition-colors text-label-sm font-label-sm" data-cart-action="remove" data-cart-id="${item.id}" type="button">
                <span class="material-symbols-outlined text-[18px]">delete</span>
                <span>ลบ</span>
              </button>
              <div class="flex items-center bg-surface-container-lowest rounded-full shadow-xs px-1">
                <button aria-label="ลดจำนวน" class="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary active:scale-90 transition-transform font-bold" data-cart-action="decrease" data-cart-id="${item.id}" type="button">
                  <span class="material-symbols-outlined text-[16px]">remove</span>
                </button>
                <span class="w-8 text-center font-label-md text-label-md font-semibold text-on-surface select-none">${item.quantity}</span>
                <button aria-label="เพิ่มจำนวน" class="w-8 h-8 flex items-center justify-center text-on-surface hover:text-primary active:scale-90 transition-transform font-bold" data-cart-action="increase" data-cart-id="${item.id}" type="button">
                  <span class="material-symbols-outlined text-[16px]">add</span>
                </button>
              </div>
            </div>
          </article>
        `;
        })
        .join('');
    }

    const formattedSubtotal = `฿${cart.subtotal.toLocaleString('th-TH')}`;
    if (subtotalVal) subtotalVal.textContent = formattedSubtotal;
    if (discountVal) discountVal.textContent = '-฿0';
    if (grandtotalVal) grandtotalVal.textContent = formattedSubtotal;
    if (barSubtotalVal) barSubtotalVal.textContent = formattedSubtotal;

    setSummaryValueByLabel('ยอดรวมสินค้า', formattedSubtotal);
    setSummaryValueByLabel('ส่วนลดคูปอง', '-฿0');
    setSummaryValueByLabel('ค่าจัดส่ง', '฿0');
    setSummaryValueByLabel('ยอดรวมสุทธิ', formattedSubtotal);
  }
}

function configureCheckoutPaymentMethods(doc: Document) {
  const normalize = (value: string | null | undefined) =>
    (value || '').replace(/\s+/g, ' ').trim();

  const findPaymentRow = (needle: string): HTMLElement | null => {
    const leaf = Array.from(
      doc.querySelectorAll<HTMLElement>('body *')
    ).find((el) => {
      if (el.children.length > 0) return false;
      return normalize(el.textContent).includes(needle);
    });

    if (!leaf) return null;

    let current: HTMLElement | null = leaf;

    for (let depth = 0; current && depth < 7; depth += 1) {
      const hasRadio = Boolean(
        current.querySelector('input[type="radio"]')
      );
      const text = normalize(current.textContent);

      if (
        hasRadio &&
        (text.includes('เก็บเงินปลายทาง') ||
          text.includes('PromptPay') ||
          text.includes('บัตรเครดิต'))
      ) {
        return current;
      }

      current = current.parentElement;
    }

    return leaf.parentElement;
  };

  // Remove Credit / Debit Card from the checkout UI completely.
  const cardRow =
    findPaymentRow('บัตรเครดิต / เดบิต') ||
    findPaymentRow('บัตรเครดิต') ||
    findPaymentRow('เดบิต');

  if (cardRow) {
    cardRow.remove();
  }

  const codRow = findPaymentRow('เก็บเงินปลายทาง');
  if (codRow) codRow.remove();

  // Payment selection is deferred; this checkout only saves an Order.
  const promptPayRadio =
    Array.from(
      doc.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    ).find((radio) => {
      const row = radio.closest<HTMLElement>('label, div');
      return radio.value === 'promptpay' || normalize(row?.textContent).includes('PromptPay');
    }) ||
    null;

  if (promptPayRadio) {
    const paymentSection = promptPayRadio.closest('section');
    promptPayRadio.closest('label')?.remove();
    if (paymentSection && !paymentSection.querySelector('#checkoutPaymentPendingNotice')) {
      const note = doc.createElement('p');
      note.id = 'checkoutPaymentPendingNotice';
      note.className = 'rounded-xl bg-amber-50 p-3 text-xs text-amber-900';
      note.textContent = 'ระบบทดสอบจะบันทึกออเดอร์เป็นรอชำระเงิน ยังไม่เปิดการจ่ายผ่าน PromptPay';
      paymentSection.appendChild(note);
    }
  }
}

function renderCheckoutSummary(doc: Document, win: any, cart: CartContextType) {
  cart = createEffectiveCart(cart);

  let container = doc.getElementById('checkoutCartItemsList');
  if (!container) {
    const summarySection =
      doc.getElementById('checkoutOrderSummarySection') ||
      doc.querySelector('section:has(#summarySubtotal)');
    if (summarySection) {
      const heading = summarySection.querySelector('h2');
      container = doc.createElement('div');
      container.id = 'checkoutCartItemsList';
      container.className = 'space-y-2 mb-3';
      if (heading && heading.nextSibling) {
        summarySection.insertBefore(container, heading.nextSibling);
      } else {
        summarySection.prepend(container);
      }
    }
  }

  const subtotalEl = doc.getElementById('summarySubtotal');
  const discountEl = doc.getElementById('summaryDiscount');
  const shippingEl = doc.getElementById('summaryShipping');
  const grandTotalEl = doc.getElementById('summaryGrandTotal');
  const stickyTotalEl = doc.getElementById('stickyTotal');
  const submitBtn = doc.getElementById('btnSubmitOrder') as HTMLButtonElement | null;
  const couponBox = doc.getElementById('appliedCouponBox');

  win.isCartEmpty = () => cart.items.length === 0;

  if (couponBox) {
    couponBox.classList.add('hidden');
  }

  if (cart.items.length === 0) {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
      submitBtn.title = 'ยังไม่มีสินค้าในตะกร้า';
    }

    if (container) {
      container.innerHTML = `
        <div class="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-center my-2" id="checkoutEmptyCartNotice">
          <span class="material-symbols-outlined text-amber-600 text-[28px] mb-1">shopping_cart_off</span>
          <p class="text-xs font-semibold text-amber-900 mb-1">ยังไม่มีสินค้าในตะกร้า</p>
          <p class="text-[11px] text-amber-700 mb-3">กรุณาเลือกซื้อสินค้าก่อนดำเนินการชำระเงิน</p>
          <div class="flex items-center justify-center gap-2">
            <a href="/products" class="px-3.5 py-1.5 rounded-full bg-white border border-amber-300 text-amber-900 text-xs font-medium hover:bg-amber-100 transition-all">เลือกซื้อสินค้า</a>
            <a href="/cart" class="px-3.5 py-1.5 rounded-full bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-all">ไปที่ตะกร้า</a>
          </div>
        </div>
      `;
    }

    if (subtotalEl) subtotalEl.textContent = '฿0';
    if (discountEl) discountEl.textContent = '-฿0';
    if (shippingEl) shippingEl.textContent = '฿0';
    if (grandTotalEl) grandTotalEl.textContent = '฿0';
    if (stickyTotalEl) stickyTotalEl.textContent = '฿0';
  } else {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      submitBtn.removeAttribute('title');
    }

    if (container) {
      container.innerHTML = `
        <div class="space-y-2 mb-3 divide-y divide-gray-100">
          ${cart.items
            .map((item) => {
              const lineTotal = item.unitPrice * item.quantity;
              return `
              <div class="pt-2 first:pt-0 flex items-center justify-between text-xs">
                <div class="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                  <div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    ${
                      item.productImage
                        ? `<img src="${item.productImage}" class="w-full h-full object-cover" alt="${item.productName}" />`
                        : `<span class="material-symbols-outlined text-gray-400 text-base">spa</span>`
                    }
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-medium text-gray-900 truncate">${item.productName}</p>
                    ${item.variantName ? `<p class="text-[10px] text-gray-500">${item.variantName}</p>` : ''}
                    <p class="text-[10px] text-gray-400">฿${item.unitPrice.toLocaleString('th-TH')} × ${item.quantity}</p>
                  </div>
                </div>
                <div class="text-right shrink-0">
                  <span class="font-semibold text-gray-900">฿${lineTotal.toLocaleString('th-TH')}</span>
                </div>
              </div>
            `;
            })
            .join('')}
        </div>
      `;
    }

    const formattedSubtotal = `฿${cart.subtotal.toLocaleString('th-TH')}`;
    const formattedTotal = `฿${(cart.subtotal + 30).toLocaleString('th-TH')}`;
    if (subtotalEl) subtotalEl.textContent = formattedSubtotal;
    if (discountEl) discountEl.textContent = '-฿0';
    if (shippingEl) shippingEl.textContent = '฿30';
    if (grandTotalEl) grandTotalEl.textContent = formattedTotal;
    if (stickyTotalEl) stickyTotalEl.textContent = formattedTotal;
  }
}

function attachCheckoutEditListeners(doc: Document) {
  const ids = [
    'custFirstName',
    'custLastName',
    'custPhone',
    'custEmail',
    'shipAddress',
    'shipSubdistrict',
    'shipDistrict',
    'shipProvince',
    'shipZip',
  ];

  ids.forEach((id) => {
    const el = doc.getElementById(id) as HTMLElement | null;
    if (el && !el.dataset.listenerAttached) {
      el.dataset.listenerAttached = 'true';
      const markEdited = () => {
        el.dataset.userEdited = 'true';
      };
      el.addEventListener('input', markEdited);
      el.addEventListener('change', markEdited);
    }
  });
}

function populateCheckoutFromDoc(
  doc: Document,
  profile: CustomerProfile | null,
  userEmail?: string | null,
  force = false
) {
  if (!profile) return;

  const custFirstName = doc.getElementById('custFirstName') as HTMLInputElement | null;
  const custLastName = doc.getElementById('custLastName') as HTMLInputElement | null;
  const custPhone = doc.getElementById('custPhone') as HTMLInputElement | null;
  const custEmail = doc.getElementById('custEmail') as HTMLInputElement | null;

  const shipAddress = (doc.getElementById('shipAddress') ||
    doc.getElementById('addressLine')) as HTMLTextAreaElement | HTMLInputElement | null;
  const shipSubdistrict = (doc.getElementById('shipSubdistrict') ||
    doc.getElementById('subDistrict')) as HTMLInputElement | null;
  const shipDistrict = (doc.getElementById('shipDistrict') ||
    doc.getElementById('district')) as HTMLInputElement | null;
  const shipProvince = (doc.getElementById('shipProvince') ||
    doc.getElementById('province')) as HTMLSelectElement | HTMLInputElement | null;
  const shipZip = (doc.getElementById('shipZip') ||
    doc.getElementById('postalCode')) as HTMLInputElement | null;

  const setField = (
    el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null,
    val: string | undefined | null
  ) => {
    if (!el) return;
    if (!force && el.dataset.userEdited === 'true') return;
    el.value = val || '';
  };

  const addr = profile.defaultShippingAddress;

  if (addr) {
    setField(custFirstName, addr.firstName || profile.firstName || '');
    setField(custLastName, addr.lastName || profile.lastName || '');
    setField(custPhone, addr.phone || profile.phone || '');
    setField(custEmail, profile.email || userEmail || '');

    setField(shipAddress, addr.addressLine1 || '');
    setField(shipSubdistrict, addr.subdistrict || '');
    setField(shipDistrict, addr.district || '');
    setField(shipProvince, addr.province || '');
    setField(shipZip, addr.postalCode || '');
  } else {
    setField(custFirstName, profile.firstName || '');
    setField(custLastName, profile.lastName || '');
    setField(custPhone, profile.phone || '');
    setField(custEmail, profile.email || userEmail || '');
  }
}

/**
 * Wires the product image upload control, hidden file input, drag-and-drop,
 * and preview gallery for /admin/products/new and /admin/products/:productId/edit.
 * Enforces single cover image selection without array reshuffling,
 * supports async resolution of legacy storagePath images, and real HTTPS download URLs.
 */
function wireProductImageUpload(
  doc: Document,
  win: any,
  productId: string,
  initialImages: (ProductImage | string)[],
  onImagesChange: (images: ProductImage[]) => void,
  screenType: 'add' | 'edit',
  onImageQueuedForDelete?: (image: ProductImage) => void
) {
  // Synchronous initial normalization
  const { images: canonicalInitial } = canonicalizeProductImages(initialImages, productId);
  let productImages: ProductImage[] = [...canonicalInitial];

  // 1. Add/reuse ONE hidden file input and ensure it's in doc.body so grid innerHTML doesn't destroy it
  let fileInput = doc.getElementById('productImageFileInput') as HTMLInputElement | null;
  if (!fileInput) {
    fileInput = doc.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'productImageFileInput';
    fileInput.accept = 'image/jpeg,image/png,image/webp';
    fileInput.multiple = true;
    fileInput.className = 'hidden';
    fileInput.style.display = 'none';
    doc.body.appendChild(fileInput);
  } else {
    if (fileInput.parentElement && fileInput.parentElement !== doc.body) {
      doc.body.appendChild(fileInput);
    }
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp';
    fileInput.multiple = true;
    fileInput.className = 'hidden';
    fileInput.style.display = 'none';
  }

  // 2. Render previews function
  const renderPreviews = () => {
    // Ensure exactly ONE isPrimary when images exist
    if (productImages.length > 0) {
      const primaryCount = productImages.filter((img) => img.isPrimary).length;
      if (primaryCount === 0) {
        productImages[0].isPrimary = true;
      } else if (primaryCount > 1) {
        let found = false;
        for (const img of productImages) {
          if (img.isPrimary) {
            if (!found) {
              found = true;
            } else {
              img.isPrimary = false;
            }
          }
        }
      }
    }

    onImagesChange(productImages);

    // Update count badge in both screens
    const countBadge = doc.getElementById('imageCountBadge');
    if (countBadge) {
      countBadge.textContent = `${productImages.length} / 8 รูป`;
    }

    if (screenType === 'add') {
      const grid = doc.getElementById('productImagePreviewsGrid');
      if (grid) {
        let html = '';
        productImages.forEach((img, idx) => {
          const isPrimary = !!img.isPrimary;
          html += `
            <div class="aspect-square rounded-2xl bg-surface-container-low flex flex-col items-center justify-center p-space-sm relative text-center group overflow-hidden ${isPrimary ? 'border-2 border-primary ring-2 ring-primary/20' : 'border border-surface-container-high/60'}" data-image-id="${img.id}">
              ${
                img.url
                  ? `<img src="${img.url}" alt="รูปสินค้า ${idx + 1}" class="w-full h-full object-cover rounded-xl" onerror="this.onerror=null; this.classList.add('hidden'); this.parentElement.querySelector('.broken-fallback')?.classList.remove('hidden');" />
                     <div class="broken-fallback hidden absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high/80 text-on-surface-variant p-2 text-center">
                       <span class="material-symbols-outlined text-[28px] text-secondary">broken_image</span>
                       <span class="text-[11px] text-secondary mt-1 font-medium">ไม่สามารถแสดงรูปภาพ</span>
                     </div>`
                  : `<div class="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high/80 text-on-surface-variant p-2 text-center">
                       <span class="material-symbols-outlined text-[28px] text-secondary">broken_image</span>
                       <span class="text-[11px] text-secondary mt-1 font-medium">ไม่พบที่อยู่รูปภาพ</span>
                     </div>`
              }
              <!-- Cover Badge or Set-as-cover Button (Top-Left) -->
              <div class="absolute top-2 left-2 z-10">
                ${
                  isPrimary
                    ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-on-primary font-label-sm text-[11px] font-semibold shadow-md">
                        <span class="material-symbols-outlined text-[14px]">star</span>
                        <span>รูปหน้าปก</span>
                       </span>`
                    : `<button type="button" data-set-cover-id="${img.id}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest/95 hover:bg-surface-container-lowest text-on-surface hover:text-primary font-label-sm text-[11px] font-medium shadow-sm transition-colors cursor-pointer" title="ตั้งเป็นรูปหน้าปก">
                        <span class="material-symbols-outlined text-[15px] text-amber-500">star_outline</span>
                        <span>ตั้งเป็นหน้าปก</span>
                       </button>`
                }
              </div>
              <!-- Remove Button (Top-Right) -->
              <div class="absolute top-2 right-2 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
                <button type="button" data-remove-image-id="${img.id}" class="w-7 h-7 rounded-full bg-surface-container-lowest/95 hover:bg-error hover:text-white text-on-surface-variant shadow-sm flex items-center justify-center transition-colors cursor-pointer" title="ลบรูปภาพ">
                  <span class="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
          `;
        });

        // Fill remaining preview slots up to 4
        const remainingCount = Math.max(0, 4 - productImages.length);
        for (let i = 0; i < remainingCount; i++) {
          const slotNum = productImages.length + i + 1;
          html += `
            <div class="aspect-square rounded-2xl bg-surface-container-low flex flex-col items-center justify-center p-space-sm relative text-center group border border-dashed border-outline-variant/40">
              <span class="material-symbols-outlined text-outline text-[28px]">image</span>
              <span class="font-label-sm text-label-sm text-outline mt-1">${slotNum === 1 ? 'ยังไม่มีรูปภาพ' : `สล็อตภาพที่ ${slotNum}`}</span>
            </div>
          `;
        }

        grid.innerHTML = html;
      }
    } else {
      // Edit screen
      const grid = doc.getElementById('productImageGrid');
      if (grid) {
        let html = '';
        if (productImages.length > 0) {
          productImages.forEach((img, idx) => {
            const isPrimary = !!img.isPrimary;
            html += `
              <div class="relative group rounded-2xl overflow-hidden aspect-square bg-surface-container-low transition-all shadow-xs ${isPrimary ? 'border-2 border-primary ring-2 ring-primary/20' : 'border border-surface-container-high/60'}" data-image-id="${img.id}">
                ${
                  img.url
                    ? `<img class="w-full h-full object-cover" src="${img.url}" alt="รูปสินค้า ${idx + 1}" onerror="this.onerror=null; this.classList.add('hidden'); this.parentElement.querySelector('.broken-fallback')?.classList.remove('hidden');" />
                       <div class="broken-fallback hidden absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high/80 text-on-surface-variant p-2 text-center">
                         <span class="material-symbols-outlined text-[28px] text-secondary">broken_image</span>
                         <span class="text-[11px] text-secondary mt-1 font-medium">ไม่สามารถแสดงรูปภาพ</span>
                       </div>`
                    : `<div class="absolute inset-0 flex flex-col items-center justify-center bg-surface-container-high/80 text-on-surface-variant p-2 text-center">
                         <span class="material-symbols-outlined text-[28px] text-secondary">broken_image</span>
                         <span class="text-[11px] text-secondary mt-1 font-medium">ไม่พบที่อยู่รูปภาพ</span>
                       </div>`
                }
                <!-- Cover Badge or Set-as-cover Button (Top-Left) -->
                <div class="absolute top-2 left-2 z-10">
                  ${
                    isPrimary
                      ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-on-primary font-label-sm text-[11px] font-semibold shadow-md ring-1 ring-white/20">
                          <span class="material-symbols-outlined text-[14px]">star</span>
                          <span>รูปหน้าปก</span>
                         </span>`
                      : `<button type="button" data-set-cover-id="${img.id}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest/95 hover:bg-surface-container-lowest text-on-surface hover:text-primary font-label-sm text-[11px] font-medium shadow-sm transition-colors cursor-pointer" title="ตั้งเป็นรูปหน้าปก">
                          <span class="material-symbols-outlined text-[15px] text-amber-500">star_outline</span>
                          <span>ตั้งเป็นหน้าปก</span>
                         </button>`
                  }
                </div>
                <!-- Remove Button (Top-Right) -->
                <div class="absolute top-2 right-2 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
                  <button type="button" data-remove-image-id="${img.id}" class="w-7 h-7 rounded-full bg-surface-container-lowest/95 hover:bg-error hover:text-white text-on-surface-variant shadow-sm flex items-center justify-center transition-colors cursor-pointer" title="ลบรูปภาพ">
                    <span class="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              </div>
            `;
          });
        }

        // Upload tile (if less than 8 images)
        if (productImages.length < 8) {
          html += `
            <!-- Add Image Upload Tile -->
            <div id="productImageDropzone" class="col-span-2 sm:col-span-2 flex flex-col items-center justify-center p-space-md rounded-2xl bg-surface-container-low/70 hover:bg-surface-container-low transition-colors cursor-pointer text-center group min-h-[140px] border-2 border-dashed border-outline-variant hover:border-primary">
              <div class="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary group-hover:scale-105 transition-transform shadow-sm mb-2">
                <span class="material-symbols-outlined text-[24px]">add_photo_alternate</span>
              </div>
              <span class="font-label-md text-label-md text-on-surface font-semibold">อัปโหลดรูปสินค้า</span>
              <span class="font-label-sm text-label-sm text-on-surface-variant mt-0.5">ลากไฟล์มาวาง หรือคลิกเพื่อเลือกรูป</span>
              <button type="button" id="btnChooseImage" class="mt-2 px-space-md py-space-xs rounded-full bg-surface-container-lowest shadow-sm text-on-surface font-label-md text-label-md flex items-center gap-space-xs cursor-pointer hover:bg-surface-container transition-colors">
                <span class="material-symbols-outlined text-tertiary text-[18px]">cloud_upload</span>
                <span>เลือกไฟล์จากเครื่อง</span>
              </button>
              <span class="font-label-sm text-label-sm text-on-surface-variant opacity-80 mt-1">PNG, JPG, WEBP ไม่เกิน 5MB</span>
            </div>
          `;
        }

        grid.innerHTML = html;
      }
    }
  };

  // Asynchronously resolve any storagePaths to download URLs in the background
  resolveAllProductImages(initialImages, productId).then(({ images: resolved }) => {
    if (resolved && resolved.length > 0) {
      productImages = resolved;
      renderPreviews();
    }
  }).catch((err) => {
    console.warn('[wireProductImageUpload] Error resolving images:', err);
  });

  // 3. Handle file upload logic
  const handleFilesSelected = async (files: FileList | File[]) => {
    const { validFiles, errors } = validateProductImages(files, productImages.length);

    if (errors.length > 0) {
      win.alert(errors.join('\n'));
    }

    if (validFiles.length === 0) return;

    // Show upload loading indicator on dropzone
    const uploadDropzone = doc.getElementById('productImageDropzone');
    if (uploadDropzone) {
      uploadDropzone.style.opacity = '0.6';
      uploadDropzone.style.pointerEvents = 'none';
    }

    try {
      for (const file of validFiles) {
        if (productImages.length >= 8) break;
        const isPrimary = productImages.length === 0;
        const uploaded = await uploadProductImageFile(productId, file, isPrimary);
        productImages.push(uploaded);
        if (isPrimary) {
          productImages.forEach((img, idx) => {
            img.isPrimary = idx === 0;
          });
        }
        renderPreviews();
      }
    } catch (uploadErr: any) {
      console.error('[Product Image Upload] Error uploading file:', uploadErr);
      win.alert(`เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ:\n${uploadErr?.message || 'โปรดลองอีกครั้ง'}`);
    } finally {
      if (uploadDropzone) {
        uploadDropzone.style.opacity = '1';
        uploadDropzone.style.pointerEvents = 'auto';
      }
      renderPreviews();
    }
  };

  // 4. File input change listener
  fileInput.onchange = () => {
    if (fileInput && fileInput.files && fileInput.files.length > 0) {
      handleFilesSelected(fileInput.files);
      fileInput.value = '';
    }
  };

  // 5. Clean up previous click & drag listeners if any
  const docAny = doc as any;
  if (docAny.__productImageCleanup) {
    docAny.__productImageCleanup();
  }

  const clickListener = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Handle "เลือกไฟล์จากเครื่อง" button click
    const chooseBtn = target.closest('#btnChooseImage, button[data-choose-image]') as HTMLElement | null;
    if (chooseBtn) {
      e.preventDefault();
      e.stopPropagation();
      const currentInput = doc.getElementById('productImageFileInput') as HTMLInputElement | null;
      currentInput?.click();
      return;
    }

    // Handle clicking anywhere on the dropzone
    const dropzone = target.closest('#productImageDropzone') as HTMLElement | null;
    if (dropzone && !target.closest('button, a, input, [data-remove-image-id], [data-set-cover-id], [data-star-img], [data-remove-img]')) {
      e.preventDefault();
      const currentInput = doc.getElementById('productImageFileInput') as HTMLInputElement | null;
      currentInput?.click();
      return;
    }

    // Handle Set Cover Image ("ตั้งเป็นหน้าปก")
    const coverBtn = target.closest('[data-set-cover-id], [data-star-img]') as HTMLElement | null;
    if (coverBtn) {
      e.preventDefault();
      e.stopPropagation();
      const targetId = coverBtn.getAttribute('data-set-cover-id');
      const targetIdx = parseInt(coverBtn.getAttribute('data-star-img') || '-1', 10);

      let found = false;
      if (targetId) {
        productImages.forEach((img) => {
          if (img.id === targetId) {
            img.isPrimary = true;
            found = true;
          } else {
            img.isPrimary = false;
          }
        });
      } else if (targetIdx >= 0 && targetIdx < productImages.length) {
        productImages.forEach((img, idx) => {
          img.isPrimary = idx === targetIdx;
        });
        found = true;
      }

      if (found) {
        renderPreviews();
      }
      return;
    }

    // Handle Remove Image (delete button)
    const removeBtn = target.closest('[data-remove-image-id], [data-remove-img]') as HTMLElement | null;
    if (removeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const targetId = removeBtn.getAttribute('data-remove-image-id');
      const targetIdx = parseInt(removeBtn.getAttribute('data-remove-img') || '-1', 10);

      let removeIndex = -1;
      if (targetId) {
        removeIndex = productImages.findIndex((img) => img.id === targetId);
      } else if (targetIdx >= 0 && targetIdx < productImages.length) {
        removeIndex = targetIdx;
      }

      if (removeIndex >= 0 && removeIndex < productImages.length) {
        const removed = productImages.splice(removeIndex, 1)[0];

        // Do not physically delete from Firebase Storage yet.
        // Queue it and delete only after Save Draft / Publish succeeds.
        if (removed) {
          onImageQueuedForDelete?.(removed);
        }

        // If the deleted image was the cover, choose the first remaining image.
        if (removed?.isPrimary && productImages.length > 0) {
          productImages.forEach((img, idx) => {
            img.isPrimary = idx === 0;
          });
        }

        renderPreviews();
      }
      return;
    }
  };

  const dragOverListener = (e: DragEvent) => {
    const dropzone = (e.target as HTMLElement | null)?.closest('#productImageDropzone');
    if (dropzone) {
      e.preventDefault();
      dropzone.classList.add('border-primary');
    }
  };

  const dragLeaveListener = (e: DragEvent) => {
    const dropzone = (e.target as HTMLElement | null)?.closest('#productImageDropzone');
    if (dropzone) {
      e.preventDefault();
      dropzone.classList.remove('border-primary');
    }
  };

  const dropListener = (e: DragEvent) => {
    const dropzone = (e.target as HTMLElement | null)?.closest('#productImageDropzone');
    if (dropzone) {
      e.preventDefault();
      dropzone.classList.remove('border-primary');
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFilesSelected(e.dataTransfer.files);
      }
    }
  };

  doc.addEventListener('click', clickListener);
  doc.addEventListener('dragover', dragOverListener);
  doc.addEventListener('dragleave', dragLeaveListener);
  doc.addEventListener('drop', dropListener);

  docAny.__productImageCleanup = () => {
    doc.removeEventListener('click', clickListener);
    doc.removeEventListener('dragover', dragOverListener);
    doc.removeEventListener('dragleave', dragLeaveListener);
    doc.removeEventListener('drop', dropListener);
  };

  // Initial render of previews
  renderPreviews();

  return {
    getImages: () => productImages,
    setImages: (newImgs: (ProductImage | string)[]) => {
      const { images: canonical } = canonicalizeProductImages(newImgs, productId);
      productImages = [...canonical];
      renderPreviews();
    },
  };
}

interface ScreenRendererProps {
  screen: ScreenDefinition;
  routeType: 'storefront' | 'admin';
  backFallback?: string;
}

export const ScreenRenderer: React.FC<ScreenRendererProps> = ({
  screen,
  routeType,
  backFallback = '/',
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeResizeObserverRef = useRef<ResizeObserver | null>(null);
  const iframeResizeCleanupRef = useRef<(() => void) | null>(null);
  const guidanceCleanupRef = useRef<(() => void) | null>(null);
  const newProductIdRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const cart = getServiceCartAdapter();

  useEffect(() => {
    if (location.pathname !== '/admin/products/new') {
      newProductIdRef.current = null;
    }
  }, [location.pathname]);

  const handleIframeLoaded = async () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow as any;
    if (!win) return;

    iframeResizeCleanupRef.current?.();
    iframeResizeObserverRef.current?.disconnect();

    if (routeType === 'storefront') {
      installStorefrontDesktopStyles(doc);
      syncStorefrontAdminMobileTab(doc, !auth.profileLoading && canAccessAdmin(auth.customerProfile));
      guidanceCleanupRef.current?.();
      guidanceCleanupRef.current = location.pathname === '/' ? mountHomeGuidancePanel(doc) ?? null : null;
      mountAccountNavigation(doc, location.pathname);

      const syncIframeHeight = () => {
        if (window.matchMedia('(max-width: 768px)').matches) {
          const frameTop = iframe.getBoundingClientRect().top + window.scrollY;
          iframe.style.height = `${Math.max(window.innerHeight - frameTop, 1)}px`;
          return;
        }
        if (location.pathname.startsWith('/products/') || location.pathname.startsWith('/product/')) {
          const storefrontHeaderHeight = document.querySelector('.storefront-header')?.getBoundingClientRect().height || 0;
          iframe.style.height = `${Math.max(window.innerHeight - storefrontHeaderHeight, 320)}px`;
          return;
        }
        iframe.style.height = `${Math.max(
          doc.documentElement.scrollHeight,
          doc.body?.scrollHeight || 0,
          520
        )}px`;
      };

      const resizeObserver = new ResizeObserver(syncIframeHeight);
      iframeResizeObserverRef.current = resizeObserver;
      resizeObserver.observe(doc.documentElement);
      if (doc.body) resizeObserver.observe(doc.body);
      window.addEventListener('resize', syncIframeHeight);

      // Wheel input stays inside an iframe document instead of bubbling to the
      // page that owns the browser scrollbar. Forward vertical wheel movement
      // to the storefront shell when no nested frame element can scroll it.
      const forwardWheelToStorefront = (event: WheelEvent) => {
        if (
          window.matchMedia('(max-width: 768px)').matches ||
          event.defaultPrevented ||
          event.deltaY === 0 ||
          Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ) {
          return;
        }

        const target = win.HTMLElement && event.target instanceof win.HTMLElement
          ? event.target as HTMLElement
          : null;
        if (target?.closest('select, input[type="number"], input[type="range"]')) return;

        for (let element = target; element && element !== doc.body; element = element.parentElement) {
          const overflowY = win.getComputedStyle(element).overflowY;
          if (!['auto', 'scroll', 'overlay'].includes(overflowY)) continue;
          if (element.scrollHeight <= element.clientHeight + 1) continue;

          const canScrollUp = event.deltaY < 0 && element.scrollTop > 0;
          const canScrollDown =
            event.deltaY > 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 1;
          if (canScrollUp || canScrollDown) return;
        }

        const frameScrollRoot = doc.scrollingElement;
        if (frameScrollRoot) {
          const frameCanScrollUp = event.deltaY < 0 && frameScrollRoot.scrollTop > 0;
          const frameCanScrollDown =
            event.deltaY > 0 && frameScrollRoot.scrollTop + frameScrollRoot.clientHeight < frameScrollRoot.scrollHeight - 1;
          if (frameCanScrollUp || frameCanScrollDown) return;
        }

        const scrollRoot = document.scrollingElement;
        if (!scrollRoot) return;
        const maxScrollTop = scrollRoot.scrollHeight - window.innerHeight;
        const canScrollUp = event.deltaY < 0 && scrollRoot.scrollTop > 0;
        const canScrollDown = event.deltaY > 0 && scrollRoot.scrollTop < maxScrollTop - 1;
        if (!canScrollUp && !canScrollDown) return;

        event.preventDefault();
        window.scrollBy(0, event.deltaY);
      };
      doc.addEventListener('wheel', forwardWheelToStorefront, { passive: false });

      const showMissingProductImage = (event: Event) => {
        const image = event.target as HTMLImageElement | null;
        if (!image || image.tagName !== 'IMG' || !image.hasAttribute('data-storefront-product-image')) return;
        image.classList.add('hidden');
        image.nextElementSibling?.classList.remove('hidden');
      };
      doc.addEventListener('error', showMissingProductImage, true);

      iframeResizeCleanupRef.current = () => {
        window.removeEventListener('resize', syncIframeHeight);
        doc.removeEventListener('wheel', forwardWheelToStorefront);
        doc.removeEventListener('error', showMissingProductImage, true);
        resizeObserver.disconnect();
      };
      syncIframeHeight();
    }

    if (routeType === 'admin') {
      try {
        await installDashboardAdminShell(doc, location.pathname);
      } catch (error) {
        console.error('[SOULMATE Admin] Dashboard navigation failed to load:', error);
      }
      normalizeAdminShellSizing(doc);
      configureAdminTopbar(doc);
    }

    // Ensure search icon is placed before profile icon in header
    if (routeType === 'storefront') {
      ensureHeaderSearchIcon(doc, navigate);
      syncStorefrontAdminMobileTab(doc, !auth.profileLoading && canAccessAdmin(auth.customerProfile));
    }

    // Fix stale imported Admin sidebar routes before any clicks are handled.
    if (routeType === 'admin' || location.pathname.startsWith('/admin')) {
      normalizeAdminSidebarRoutes(doc);
      const logoLink = doc.querySelector('aside img[alt="SOULMATE"]')?.closest<HTMLAnchorElement>('a');
      logoLink?.setAttribute('href', '/admin/dashboard');
      logoLink?.setAttribute('data-path', 'admin-dashboard');
      logoLink?.setAttribute('data-route', '/admin/dashboard');
    }
    if (routeType === 'admin') iframe.style.visibility = 'visible';

    // Do not expose Stitch/dev test-state controls on real storefront pages.
    if (routeType === 'storefront') {
      removeStorefrontTestModeUI(doc);
    }

    // 1. Navigation & Link Interception
    const handleNavClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest(
        'a, button, [role="button"], [data-path], [data-route]'
      );
      if (!target) return;

      const pathAttr = target.getAttribute('data-path');
      const routeAttr = target.getAttribute('data-route');
      const href = target.getAttribute('href');
      const isAdminRoute = routeType === 'admin' || location.pathname.startsWith('/admin');
      // Storefront checkout also uses an <aside> for its sticky submit bar.
      // Only treat an aside as admin navigation when we're already on an admin route.
      const isAside = isAdminRoute && !!target.closest('aside, nav[data-admin-nav], .admin-sidebar');
      const isAdminContext = isAdminRoute;

      // ===============================================================
      // CUSTOMER CART — ONE REAL CART DESTINATION ON EVERY STOREFRONT PAGE
      // ===============================================================
      // Stitch imported screens use inconsistent markup for cart icons.
      // Some use data-path="cart", while others only use a material icon.
      // Normalize every real cart-navigation control to /cart.
      //
      // IMPORTANT: Do not intercept "เพิ่มลงตะกร้า" buttons.
      const normalizedHref = (href || '')
        .replace(/^#/, '')
        .trim()
        .toLowerCase();

      const ariaLabel = (target.getAttribute('aria-label') || '')
        .trim()
        .toLowerCase();

      const titleText = (target.getAttribute('title') || '')
        .trim()
        .toLowerCase();

      const targetId = (target.id || '').toLowerCase();
      const targetClass = String(target.className || '').toLowerCase();
      const actionName = (target.getAttribute('data-action') || '').toLowerCase();
      const targetText = (target.textContent || '').trim().toLowerCase();

      const materialIconNames = Array.from(
        target.querySelectorAll(
          '.material-symbols-outlined, .material-icons'
        )
      )
        .map((icon) => (icon.textContent || '').trim().toLowerCase())
        .filter(Boolean);

      if (
        target.classList.contains('material-symbols-outlined') ||
        target.classList.contains('material-icons')
      ) {
        const ownIcon = (target.textContent || '').trim().toLowerCase();
        if (ownIcon) materialIconNames.push(ownIcon);
      }

      const isAddToCartControl =
        actionName === 'add-to-cart' ||
        actionName === 'add_cart' ||
        materialIconNames.includes('add_shopping_cart') ||
        ariaLabel.includes('เพิ่มลงตะกร้า') ||
        titleText.includes('เพิ่มลงตะกร้า') ||
        targetText.includes('เพิ่มลงตะกร้า');

      const isCartNavigationControl =
        !isAdminContext &&
        !isAddToCartControl &&
        (
          (pathAttr || '').toLowerCase() === 'cart' ||
          normalizedHref === '/cart' ||
          normalizedHref === 'cart' ||
          ariaLabel === 'ตะกร้า' ||
          ariaLabel.includes('ตะกร้าสินค้า') ||
          titleText === 'ตะกร้า' ||
          titleText.includes('ตะกร้าสินค้า') ||
          targetId === 'cart' ||
          targetId.includes('cart-button') ||
          targetId.includes('cart-btn') ||
          targetClass.includes('cart-button') ||
          targetClass.includes('cart-btn') ||
          materialIconNames.includes('shopping_cart') ||
          materialIconNames.includes('shopping_bag') ||
          materialIconNames.includes('shopping_basket')
        );

      if (isCartNavigationControl) {
        e.preventDefault();
        e.stopPropagation();

        const effective = createEffectiveCart(cart);
        if (effective.items.length > 0) {
          savePersistedCart(effective.items);
        }

        navigate('/cart', {
          state: {
            soulmateCartItems: effective.items,
          },
        });
        return;
      }

      // 1. Explicit data-route normally takes highest precedence.
      // In Admin context, normalize stale imported routes such as /products
      // to their real /admin/* destinations before navigating.
      if (routeAttr) {
        e.preventDefault();
        e.stopPropagation();
        navigate(
          isAdminContext
            ? resolveAdminNavigationTarget(routeAttr)
            : routeAttr
        );
        return;
      }

      // Admin nested pages must keep their exact href.
      // Without this guard, /admin/products/:id/edit was being mistaken for
      // the top-level Products menu and redirected back to /admin/products.
      if (isAdminContext && href) {
        const adminHref = href.replace(/^#/, '');
        const nestedAdminRoutes = [
          /^\/admin\/products\/new$/,
          /^\/admin\/products\/[^/]+\/edit$/,
          /^\/admin\/orders\/[^/]+$/,
          /^\/admin\/customers\/[^/]+$/,
          /^\/admin\/banners\/new$/,
          /^\/admin\/banners\/[^/]+\/edit$/,
          /^\/admin\/coupons\/new$/,
          /^\/admin\/coupons\/[^/]+\/edit$/,
        ];

        if (nestedAdminRoutes.some((pattern) => pattern.test(adminHref))) {
          e.preventDefault();
          e.stopPropagation();
          navigate(adminHref);
          return;
        }
      }

      // 2. Admin Context Navigation (Admin sidebar or within /admin)
      if (isAdminContext) {
        const textContent = (target.textContent || '').trim().toLowerCase();
        const rawHref = (href || '').toLowerCase();
        const p = (pathAttr || '').toLowerCase();

        // Admin Products navigation
        if (
          p === 'admin-products' ||
          p === 'products' ||
          rawHref === '/admin/products' ||
          rawHref === '#/admin/products' ||
          (isAside && (rawHref === '/products' || textContent.includes('products') || textContent.includes('สินค้า')))
        ) {
          e.preventDefault();
          e.stopPropagation();
          navigate('/admin/products');
          return;
        }

        // Admin Dashboard navigation
        if (
          p === 'admin-dashboard' ||
          p === 'dashboard' ||
          rawHref === '/admin/dashboard' ||
          rawHref === '#/admin/dashboard' ||
          (isAside && (textContent.includes('dashboard') || textContent.includes('แดชบอร์ด')))
        ) {
          e.preventDefault();
          e.stopPropagation();
          navigate('/admin/dashboard');
          return;
        }

        // Admin Orders navigation
        if (
          p === 'admin-orders' ||
          p === 'orders' ||
          rawHref === '/admin/orders' ||
          rawHref === '#/admin/orders' ||
          (isAside && (textContent.includes('orders') || textContent.includes('คำสั่งซื้อ')))
        ) {
          e.preventDefault();
          e.stopPropagation();
          navigate('/admin/orders');
          return;
        }

        // Admin Customers navigation
        if (
          p === 'admin-customers' ||
          p === 'customers' ||
          rawHref === '/admin/customers' ||
          rawHref === '#/admin/customers' ||
          (isAside && (textContent.includes('customers') || textContent.includes('ลูกค้า')))
        ) {
          e.preventDefault();
          e.stopPropagation();
          navigate('/admin/customers');
          return;
        }

        // Admin Banners navigation
        if (
          p === 'admin-banners' ||
          p === 'banners' ||
          rawHref === '/admin/banners' ||
          rawHref === '#/admin/banners' ||
          (isAside && (textContent.includes('banners') || textContent.includes('แบนเนอร์')))
        ) {
          e.preventDefault();
          e.stopPropagation();
          navigate('/admin/banners');
          return;
        }

        // Admin Coupons navigation
        if (
          p === 'admin-coupons' ||
          p === 'coupons' ||
          rawHref === '/admin/coupons' ||
          rawHref === '#/admin/coupons' ||
          (isAside && (textContent.includes('coupons') || textContent.includes('คูปอง')))
        ) {
          e.preventDefault();
          e.stopPropagation();
          navigate('/admin/coupons');
          return;
        }

        // Admin Settings navigation
        if (
          p === 'admin-settings' ||
          p === 'settings' ||
          rawHref === '/admin/settings' ||
          rawHref === '#/admin/settings' ||
          (isAside && (textContent.includes('settings') || textContent.includes('ตั้งค่า')))
        ) {
          e.preventDefault();
          e.stopPropagation();
          navigate('/admin/settings');
          return;
        }

        // Admin Logout navigation
        if (
          p === 'admin-login' ||
          p === 'logout' ||
          rawHref.includes('admin/login') ||
          (isAside && (textContent.includes('ออกจากระบบ') || textContent.includes('log out') || textContent.includes('logout')))
        ) {
          e.preventDefault();
          e.stopPropagation();
          void auth.logout()
            .then(() => navigate('/admin/login', { replace: true }))
            .catch(() => win.alert('ออกจากระบบไม่สำเร็จ กรุณาลองอีกครั้ง'));
          return;
        }
      }

      // 3. Customer Storefront Navigation (when outside admin context)
      if (pathAttr) {
        e.preventDefault();
        const routeMap: Record<string, string> = {
          home: '/',
          shop: '/products',
          products: '/products',
          search: '/products',
          cart: '/cart',
          account: '/account',
          login: '/login',
          register: '/register',
          checkout: '/checkout',
          'admin-dashboard': '/admin/dashboard',
          'admin-products': '/admin/products',
          'admin-orders': '/admin/orders',
          'admin-customers': '/admin/customers',
          'admin-banners': '/admin/banners',
          'admin-coupons': '/admin/coupons',
          'admin-settings': '/admin/settings',
          'admin-login': '/admin/login',
        };
        const dest = routeMap[pathAttr] || pathAttr;
        navigate(dest);
        return;
      }

      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
        if (href === '#' || href === 'javascript:void(0)') {
          return;
        }

        e.preventDefault();
        navigate(
          isAdminContext
            ? resolveAdminNavigationTarget(href)
            : href
        );
      }
    };

    doc.addEventListener('click', handleNavClick);

    // History back interceptor
    const backBtns = doc.querySelectorAll(
      'button[onclick*="history.back"], button[aria-label="Go back"], #btn-back'
    );
    backBtns.forEach((btn) => {
      btn.removeAttribute('onclick');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate(backFallback);
        }
      });
    });

    // 2. Global Cart Badges
    const effectiveCartOnLoad = createEffectiveCart(cart);
    updateAllCartBadges(doc, effectiveCartOnLoad.itemCount);

    // 3. Storefront Navigation Highlights
    if (routeType === 'storefront') {
      const navLinks = doc.querySelectorAll('nav [data-path]');
      navLinks.forEach((link) => {
        const p = link.getAttribute('data-path');
        const isActive =
          (p === 'home' && location.pathname === '/') ||
          (p === 'shop' && location.pathname.startsWith('/products')) ||
          (p === 'cart' && location.pathname === '/cart') ||
          (p === 'account' && location.pathname.startsWith('/account'));

        if (isActive) {
          link.setAttribute('aria-current', 'page');
          link.className =
            'flex flex-col items-center justify-center h-12 px-space-md rounded-full transition-all duration-200 gap-0.5 text-on-primary-container bg-primary-container font-semibold';
        } else {
          link.removeAttribute('aria-current');
          link.className =
            'flex flex-col items-center justify-center h-12 px-space-md rounded-full text-on-surface-variant hover:text-primary transition-all duration-200 gap-0.5';
        }
      });
    }

    // 4. Admin Sidebar Highlights
    if (routeType === 'admin') {
      const adminLinks = doc.querySelectorAll('aside nav [data-path], aside nav [data-route], aside nav a');
      adminLinks.forEach((link) => {
        const p = (link.getAttribute('data-path') || '').toLowerCase();
        const r = (link.getAttribute('data-route') || link.getAttribute('href') || '').toLowerCase();
        const text = (link.textContent || '').toLowerCase();

        const isDash =
          (p === 'admin-dashboard' || p === 'dashboard' || r.includes('admin/dashboard') || text.includes('dashboard')) &&
          location.pathname === '/admin/dashboard';
        const isProd =
          (
            p === 'admin-products' ||
            p === 'products' ||
            r.includes('admin/products') ||
            text.includes('products') ||
            text.includes('สินค้า')
          ) &&
          location.pathname.startsWith('/admin/products');
        const isOrders =
          (
            p === 'admin-orders' ||
            p === 'orders' ||
            r.includes('admin/orders') ||
            text.includes('orders') ||
            text.includes('คำสั่งซื้อ')
          ) &&
          location.pathname.startsWith('/admin/orders');
        const isCust =
          (
            p === 'admin-customers' ||
            p === 'customers' ||
            r.includes('admin/customers') ||
            text.includes('customers') ||
            text.includes('ลูกค้า')
          ) &&
          location.pathname.startsWith('/admin/customers');
        const isBanners =
          (
            p === 'admin-banners' ||
            p === 'banners' ||
            r.includes('admin/banners') ||
            text.includes('banners') ||
            text.includes('แบนเนอร์')
          ) &&
          location.pathname.startsWith('/admin/banners');
        const isCoupons =
          (
            p === 'admin-coupons' ||
            p === 'coupons' ||
            r.includes('admin/coupons') ||
            text.includes('coupons') ||
            text.includes('คูปอง')
          ) &&
          location.pathname.startsWith('/admin/coupons');
        const isSettings =
          (
            p === 'admin-settings' ||
            p === 'settings' ||
            r.includes('admin/settings') ||
            text.includes('settings') ||
            text.includes('ตั้งค่า')
          ) &&
          location.pathname.startsWith('/admin/settings');

        const isActive = isDash || isProd || isOrders || isCust || isBanners || isCoupons || isSettings;

        if (isActive) {
          link.setAttribute('aria-current', 'page');
          link.className =
            'flex items-center gap-space-sm px-space-md py-space-sm transition-all bg-primary-container text-on-primary-container font-label-lg rounded-xl shadow-xs';
        } else if (
          link.getAttribute('data-path') ||
          link.getAttribute('data-route') ||
          link.getAttribute('href')?.startsWith('/admin')
        ) {
          link.removeAttribute('aria-current');
          link.className =
            'flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all';
        }
      });
    }

    // =========================================================================
    // 5. ROUTE-SPECIFIC WIRING
    // =========================================================================

    // --- Admin Login Page Wiring ---
    if (location.pathname === '/admin/login') {
      win.setAdminRole = (newRole: string) => {
        const input = doc.getElementById('selectedRoleInput') as HTMLInputElement | null;
        if (input) input.value = newRole;
        const tabSuper = doc.getElementById('roleTabSuperAdmin');
        const tabAdmin = doc.getElementById('roleTabAdmin');
        if (newRole === 'super_admin') {
          tabSuper?.classList.add('bg-[#a8e5cf]', 'text-[#132E27]', 'font-bold', 'shadow-sm');
          tabSuper?.classList.remove('text-gray-600');
          tabAdmin?.classList.remove('bg-[#a8e5cf]', 'text-[#132E27]', 'font-bold', 'shadow-sm');
          tabAdmin?.classList.add('text-gray-600');
        } else {
          tabAdmin?.classList.add('bg-[#a8e5cf]', 'text-[#132E27]', 'font-bold', 'shadow-sm');
          tabAdmin?.classList.remove('text-gray-600');
          tabSuper?.classList.remove('bg-[#a8e5cf]', 'text-[#132E27]', 'font-bold', 'shadow-sm');
          tabSuper?.classList.add('text-gray-600');
        }
      };

      win.handleAdminAuth = (e: Event) => {
        const input = doc.getElementById('selectedRoleInput') as HTMLInputElement | null;
        const role = input?.value || 'admin';
        win.handleAdminAuthSubmit(e, role);
      };

      win.handleAdminAuthSubmit = async (e: Event, role: string) => {
        e?.preventDefault?.();

        const emailInput = doc.getElementById('adminEmail') as HTMLInputElement | null;
        const passwordInput = doc.getElementById('adminPassword') as HTMLInputElement | null;
        const btnText = doc.getElementById('btnText');
        const btnSpinner = doc.getElementById('btnSpinner');
        const submitBtn = doc.getElementById('submitBtn') as HTMLButtonElement | null;
        const alertBox = doc.getElementById('alertBox');
        const alertMessage = doc.getElementById('alertMessage');

        const email = emailInput?.value.trim() || '';
        const password = passwordInput?.value || '';

        alertBox?.classList.add('hidden');

        if (!email || !password) {
          if (alertMessage) {
            alertMessage.textContent = 'กรุณากรอกอีเมลและรหัสผ่านผู้ดูแลระบบให้ครบถ้วน';
          }
          alertBox?.classList.remove('hidden');
          return;
        }

        if (submitBtn) submitBtn.disabled = true;
        btnText?.classList.add('hidden');
        btnSpinner?.classList.remove('hidden');

        try {
          const result = await auth.adminLogin(email, password, role);

          if (!result.authorized) {
            if (alertMessage) {
              alertMessage.textContent =
                result.reason || 'บัญชีนี้ไม่มีสิทธิ์เข้าสู่ระบบหลังบ้าน';
            }
            alertBox?.classList.remove('hidden');
            return;
          }

          alertBox?.classList.add('hidden');
          navigate('/admin/dashboard', { replace: true });
          return;
        } catch (err: any) {
          console.error('[SOULMATE Admin Login] submit error:', err);
          if (alertMessage) {
            alertMessage.textContent = err?.message || mapFirebaseAuthError(err);
          }
          alertBox?.classList.remove('hidden');
        } finally {
          if (submitBtn) submitBtn.disabled = false;
          btnText?.classList.remove('hidden');
          btnSpinner?.classList.add('hidden');
        }
      };
    }

    // --- Customer Login Wiring ---
    if (location.pathname === '/login') {
      const loginForm = doc.getElementById('loginForm');
      if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const emailInput = doc.getElementById('emailInput') as HTMLInputElement | null;
          const passInput = doc.getElementById('passwordInput') as HTMLInputElement | null;
          const alertBox = doc.getElementById('globalFormAlert');
          const alertMsg = doc.getElementById('errorSummaryMessage');
          const submitBtn = doc.getElementById('submitLoginBtn') as HTMLButtonElement | null;
          const btnLabel = doc.getElementById('btnLabel');
          const btnSpinner = doc.getElementById('btnSpinner');

          const email = emailInput?.value.trim() || '';
          const pass = passInput?.value || '';

          alertBox?.classList.add('hidden');

          if (!email || !pass) {
            if (alertMsg) alertMsg.textContent = 'กรุณาระบุอีเมลและรหัสผ่าน';
            alertBox?.classList.remove('hidden');
            return;
          }

          if (submitBtn) submitBtn.disabled = true;
          btnLabel?.classList.add('hidden');
          btnSpinner?.classList.remove('hidden');

          try {
            await auth.login(email, pass);
            navigate('/account', { replace: true });
          } catch (err: any) {
            if (alertMsg) alertMsg.textContent = mapFirebaseAuthError(err);
            alertBox?.classList.remove('hidden');
          } finally {
            if (submitBtn) submitBtn.disabled = false;
            btnLabel?.classList.remove('hidden');
            btnSpinner?.classList.add('hidden');
          }
        });
      }
    }

    // --- Customer Register Wiring ---
    if (location.pathname === '/register') {
      const regForm = doc.getElementById('registerForm');
      if (regForm) {
        regForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          const firstInput = doc.getElementById('firstNameInput') as HTMLInputElement | null;
          const lastInput = doc.getElementById('lastNameInput') as HTMLInputElement | null;
          const phoneInput = doc.getElementById('phoneInput') as HTMLInputElement | null;
          const emailInput = doc.getElementById('emailInput') as HTMLInputElement | null;
          const passInput = doc.getElementById('passwordInput') as HTMLInputElement | null;
          const confirmPassInput = doc.getElementById('confirmPasswordInput') as HTMLInputElement | null;
          const alertBox = doc.getElementById('globalFormAlert');
          const alertMsg = doc.getElementById('errorSummaryMessage');
          const submitBtn = doc.getElementById('submitRegisterBtn') as HTMLButtonElement | null;
          const btnLabel = doc.getElementById('btnLabel');
          const btnSpinner = doc.getElementById('btnSpinner');

          const firstName = firstInput?.value.trim() || '';
          const lastName = lastInput?.value.trim() || '';
          const phone = phoneInput?.value.trim() || '';
          const email = emailInput?.value.trim() || '';
          const password = passInput?.value || '';
          const confirmPassword = confirmPassInput?.value || '';

          alertBox?.classList.add('hidden');

          if (!firstName || !lastName || !phone || !email || !password) {
            if (alertMsg) alertMsg.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วน';
            alertBox?.classList.remove('hidden');
            return;
          }

          if (password !== confirmPassword) {
            if (alertMsg) alertMsg.textContent = 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน';
            alertBox?.classList.remove('hidden');
            return;
          }

          if (submitBtn) submitBtn.disabled = true;
          btnLabel?.classList.add('hidden');
          btnSpinner?.classList.remove('hidden');

          try {
            await auth.register(email, password, { firstName, lastName, phone });
            navigate('/account', { replace: true });
          } catch (err: any) {
            if (alertMsg) alertMsg.textContent = mapFirebaseAuthError(err);
            alertBox?.classList.remove('hidden');
          } finally {
            if (submitBtn) submitBtn.disabled = false;
            btnLabel?.classList.remove('hidden');
            btnSpinner?.classList.add('hidden');
          }
        });
      }
    }

    // --- Customer Account Overview Wiring ---
    if (location.pathname === '/account') {
      const profile = auth.customerProfile;
      if (profile) {
        const nameEl = doc.getElementById('profile-name-display');
        const emailEl = doc.getElementById('profile-email-display');
        const phoneEl = doc.getElementById('profile-tel-display');
        const avatarImg = doc.getElementById('account-avatar-img') as HTMLImageElement | null;
        const avatarDefault = doc.getElementById('account-avatar-default');

        if (nameEl) nameEl.textContent = profile.displayName || `${profile.firstName} ${profile.lastName}`;
        if (emailEl) emailEl.textContent = profile.email || auth.user?.email || '';
        if (phoneEl) phoneEl.textContent = profile.phone || '';

        if (profile.photoURL && avatarImg) {
          avatarImg.src = profile.photoURL;
          avatarImg.classList.remove('hidden');
          avatarDefault?.classList.add('hidden');
        }

        // Tier Progress
        const tierInfo = getMembershipProgress(
          profile.completedOrderCount || 0,
          profile.lifetimeSpend || 0
        );
        const tierName = doc.getElementById('tier-name-display');
        if (tierName) tierName.textContent = tierInfo.currentTier;
      }

      const passwordResetBtn = doc.getElementById('account-password-reset') as HTMLButtonElement | null;
      const passwordMessage = doc.getElementById('account-password-message');
      passwordResetBtn?.addEventListener('click', async () => {
        const email = auth.user?.email || auth.customerProfile?.email;
        if (!passwordMessage) return;
        passwordMessage.classList.remove('hidden');
        if (!email) {
          passwordMessage.textContent = 'ไม่พบอีเมลของบัญชี กรุณาตรวจสอบข้อมูลส่วนตัว';
          return;
        }
        passwordResetBtn.disabled = true;
        passwordResetBtn.textContent = 'กำลังส่งอีเมล…';
        try {
          await auth.resetPassword(email);
          passwordMessage.textContent = `ส่งลิงก์ตั้งรหัสผ่านใหม่ไปที่ ${email} แล้ว`;
        } catch (error) {
          passwordMessage.textContent = (error as Error).message || 'ส่งอีเมลไม่สำเร็จ กรุณาลองอีกครั้ง';
        } finally {
          passwordResetBtn.disabled = false;
          passwordResetBtn.textContent = 'เปลี่ยนรหัสผ่าน';
        }
      });

      // Logout modal wiring
      const logoutBtn = doc.getElementById('btn-logout');
      const logoutModal = doc.getElementById('logout-modal');
      const cancelBtn = doc.getElementById('modal-cancel-btn');
      const confirmBtn = doc.getElementById('modal-confirm-btn');

      logoutBtn?.addEventListener('click', () => {
        logoutModal?.classList.remove('hidden');
      });
      cancelBtn?.addEventListener('click', () => {
        logoutModal?.classList.add('hidden');
      });
      confirmBtn?.addEventListener('click', async () => {
        await auth.logout();
        navigate('/', { replace: true });
      });
    }

    // ---     // --- Customer Profile Page Wiring ---
    if (location.pathname === '/account/profile') {
      const profile = auth.customerProfile;
      if (profile) {
        const firstEl = doc.getElementById('firstName') as HTMLInputElement | null;
        const lastEl = doc.getElementById('lastName') as HTMLInputElement | null;
        const phoneEl = doc.getElementById('phoneNumber') as HTMLInputElement | null;
        const emailEl = doc.getElementById('email') as HTMLInputElement | null;

        if (firstEl) firstEl.value = profile.firstName || '';
        if (lastEl) lastEl.value = profile.lastName || '';
        if (phoneEl) phoneEl.value = profile.phone || '';
        if (emailEl) emailEl.value = profile.email || auth.user?.email || '';
      }

      const profileForm = doc.getElementById('profileForm');
      profileForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstEl = doc.getElementById('firstName') as HTMLInputElement | null;
        const lastEl = doc.getElementById('lastName') as HTMLInputElement | null;
        const phoneEl = doc.getElementById('phoneNumber') as HTMLInputElement | null;
        const toast = doc.getElementById('statusToast');
        const toastMsg = doc.getElementById('statusMessage');

        try {
          await auth.updateCustomerProfile({
            firstName: firstEl?.value.trim() || '',
            lastName: lastEl?.value.trim() || '',
            phone: phoneEl?.value.trim() || '',
          });
          if (toast && toastMsg) {
            toastMsg.textContent = 'บันทึกข้อมูลส่วนตัวเรียบร้อยแล้ว';
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3000);
          }
        } catch (err: any) {
          if (toast && toastMsg) {
            toastMsg.textContent = err?.message || 'เกิดข้อผิดพลาดในการบันทึก';
            toast.classList.remove('hidden');
          }
        }
      });
    }

    // --- Customer Shipping Address Page Wiring ---
    if (location.pathname === '/account/addresses') {
      const addr = auth.customerProfile?.defaultShippingAddress;
      if (addr) {
        const sFirst = doc.getElementById('shippingFirstName') as HTMLInputElement | null;
        const sLast = doc.getElementById('shippingLastName') as HTMLInputElement | null;
        const sPhone = doc.getElementById('shippingPhone') as HTMLInputElement | null;
        const sAddr = doc.getElementById('addressLine') as HTMLTextAreaElement | null;
        const sSub = doc.getElementById('subDistrict') as HTMLInputElement | null;
        const sDist = doc.getElementById('district') as HTMLInputElement | null;
        const sProv = doc.getElementById('province') as HTMLSelectElement | null;
        const sZip = doc.getElementById('postalCode') as HTMLInputElement | null;

        if (sFirst) sFirst.value = addr.firstName || '';
        if (sLast) sLast.value = addr.lastName || '';
        if (sPhone) sPhone.value = addr.phone || '';
        if (sAddr) sAddr.value = addr.addressLine1 || '';
        if (sSub) sSub.value = addr.subdistrict || '';
        if (sDist) sDist.value = addr.district || '';
        if (sProv) sProv.value = addr.province || '';
        if (sZip) sZip.value = addr.postalCode || '';
      }

      const shippingForm = doc.getElementById('shippingAddressForm');
      shippingForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sFirst = (doc.getElementById('shippingFirstName') as HTMLInputElement)?.value.trim() || '';
        const sLast = (doc.getElementById('shippingLastName') as HTMLInputElement)?.value.trim() || '';
        const sPhone = (doc.getElementById('shippingPhone') as HTMLInputElement)?.value.trim() || '';
        const sAddr = (doc.getElementById('addressLine') as HTMLTextAreaElement)?.value.trim() || '';
        const sSub = (doc.getElementById('subDistrict') as HTMLInputElement)?.value.trim() || '';
        const sDist = (doc.getElementById('district') as HTMLInputElement)?.value.trim() || '';
        const sProv = (doc.getElementById('province') as HTMLSelectElement)?.value.trim() || '';
        const sZip = (doc.getElementById('postalCode') as HTMLInputElement)?.value.trim() || '';
        const toast = doc.getElementById('shippingStatusToast');
        const toastMsg = doc.getElementById('shippingStatusMessage');

        try {
          await auth.updateDefaultShippingAddress({
            firstName: sFirst,
            lastName: sLast,
            phone: sPhone,
            addressLine1: sAddr,
            subdistrict: sSub,
            district: sDist,
            province: sProv,
            postalCode: sZip,
          });
          if (toast && toastMsg) {
            toastMsg.textContent = 'บันทึกที่อยู่จัดส่งเรียบร้อยแล้ว';
            toast.classList.remove('hidden');
            setTimeout(() => toast.classList.add('hidden'), 3000);
          }
        } catch (err: any) {
          if (toast && toastMsg) {
            toastMsg.textContent = err?.message || 'เกิดข้อผิดพลาดในการบันทึก';
            toast.classList.remove('hidden');
          }
        }
      });
    }

    // --- Cart Screen Wiring ---
    if (location.pathname === '/cart') {
      removeStorefrontTestModeUI(doc);
      renderCartScreen(doc, win, cart);

      // Cart Item Stepper Actions
      doc.addEventListener('click', async (e) => {
        const target = (e.target as HTMLElement).closest('[data-cart-action]') as HTMLElement | null;
        if (!target) return;

        const action = target.getAttribute('data-cart-action');
        const cartId = target.getAttribute('data-cart-id');
        if (!cartId || !action) return;

        const effective = createEffectiveCart(cart);
        const existing = effective.items.find((i) => i.id === cartId);
        if (!existing) return;

        let nextItems = effective.items;

        if (action === 'increase') {
          nextItems = updatePersistedCartQuantity(
            cartId,
            existing.quantity + 1
          );
        } else if (action === 'decrease') {
          if (existing.quantity > 1) {
            nextItems = updatePersistedCartQuantity(
              cartId,
              existing.quantity - 1
            );
          } else {
            nextItems = removePersistedCartItem(cartId);
          }
        } else if (action === 'remove') {
          nextItems = removePersistedCartItem(cartId);
        }

        renderCartScreen(
          doc,
          win,
          {
            ...cart,
            items: nextItems,
            itemCount: nextItems.reduce(
              (sum, item) => sum + item.quantity,
              0
            ),
            subtotal: nextItems.reduce(
              (sum, item) =>
                sum + item.unitPrice * item.quantity,
              0
            ),
          }
        );

        updateAllCartBadges(
          doc,
          nextItems.reduce(
            (sum, item) => sum + item.quantity,
            0
          )
        );
      });

      win.handleCheckout = () => {
        const effective = createEffectiveCart(cart);

        if (effective.items.length > 0) {
          navigate('/checkout', {
            state: {
              soulmateCartItems: effective.items,
            },
          });
        }
      };
    }

    // --- Checkout Screen Wiring ---
    if (location.pathname === '/checkout') {
      configureCheckoutPaymentMethods(doc);
      renderCheckoutSummary(doc, win, cart);
      attachCheckoutEditListeners(doc);
      populateCheckoutFromDoc(doc, auth.customerProfile, auth.user?.email);
      const demoOrdersEnabled = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
      const checkoutTestEnabled = import.meta.env.VITE_CHECKOUT_TEST_MODE_ENABLED === 'true';
      const orderSubmitEnabled = demoOrdersEnabled || checkoutTestEnabled;
      const checkoutNotice = doc.createElement('p');
      checkoutNotice.id = 'checkoutPaymentUnavailable';
      checkoutNotice.className = 'text-[11px] text-amber-800 text-center px-3 pb-2';
      checkoutNotice.textContent = 'โหมดทดสอบจะบันทึกคำสั่งซื้อเป็นรอชำระเงินเท่านั้น ยังไม่เปิดการจ่ายเงิน';
      const existingCheckoutNotice = doc.getElementById('checkoutPaymentUnavailable');
      if (existingCheckoutNotice) existingCheckoutNotice.textContent = checkoutNotice.textContent;
      else doc.getElementById('stickyCheckoutBar')?.prepend(checkoutNotice);
      const orderSubmitButton = doc.getElementById('btnSubmitOrder') as HTMLButtonElement | null;
      if (orderSubmitButton && !orderSubmitEnabled) {
        orderSubmitButton.disabled = true;
        orderSubmitButton.title = 'ยังไม่เปิดการบันทึกคำสั่งซื้อทดสอบ';
      }
      const showCheckoutMessage = (message: string) => {
        const toast = doc.getElementById('toastNotification');
        const text = doc.getElementById('toastText');
        if (text) text.textContent = message;
        if (!toast) return;
        toast.classList.remove('opacity-0', 'translate-y-2');
        toast.classList.add('opacity-100', 'translate-y-0');
        win.setTimeout(() => {
          toast.classList.add('opacity-0', 'translate-y-2');
          toast.classList.remove('opacity-100', 'translate-y-0');
        }, 3500);
      };
      let placingOrder = false;
      win.handlePlaceOrder = async () => {
        if (placingOrder) return;
        const effectiveCart = createEffectiveCart(cart);
        const read = (id: string) => (doc.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null)?.value.trim() || '';
        const contact = {
          firstName: read('custFirstName'),
          lastName: read('custLastName'),
          phone: read('custPhone'),
          email: read('custEmail'),
          addressLine1: read('shipAddress'),
          subdistrict: read('shipSubdistrict'),
          district: read('shipDistrict'),
          province: read('shipProvince'),
          postalCode: read('shipZip'),
        };
        const required = [
          ['custFirstName', contact.firstName], ['custLastName', contact.lastName],
          ['custPhone', contact.phone], ['custEmail', contact.email],
          ['shipAddress', contact.addressLine1], ['shipSubdistrict', contact.subdistrict],
          ['shipDistrict', contact.district], ['shipProvince', contact.province], ['shipZip', contact.postalCode],
        ] as const;
        const missing = required.find(([, value]) => !value);
        if (missing || !/^\S+@\S+\.\S+$/.test(contact.email)) {
          const invalidId = missing?.[0] ?? 'custEmail';
          const invalid = doc.getElementById(invalidId) as HTMLInputElement | HTMLTextAreaElement | null;
          invalid?.focus();
          const message = !contact.email || !/^\S+@\S+\.\S+$/.test(contact.email)
            ? 'กรุณากรอกอีเมลให้ถูกต้อง'
            : 'กรุณากรอกข้อมูลติดต่อและที่อยู่จัดส่งให้ครบถ้วน';
          showCheckoutMessage(message);
          return;
        }
        if (effectiveCart.items.length === 0) return;
        if (!orderSubmitEnabled) {
          showCheckoutMessage('ยังไม่เปิดการบันทึกคำสั่งซื้อทดสอบ');
          return;
        }
        placingOrder = true;
        const submit = doc.getElementById('btnSubmitOrder') as HTMLButtonElement | null;
        const submitText = doc.getElementById('submitText');
        doc.getElementById('checkoutSubmissionError')?.remove();
        if (submit) submit.disabled = true;
        if (submitText) submitText.textContent = 'กำลังบันทึกคำสั่งซื้อ…';
        try {
          const result = await createPendingOrder(effectiveCart.items, contact);
          replaceCartItems([]);
          clearPendingOrderRequestKey();
          if (result.ownerType === 'guest' && !result.replay) {
            sessionStorage.setItem('soulmate_email_demo_order', result.orderId);
          }
          navigate(`/order-success?orderId=${encodeURIComponent(result.orderId)}`);
        } catch (error) {
          if (error instanceof OrderReviewError && error.currentItems) {
            const updatedItems = effectiveCart.items.map((item) => {
              const current = error.currentItems?.find((candidate) => candidate.productId === item.productId && candidate.variantId === item.variantId);
              return current ? { ...item, productName: current.productName, variantName: current.variantName, unitPrice: current.unitPriceSatang / 100 } : item;
            });
            replaceCartItems(updatedItems);
            renderCheckoutSummary(doc, win, createEffectiveCart(cart));
            showCheckoutMessage('ราคาสินค้าเปลี่ยนแล้ว ปรับยอดใหม่ให้ตรวจสอบก่อนยืนยันอีกครั้ง');
          } else {
            const message = orderFailureMessage(error);
            const inlineError = doc.createElement('p');
            inlineError.id = 'checkoutSubmissionError';
            inlineError.setAttribute('role', 'alert');
            inlineError.className = 'rounded-xl bg-red-50 p-3 text-center text-xs text-red-800';
            inlineError.textContent = message;
            doc.getElementById('stickyCheckoutBar')?.prepend(inlineError);
            showCheckoutMessage(message);
          }
          if (submit) submit.disabled = false;
          if (submitText) submitText.textContent = 'ยืนยันคำสั่งซื้อ';
        } finally {
          placingOrder = false;
        }
      };
    }

    if (location.pathname === '/admin/dashboard') {
      const dashboardState = doc.getElementById('dashboard-state');
      const dashboardContent = doc.getElementById('dashboard-content');
      const periodSelect = doc.querySelector<HTMLSelectElement>('#dashboard-period');
      const paidSales = doc.getElementById('dashboard-paid-sales');
      const pendingCount = doc.getElementById('dashboard-pending-count');
      const orderCount = doc.getElementById('dashboard-order-count');
      const chart = doc.getElementById('dashboard-chart');
      const ordersBody = doc.getElementById('dashboard-orders-body');
      let dashboardOrders: Awaited<ReturnType<typeof listAdminOrders>> = [];

      const dateForOrder = (order: (typeof dashboardOrders)[number]) => {
        try { return order.createdAt?.toDate?.() ?? null; } catch { return null; }
      };
      const isPaid = (order: (typeof dashboardOrders)[number]) =>
        order.status === 'paid' || order.payment?.status === 'successful';
      const getPeriod = () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const period = periodSelect?.value ?? 'today';
        if (period === '7d') start.setDate(start.getDate() - 6);
        if (period === '30d') start.setDate(start.getDate() - 29);
        if (period === 'month') start.setDate(1);
        const days = Math.max(1, Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - start.getTime()) / 86400000) + 1);
        const labels: Record<string, string> = { today: 'วันนี้', '7d': '7 วันล่าสุด', '30d': '30 วันล่าสุด', month: 'เดือนนี้' };
        return { start, days, label: labels[period] ?? labels.today };
      };
      const formatMoney = (satang: number) => `฿${(satang / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
      const formatDate = (date: Date | null) => date ? date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';

      const renderDashboard = () => {
        if (!paidSales || !pendingCount || !orderCount || !chart || !ordersBody) return;
        const { start, days, label } = getPeriod();
        const end = new Date();
        const withinPeriod = dashboardOrders.filter((order) => {
          const date = dateForOrder(order);
          return !!date && date >= start && date <= end;
        });
        const paidOrders = withinPeriod.filter(isPaid);
        const waitingOrders = withinPeriod.filter((order) => order.status === 'pending_payment' && !isPaid(order));
        paidSales.textContent = formatMoney(paidOrders.reduce((total, order) => total + (order.totalSatang || 0), 0));
        pendingCount.textContent = waitingOrders.length.toLocaleString('th-TH');
        orderCount.textContent = withinPeriod.length.toLocaleString('th-TH');
        const periodLabel = doc.getElementById('dashboard-period-label');
        if (periodLabel) periodLabel.textContent = label;

        const dailySales = Array.from({ length: days }, () => 0);
        paidOrders.forEach((order) => {
          const date = dateForOrder(order);
          if (!date) return;
          const index = Math.floor((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - start.getTime()) / 86400000);
          if (index >= 0 && index < dailySales.length) dailySales[index] += order.totalSatang || 0;
        });
        const maxValue = Math.max(...dailySales);
        if (!maxValue) {
          chart.innerHTML = '<div class="dashboard-chart-empty">ยังไม่มีรายการชำระในช่วงนี้</div>';
        } else {
          const left = 14, right = 586, top = 18, bottom = 166;
          const points = dailySales.map((value, index) => {
            const x = days === 1 ? (left + right) / 2 : left + index * (right - left) / (days - 1);
            const y = bottom - value / maxValue * (bottom - top);
            return `${x},${y}`;
          });
          const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svg.setAttribute('viewBox', '0 0 600 190');
          svg.setAttribute('role', 'img');
          svg.setAttribute('aria-label', `ยอดขาย ${label} ${formatMoney(paidOrders.reduce((total, order) => total + (order.totalSatang || 0), 0))}`);
          [top, (top + bottom) / 2, bottom].forEach((y) => {
            const line = doc.createElementNS(svg.namespaceURI, 'line');
            line.setAttribute('x1', String(left)); line.setAttribute('x2', String(right));
            line.setAttribute('y1', String(y)); line.setAttribute('y2', String(y));
            line.setAttribute('stroke', '#edf1ed'); line.setAttribute('stroke-width', '1');
            svg.appendChild(line);
          });
          const path = doc.createElementNS(svg.namespaceURI, 'polyline');
          path.setAttribute('points', points.join(' ')); path.setAttribute('fill', 'none');
          path.setAttribute('stroke', '#3d8063'); path.setAttribute('stroke-width', '3');
          path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
          svg.appendChild(path);
          dailySales.forEach((value, index) => {
            if (!value) return;
            const [cx, cy] = points[index].split(',');
            const dot = doc.createElementNS(svg.namespaceURI, 'circle');
            dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('r', '4');
            dot.setAttribute('fill', '#3d8063'); dot.setAttribute('stroke', '#fff'); dot.setAttribute('stroke-width', '2');
            svg.appendChild(dot);
          });
          chart.replaceChildren(svg);
        }

        ordersBody.replaceChildren();
        [...withinPeriod].sort((a, b) => (dateForOrder(b)?.getTime() ?? 0) - (dateForOrder(a)?.getTime() ?? 0)).slice(0, 8).forEach((order) => {
          const row = doc.createElement('tr');
          const orderCell = doc.createElement('td');
          const orderLink = doc.createElement('a');
          orderLink.href = `/admin/orders/${encodeURIComponent(order.id)}`;
          orderLink.textContent = order.orderNumber || order.id;
          orderCell.appendChild(orderLink); row.appendChild(orderCell);
          const customer = `${order.contact?.firstName ?? ''} ${order.contact?.lastName ?? ''}`.trim() || 'ลูกค้าทั่วไป';
          [formatDate(dateForOrder(order)), customer, formatMoney(order.totalSatang || 0)].forEach((value) => {
            const cell = doc.createElement('td'); cell.textContent = value; row.appendChild(cell);
          });
          const statusCell = doc.createElement('td');
          const badge = doc.createElement('span'); badge.className = 'dashboard-status';
          if (isPaid(order)) { badge.textContent = 'ชำระแล้ว'; badge.dataset.status = 'paid'; }
          else if (order.status === 'pending_payment') { badge.textContent = 'รอชำระ'; badge.dataset.status = 'pending'; }
          else if (order.status === 'expired' || order.payment?.status === 'expired') { badge.textContent = 'หมดอายุ'; badge.dataset.status = 'failed'; }
          else { badge.textContent = 'ไม่สำเร็จ'; badge.dataset.status = 'failed'; }
          statusCell.appendChild(badge); row.appendChild(statusCell); ordersBody.appendChild(row);
        });
        if (!withinPeriod.length) {
          const row = doc.createElement('tr'); const cell = doc.createElement('td');
          cell.colSpan = 5; cell.textContent = 'ไม่มีออเดอร์ในช่วงนี้';
          cell.style.cssText = 'padding:28px 12px;text-align:center;color:#78827c';
          row.appendChild(cell); ordersBody.appendChild(row);
        }
      };

      if (dashboardState && dashboardContent) {
        const loadDashboard = async () => {
          dashboardState.hidden = false;
          dashboardState.dataset.kind = '';
          dashboardState.textContent = 'กำลังโหลดข้อมูล…';
          dashboardContent.hidden = true;
          try {
            dashboardOrders = await listAdminOrders();
            dashboardState.hidden = true;
            dashboardContent.hidden = false;
            renderDashboard();
          } catch (error) {
            console.error('[SOULMATE Orders] Dashboard orders failed:', error);
            dashboardState.dataset.kind = 'error';
            dashboardState.replaceChildren(doc.createTextNode('โหลดข้อมูลไม่สำเร็จ '));
            const retry = doc.createElement('button');
            retry.type = 'button'; retry.textContent = 'ลองอีกครั้ง';
            retry.className = 'dashboard-link';
            retry.addEventListener('click', () => void loadDashboard());
            dashboardState.appendChild(retry);
          }
        };
        periodSelect?.addEventListener('change', renderDashboard);
        void loadDashboard();
      }
    }

    // =========================================================================
    // STEP 21.4B: ADMIN PRODUCT CRUD & STOREFRONT PRODUCTS
    // =========================================================================

    // --- Admin Product List Wiring (/admin/products) ---
    if (location.pathname === '/admin/products') {
      const docAny = doc as any;
      if (docAny.__adminProductsUnsub) {
        docAny.__adminProductsUnsub();
        docAny.__adminProductsUnsub = null;
      }

      const tbody = doc.querySelector('table tbody');
      const countDisplay = doc.querySelector('.p-space-md strong:nth-of-type(3)');
      const rangeDisplay = doc.querySelector('.p-space-md span');

      const renderProductsRows = async (products: Product[]) => {
        if (countDisplay) countDisplay.textContent = `${products.length}`;
        if (rangeDisplay && products.length > 0) {
          rangeDisplay.innerHTML = `แสดง <strong class="text-on-surface font-semibold">1</strong> ถึง <strong class="text-on-surface font-semibold">${products.length}</strong> จากทั้งหมด <strong class="text-on-surface font-semibold">${products.length}</strong> รายการ`;
        } else if (rangeDisplay) {
          rangeDisplay.innerHTML = `แสดง <strong class="text-on-surface font-semibold">0</strong> ถึง <strong class="text-on-surface font-semibold">0</strong> จากทั้งหมด <strong class="text-on-surface font-semibold">${products.length}</strong> รายการ`;
        }

        if (!tbody) return;

        if (products.length === 0) {
          tbody.innerHTML = `
            <tr>
              <td class="py-space-xl px-space-md" colspan="8">
                <div class="max-w-md mx-auto flex flex-col items-center text-center py-space-md">
                  <div class="relative w-20 h-20 rounded-full bg-primary-container/60 flex items-center justify-center mb-space-md shadow-inner">
                    <div class="w-14 h-14 rounded-full bg-surface-container-lowest flex items-center justify-center shadow-sm">
                      <span class="material-symbols-outlined text-primary text-[32px]">inventory_2</span>
                    </div>
                    <span class="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-tertiary-container flex items-center justify-center">
                      <span class="material-symbols-outlined text-tertiary text-[14px]">spa</span>
                    </span>
                  </div>
                  <h2 class="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">ยังไม่มีสินค้า</h2>
                  <p class="mt-space-xs font-body-md text-body-md text-secondary leading-relaxed">เริ่มเพิ่มสินค้าแรกของคุณเพื่อเริ่มต้นวางจำหน่ายบนหน้าร้าน SOULMATE</p>
                  <div class="mt-space-lg flex flex-col sm:flex-row items-center gap-space-sm w-full sm:w-auto">
                    <a class="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs px-space-lg py-2.5 rounded-xl bg-tertiary text-on-tertiary hover:opacity-95 font-label-lg text-label-lg shadow-md transition-transform active:scale-[0.98]" href="/admin/products/new">
                      <span class="material-symbols-outlined text-[18px]">add</span>
                      <span>+ เพิ่มสินค้า</span>
                    </a>
                  </div>
                </div>
              </td>
            </tr>
          `;
          return;
        }

        const rows = await Promise.all(
          products.map(async (p) => {
            const statusBadge =
              p.status === 'active'
                ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">วางจำหน่าย</span>'
                : p.status === 'draft'
                ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">แบบร่าง</span>'
                : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">ปิดการขาย</span>';

            const imgUrl = await resolveProductDisplayImage(p);

            const deleteActionBtn =
              p.status === 'draft'
                ? `<button data-delete-product-id="${p.id}" data-product-name="${escapeHtml(p.name)}" data-status="draft" type="button" class="w-9 h-9 inline-flex items-center justify-center rounded-lg text-error hover:bg-error-container/30 transition-colors cursor-pointer select-none" title="ลบสินค้าแบบร่าง">
                    <span class="material-symbols-outlined text-[18px] pointer-events-none">delete</span>
                  </button>`
                : `<button data-disabled-delete-btn="true" data-product-id="${p.id}" data-status="${p.status}" type="button" class="w-9 h-9 inline-flex items-center justify-center rounded-lg text-outline-variant/40 cursor-not-allowed opacity-40 select-none" title="ไม่สามารถลบสินค้าที่เผยแพร่แล้วได้">
                    <span class="material-symbols-outlined text-[18px] pointer-events-none">delete</span>
                  </button>`;

            return `
            <tr class="border-b border-surface-container-low hover:bg-surface-container-low/50 transition-colors" data-row-product-id="${p.id}">
              <td class="py-3 px-space-md text-center">
                <div class="w-10 h-10 rounded-lg bg-surface-container-low overflow-hidden mx-auto flex items-center justify-center">
                  ${
                    imgUrl
                      ? `<img src="${imgUrl}" alt="${escapeHtml(p.name)}" class="w-full h-full object-cover" onerror="this.onerror=null; this.classList.add('hidden'); this.nextElementSibling?.classList.remove('hidden');" />
                         <div class="hidden w-full h-full">${renderMissingProductImage()}</div>`
                      : renderMissingProductImage()
                  }
                </div>
              </td>
              <td class="py-3 px-space-md">
                <div class="font-semibold text-on-surface line-clamp-1">${escapeHtml(p.name)}</div>
                <div class="text-xs text-secondary">${escapeHtml(p.slug)}</div>
              </td>
              <td class="py-3 px-space-md text-xs text-secondary font-mono">${p.id.slice(0, 8)}</td>
              <td class="py-3 px-space-md text-right font-semibold text-on-surface">฿${p.price.toLocaleString('th-TH')}</td>
              <td class="py-3 px-space-md text-center text-sm font-medium ${p.stock > 0 ? 'text-on-surface' : 'text-error'}">${p.stock}</td>
              <td class="py-3 px-space-md text-center">${statusBadge}</td>
              <td class="py-3 px-space-md text-xs text-secondary">
                ${p.updatedAt?.toDate ? p.updatedAt.toDate().toLocaleDateString('th-TH') : 'วันนี้'}
              </td>
              <td class="py-3 px-space-md text-right">
                <div class="flex items-center justify-end gap-1">
                  <a href="/admin/products/${p.id}/edit" class="w-9 h-9 inline-flex items-center justify-center rounded-lg text-primary hover:bg-primary-container/30 transition-colors" title="แก้ไข">
                    <span class="material-symbols-outlined text-[18px] pointer-events-none">edit</span>
                  </a>
                  ${deleteActionBtn}
                </div>
              </td>
            </tr>
          `;
          })
        );

        tbody.innerHTML = rows.join('');

        // Wire draft delete button handlers
        tbody.querySelectorAll<HTMLButtonElement>('[data-delete-product-id]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const pId = btn.getAttribute('data-delete-product-id');
            const pName = btn.getAttribute('data-product-name') || 'สินค้าแบบร่าง';
            if (!pId) return;

            showDeleteDraftDialog(doc, pName, async () => {
              try {
                await deleteDraftProduct(pId);
                showAdminToast(doc, 'ลบสินค้าแบบร่างเรียบร้อยแล้ว', 'success');

                // Immediate optimistic DOM removal
                const row = tbody.querySelector(`[data-row-product-id="${pId}"]`);
                if (row) row.remove();
                const remaining = tbody.querySelectorAll('tr[data-row-product-id]').length;
                if (countDisplay) countDisplay.textContent = `${remaining}`;
                if (remaining === 0) {
                  void renderProductsRows([]);
                }
              } catch (err: any) {
                console.error('[SOULMATE Product Delete] Error deleting draft product:', pId, err);
                showAdminToast(doc, 'ไม่สามารถลบสินค้าได้ กรุณาลองใหม่อีกครั้ง', 'error');
                throw err;
              }
            });
          });
        });

        // Wire published / non-draft delete button handlers
        tbody.querySelectorAll<HTMLButtonElement>('[data-disabled-delete-btn]').forEach((btn) => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showAdminToast(doc, 'ไม่สามารถลบสินค้าที่เผยแพร่แล้วได้', 'info');
          });
        });
      };

      try {
        const initialProducts = await getProducts();
        await renderProductsRows(initialProducts);

        // Firestore real-time listener for live sync
        const unsub = subscribeToProducts((liveProducts) => {
          void renderProductsRows(liveProducts);
        });
        docAny.__adminProductsUnsub = unsub;
      } catch (err) {
        console.error('[Admin Products List] Error loading:', err);
        if (tbody) {
          tbody.innerHTML = '<tr><td colspan="8" class="p-6 text-center text-error">ไม่สามารถโหลดรายการสินค้าได้ กรุณาตรวจสิทธิ์ Firestore และลองใหม่</td></tr>';
        }
      }
    }

    // --- Admin Add Product Wiring (/admin/products/new) ---
    if (location.pathname === '/admin/products/new') {
      const nameInput = doc.getElementById('prodName') as HTMLInputElement | null;
      const slugInput = doc.getElementById('prodSlug') as HTMLInputElement | null;
      const descInput = doc.querySelector('#tab-desc textarea') as HTMLTextAreaElement | null;
      const shortDescInput = doc.getElementById('prodShortDesc') as HTMLTextAreaElement | null;
      const priceInput = doc.getElementById('regularPrice') as HTMLInputElement | null;
      const salePriceInput = doc.getElementById('salePrice') as HTMLInputElement | null;
      const stockInput = doc.getElementById('stockQty') as HTMLInputElement | null;
      const categorySelect = doc.getElementById('prodCategory') as HTMLSelectElement | null;
      const variantToggle = doc.getElementById('variantToggle') as HTMLInputElement | null;

      // Stable product document ID for lifetime of form & Storage paths
      if (!newProductIdRef.current && db) {
        newProductIdRef.current = firestoreDoc(collection(db, 'products')).id;
      }
      const targetProductId =
        newProductIdRef.current ||
        (db ? firestoreDoc(collection(db, 'products')).id : `prod_${Date.now()}`);
      newProductIdRef.current = targetProductId;

      // Initialize image upload & previews
      let currentImages: ProductImage[] = [];
      let pendingDeletedImages: ProductImage[] = [];

      wireProductImageUpload(
        doc,
        win,
        targetProductId,
        currentImages,
        (imgs) => {
          currentImages = imgs;
        },
        'add',
        (removedImage) => {
          pendingDeletedImages = [
            ...pendingDeletedImages.filter(
              (img) =>
                (img.storagePath || img.url || img.id) !==
                (removedImage.storagePath || removedImage.url || removedImage.id)
            ),
            removedImage,
          ];
        }
      );

      // Initialize variant manager for add product
      const variantMgr = mountVariantManager({
        doc,
        win,
        productId: targetProductId,
        initialHasVariants: false,
        initialOptionGroups: [],
        initialVariants: [],
        getDefaultPrice: () => parseFloat(priceInput?.value || '0'),
        getDefaultStock: () => parseInt(stockInput?.value || '0', 10),
        getBaseSku: () => (doc.getElementById('prodSku') as HTMLInputElement | null)?.value || '',
        onTotalStockChange: (total, hasVars) => {
          if (stockInput && hasVars) {
            stockInput.value = `${total}`;
          }
        },
      });

      // Auto slug from name
      nameInput?.addEventListener('input', () => {
        if (slugInput && !slugInput.dataset.manualEdited) {
          slugInput.value = generateSlug(nameInput.value);
        }
      });
      slugInput?.addEventListener('input', () => {
        if (slugInput) slugInput.dataset.manualEdited = 'true';
      });

      // Product content tab switching
      const contentTabBtns = doc.querySelectorAll('#contentTabHeader .tab-btn');
      contentTabBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const targetKey = btn.getAttribute('data-target');
          if (!targetKey) return;
          const tabs = ['desc', 'highlights', 'ingredients', 'directions', 'fda'];
          tabs.forEach((key) => {
            const panel = doc.getElementById('tab-' + key);
            if (panel) {
              if (key === targetKey) {
                panel.classList.remove('hidden');
              } else {
                panel.classList.add('hidden');
              }
            }
          });
          contentTabBtns.forEach((b) => {
            if (b === btn) {
              b.classList.add('bg-surface-container-lowest', 'text-on-surface', 'shadow-sm', 'font-semibold');
              b.classList.remove('text-secondary');
            } else {
              b.classList.remove('bg-surface-container-lowest', 'text-on-surface', 'shadow-sm', 'font-semibold');
              b.classList.add('text-secondary');
            }
          });
        });
      });

      const handleSave = async (targetStatus: ProductStatus) => {
        const payload = buildProductPayload(doc, variantMgr, currentImages);

        // Validation
        if (targetStatus === 'active') {
          const valRes = validateForPublish(payload, variantMgr);
          if (!valRes.isValid) {
            console.warn('[SOULMATE Product Publish] Validation failed:', valRes.errors);
            win.alert('ไม่สามารถเผยแพร่สินค้าได้ กรุณาตรวจสอบข้อมูลที่จำเป็น:\n• ' + valRes.errors.join('\n• '));
            if (!payload.name && nameInput) {
              nameInput.focus();
              nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if ((isNaN(payload.price) || payload.price <= 0) && priceInput) {
              priceInput.focus();
              priceInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if ((payload.shipping?.weight ?? 0) <= 0) {
              const weightInput = doc.getElementById('shippingWeight') as HTMLInputElement | null;
              weightInput?.focus();
              weightInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (!payload.hasVariants && (isNaN(payload.stock) || payload.stock < 0) && stockInput) {
              stockInput.focus();
              stockInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
          }
        } else {
          // Minimal validation for Draft: only name required to identify document
          if (!payload.name) {
            win.alert('กรุณากรอกชื่อสินค้าอย่างน้อยเพื่อบันทึกแบบร่าง');
            nameInput?.focus();
            return;
          }
        }

        try {
          await createProduct(
            {
              ...payload,
              status: targetStatus,
            },
            targetProductId
          );

          // Firestore save succeeded. Now remove files that the user deleted
          // from the form so Storage and Firestore stay in sync.
          if (pendingDeletedImages.length > 0) {
            await deleteProductImageFiles(
              targetProductId,
              pendingDeletedImages
            );
            pendingDeletedImages = [];
          }

          newProductIdRef.current = null;
          if (targetStatus === 'active') {
            win.alert('เผยแพร่สินค้าเรียบร้อยแล้ว');
          } else {
            win.alert('บันทึกแบบร่างเรียบร้อยแล้ว');
          }
          navigate('/admin/products');
        } catch (err: any) {
          console.error('[Admin Add Product] Error:', err);
          win.alert('เกิดข้อผิดพลาดในการบันทึก: ' + (err?.message || 'โปรดลองอีกครั้ง'));
        }
      };

      // Wire action buttons for add product
      const btnSaveDraftAdd = doc.getElementById('btnSaveDraft');
      const btnPublishAdd = doc.getElementById('btnPublishProduct');

      if (btnSaveDraftAdd) {
        btnSaveDraftAdd.addEventListener('click', (e) => {
          e.preventDefault();
          handleSave('draft');
        });
      }
      if (btnPublishAdd) {
        btnPublishAdd.addEventListener('click', (e) => {
          e.preventDefault();
          handleSave('active');
        });
      }

      doc.querySelectorAll('button').forEach((b) => {
        if (b === btnSaveDraftAdd || b === btnPublishAdd) return;
        const text = b.textContent || '';
        if (text.includes('บันทึกแบบร่าง')) {
          b.addEventListener('click', (e) => {
            e.preventDefault();
            handleSave('draft');
          });
        } else if (text.includes('เผยแพร่สินค้า')) {
          b.addEventListener('click', (e) => {
            e.preventDefault();
            handleSave('active');
          });
        }
      });
    }

    // --- Admin Edit Product Wiring (/admin/products/:productId/edit) ---
    if (location.pathname.startsWith('/admin/products/') && location.pathname.endsWith('/edit')) {
      const parts = location.pathname.split('/');
      const productId = parts[3];

      if (productId) {
        try {
          const loadingEl = doc.getElementById('productLoading');
          const notFoundEl = doc.getElementById('productNotFound');
          const formEl = doc.getElementById('productEditForm');

          const product = await getProductById(productId);

          if (!product) {
            if (loadingEl) loadingEl.style.display = 'none';
            if (formEl) formEl.style.display = 'none';
            if (notFoundEl) notFoundEl.style.display = 'flex';
            const btnSaveDraft = doc.getElementById('btnSaveDraft') as HTMLButtonElement | null;
            const btnPublish = doc.getElementById('btnPublishProduct') as HTMLButtonElement | null;
            if (btnSaveDraft) btnSaveDraft.style.display = 'none';
            if (btnPublish) btnPublish.style.display = 'none';
            return;
          }

          // Show form and hide loading
          if (loadingEl) loadingEl.style.display = 'none';
          if (notFoundEl) notFoundEl.style.display = 'none';
          if (formEl) {
            formEl.style.display = 'grid';
            formEl.classList.remove('hidden');
          }

          const breadcrumbEl = doc.getElementById('breadcrumbProductId');
          if (breadcrumbEl) {
            breadcrumbEl.textContent = `#${product.sku || product.id.slice(0, 8).toUpperCase()}`;
          }

          const nameInput = (doc.getElementById('prodName') || doc.querySelector('input[placeholder*="ระบุชื่อ"]')) as HTMLInputElement | null;
          const priceInput = (doc.getElementById('regularPrice') || doc.querySelector('input[placeholder*="ราคาปกติ"]')) as HTMLInputElement | null;
          const salePriceInput = (doc.getElementById('salePrice') || doc.querySelector('input[placeholder*="ราคาพิเศษ"]')) as HTMLInputElement | null;
          const stockInput = (doc.getElementById('stockQty') || doc.querySelector('input[placeholder*="จำนวนสต็อก"]')) as HTMLInputElement | null;
          const lowStockInput = doc.getElementById('lowStockThreshold') as HTMLInputElement | null;
          const descInput = (doc.getElementById('prodDescription') || doc.querySelector('textarea[name="description"]')) as HTMLTextAreaElement | null;
          const shortDescInput = (doc.getElementById('prodShortDesc') || doc.querySelector('textarea[name="shortDescription"]')) as HTMLTextAreaElement | null;
          const highlightsInput = (doc.getElementById('prodHighlights') || doc.querySelector('textarea[name="highlights"]')) as HTMLTextAreaElement | null;
          const ingredientsInput = (doc.getElementById('prodIngredients') || doc.querySelector('textarea[name="ingredients"]')) as HTMLTextAreaElement | null;
          const usageInput = (doc.getElementById('prodUsage') || doc.querySelector('textarea[name="usageInstructions"]')) as HTMLTextAreaElement | null;
          const slugInput = (doc.getElementById('prodSlug') || doc.querySelector('input[name="slug"]')) as HTMLInputElement | null;
          const skuInput = (doc.getElementById('prodSku') || doc.querySelector('input[name="sku"]')) as HTMLInputElement | null;
          const mfgCountryInput = (doc.getElementById('mfgCountry') || doc.querySelector('input[name="countryOfOrigin"]')) as HTMLInputElement | null;
          const shelfLifeInput = (doc.getElementById('shelfLife') || doc.querySelector('input[name="shelfLife"]')) as HTMLInputElement | null;

          // Pure Firestore values - no hardcoded demo values
          if (nameInput) nameInput.value = product.name || '';
          if (priceInput) priceInput.value = (product.price !== undefined && product.price !== null) ? `${product.price}` : '';
          if (salePriceInput) salePriceInput.value = (product.compareAtPrice !== undefined && product.compareAtPrice !== null) ? `${product.compareAtPrice}` : '';
          if (stockInput) stockInput.value = (product.stock !== undefined && product.stock !== null) ? `${product.stock}` : '';
          if (lowStockInput) lowStockInput.value = (product.lowStockThreshold !== undefined && product.lowStockThreshold !== null) ? `${product.lowStockThreshold}` : '';
          if (descInput) descInput.value = product.description || '';
          if (shortDescInput) shortDescInput.value = product.shortDescription || '';
          if (highlightsInput) highlightsInput.value = product.highlights || '';
          if (ingredientsInput) ingredientsInput.value = product.ingredients || '';
          if (usageInput) usageInput.value = product.usageInstructions || '';
          if (slugInput) slugInput.value = product.slug || '';
          if (skuInput) skuInput.value = product.sku || '';
          if (mfgCountryInput) mfgCountryInput.value = product.countryOfOrigin || '';
          if (shelfLifeInput) shelfLifeInput.value = product.shelfLife || '';

          // Live Character counter for product name
          const nameCharCount = doc.getElementById('nameCharCount');
          const updateCharCount = () => {
            if (nameCharCount) nameCharCount.textContent = `${nameInput?.value.length || 0} / 120 ตัวอักษร`;
          };
          updateCharCount();
          nameInput?.addEventListener('input', updateCharCount);

          // Live SEO Preview Snippet Card
          const seoPreviewUrl = doc.getElementById('seoPreviewUrl');
          const seoPreviewTitle = doc.getElementById('seoPreviewTitle');
          const seoPreviewDesc = doc.getElementById('seoPreviewDesc');
          const updateSeoPreview = () => {
            const currentSlug = slugInput?.value.trim() || product.slug || productId;
            const currentName = nameInput?.value.trim() || product.name || 'ชื่อสินค้า';
            const currentDesc = shortDescInput?.value.trim() || descInput?.value.trim() || product.shortDescription || 'คำอธิบายสินค้าจะแสดงที่นี่';
            if (seoPreviewUrl) seoPreviewUrl.textContent = `https://soulmate.co.th/products/${currentSlug}`;
            if (seoPreviewTitle) seoPreviewTitle.textContent = `${currentName} | SOULMATE`;
            if (seoPreviewDesc) seoPreviewDesc.textContent = currentDesc;
          };
          updateSeoPreview();
          nameInput?.addEventListener('input', updateSeoPreview);
          slugInput?.addEventListener('input', updateSeoPreview);
          shortDescInput?.addEventListener('input', updateSeoPreview);
          descInput?.addEventListener('input', updateSeoPreview);

          // Shipping fields population
          const weightInput = doc.getElementById('shippingWeight') as HTMLInputElement | null;
          const weightUnitSelect = doc.getElementById('shippingWeightUnit') as HTMLSelectElement | null;
          const heightInput = doc.getElementById('shippingHeight') as HTMLInputElement | null;
          const widthInput = doc.getElementById('shippingWidth') as HTMLInputElement | null;
          const lengthInput = doc.getElementById('shippingLength') as HTMLInputElement | null;
          const codToggle = doc.getElementById('codToggle') as HTMLInputElement | null;

          if (product.shipping) {
            if (weightInput && product.shipping.weight !== undefined && product.shipping.weight !== null) {
              weightInput.value = `${product.shipping.weight}`;
            }
            if (weightUnitSelect && product.shipping.weightUnit) {
              weightUnitSelect.value = product.shipping.weightUnit;
            }
            if (heightInput && product.shipping.dimensions?.height != null) {
              heightInput.value = `${product.shipping.dimensions.height}`;
            }
            if (widthInput && product.shipping.dimensions?.width != null) {
              widthInput.value = `${product.shipping.dimensions.width}`;
            }
            if (lengthInput && product.shipping.dimensions?.length != null) {
              lengthInput.value = `${product.shipping.dimensions.length}`;
            }
            if (codToggle) {
              codToggle.checked = product.shipping.codEnabled !== false;
            }
          }

          // FDA registration number field population
          const fdaInput = (doc.getElementById('fdaRegistrationNumber') || doc.getElementById('fdaNumber')) as HTMLInputElement | null;
          if (fdaInput) {
            fdaInput.value = product.fdaRegistrationNumber || '';
          }

          // Wire image upload & previews for edit product
          let currentImages: ProductImage[] = Array.isArray(product.images)
            ? [...product.images]
            : [];
          let pendingDeletedImages: ProductImage[] = [];

          wireProductImageUpload(
            doc,
            win,
            productId,
            currentImages,
            (imgs) => {
              currentImages = imgs;
            },
            'edit',
            (removedImage) => {
              pendingDeletedImages = [
                ...pendingDeletedImages.filter(
                  (img) =>
                    (img.storagePath || img.url || img.id) !==
                    (removedImage.storagePath || removedImage.url || removedImage.id)
                ),
                removedImage,
              ];
            }
          );

          // Initialize variant manager for edit product
          const variantMgr = mountVariantManager({
            doc,
            win,
            productId,
            initialHasVariants: !!product.hasVariants,
            initialOptionGroups: product.optionGroups || [],
            initialVariants: product.variants || [],
            getDefaultPrice: () => parseFloat(priceInput?.value || `${product.price}`),
            getDefaultStock: () => parseInt(stockInput?.value || `${product.stock}`, 10),
            getBaseSku: () => (doc.getElementById('prodSku') as HTMLInputElement | null)?.value || product.sku || '',
            onTotalStockChange: (total, hasVars) => {
              if (stockInput && hasVars) {
                stockInput.value = `${total}`;
              }
            },
          });

          const handleUpdate = async (targetStatus: ProductStatus) => {
            const payload = buildProductPayload(doc, variantMgr, currentImages, product.slug);

            if (targetStatus === 'active') {
              const valRes = validateForPublish(payload, variantMgr);
              if (!valRes.isValid) {
                console.warn('[SOULMATE Product Publish] Validation failed:', valRes.errors);
                win.alert('ไม่สามารถเผยแพร่สินค้าได้ กรุณาตรวจสอบข้อมูลที่จำเป็น:\n• ' + valRes.errors.join('\n• '));
                if (!payload.name && nameInput) {
                  nameInput.focus();
                  nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if ((isNaN(payload.price) || payload.price <= 0) && priceInput) {
                  priceInput.focus();
                  priceInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if ((payload.shipping?.weight ?? 0) <= 0) {
                  const weightInput = doc.getElementById('shippingWeight') as HTMLInputElement | null;
                  weightInput?.focus();
                  weightInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else if (!payload.hasVariants && (isNaN(payload.stock) || payload.stock < 0) && stockInput) {
                  stockInput.focus();
                  stockInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
              }
            } else {
              // Minimal validation for Draft: requires name to keep draft identified
              if (!payload.name) {
                win.alert('กรุณากรอกชื่อสินค้าอย่างน้อยเพื่อบันทึกแบบร่าง');
                nameInput?.focus();
                return;
              }
            }

            try {
              await updateProduct(productId, {
                ...payload,
                status: targetStatus,
              });

              // Firestore is updated first. Only then physically remove files
              // that are no longer referenced by this product.
              if (pendingDeletedImages.length > 0) {
                await deleteProductImageFiles(
                  productId,
                  pendingDeletedImages
                );
                pendingDeletedImages = [];
              }

              if (targetStatus === 'active') {
                win.alert('เผยแพร่สินค้าเรียบร้อยแล้ว');
              } else {
                win.alert('บันทึกแบบร่างเรียบร้อยแล้ว');
              }
              navigate('/admin/products');
            } catch (err: any) {
              win.alert('เกิดข้อผิดพลาดในการอัปเดต: ' + err.message);
            }
          };

          // Wire action buttons for edit product
          const btnSaveDraftEdit = doc.getElementById('btnSaveDraft');
          const btnPublishEdit = doc.getElementById('btnPublishProduct');

          if (btnSaveDraftEdit) {
            btnSaveDraftEdit.addEventListener('click', (e) => {
              e.preventDefault();
              handleUpdate('draft');
            });
          }
          if (btnPublishEdit) {
            btnPublishEdit.addEventListener('click', (e) => {
              e.preventDefault();
              handleUpdate('active');
            });
          }

          doc.querySelectorAll('button').forEach((b) => {
            if (b === btnSaveDraftEdit || b === btnPublishEdit) return;
            const txt = b.textContent || '';
            if (txt.includes('บันทึกแบบร่าง')) {
              b.addEventListener('click', (e) => {
                e.preventDefault();
                handleUpdate('draft');
              });
            } else if (txt.includes('เผยแพร่สินค้า') || txt.includes('บันทึกการเปลี่ยนแปลง')) {
              b.addEventListener('click', (e) => {
                e.preventDefault();
                handleUpdate('active');
              });
            }
          });
        } catch (err) {
          console.error('[Admin Edit Product] Error:', err);
        }
      }
    }

    // --- Storefront Catalog Wiring (/products) ---
    if (location.pathname === '/products') {
      const initialGrid = doc.getElementById('state-grid');
      const initialList = doc.getElementById('state-list');
      if (initialGrid) initialGrid.innerHTML = '';
      if (initialList) initialList.innerHTML = '';
      const countLabel = doc.getElementById('product-count-label');
      if (countLabel) countLabel.textContent = 'กำลังโหลดสินค้า…';
      const loadingSec = doc.getElementById('state-loading');
      loadingSec?.classList.remove('hidden');
      try {
        const activeProducts = await getProducts({ status: 'active' });
        const searchQuery = new URLSearchParams(location.search)
          .get('search')
          ?.trim()
          .toLocaleLowerCase('th-TH') || '';
        const selectedCategoryId = new URLSearchParams(location.search).get('category') || '';
        const visibleProducts = activeProducts.filter((product) => {
          if (selectedCategoryId && product.categoryId !== selectedCategoryId) return false;
          if (!searchQuery) return true;
              const details = product as any;
              const highlights = Array.isArray(details.highlights)
                ? details.highlights.join(' ')
                : '';
              const searchText = [
                product.name,
                details.description,
                details.category,
                details.categoryName,
                product.categoryName,
                highlights,
                product.ingredients,
              ]
                .filter(Boolean)
                .join(' ')
                .toLocaleLowerCase('th-TH');
              return searchText.includes(searchQuery);
        });

        const categoryBar = doc.createElement('nav');
        categoryBar.className = 'soulmate-category-filters';
        categoryBar.setAttribute('aria-label', 'หมวดหมู่สินค้า');
        const namedCategories = Array.from(
          new Map(
            activeProducts
              .filter((product) => product.categoryId && product.categoryName?.trim())
              .map((product) => [product.categoryId as string, product.categoryName!.trim()])
          ).entries()
        );
        const allCategoryLink = doc.createElement('a');
        allCategoryLink.href = `/products${searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''}`;
        allCategoryLink.textContent = 'ทั้งหมด';
        if (!selectedCategoryId) allCategoryLink.setAttribute('aria-current', 'page');
        categoryBar.appendChild(allCategoryLink);
        namedCategories.forEach(([categoryId, categoryName]) => {
          const link = doc.createElement('a');
          const params = new URLSearchParams();
          params.set('category', categoryId);
          if (searchQuery) params.set('search', searchQuery);
          link.href = `/products?${params.toString()}`;
          link.textContent = categoryName;
          if (selectedCategoryId === categoryId) link.setAttribute('aria-current', 'page');
          categoryBar.appendChild(link);
        });
        if (namedCategories.length === 0) {
          const unavailable = doc.createElement('span');
          unavailable.textContent = 'หมวดหมู่จะแสดงเมื่อมีข้อมูลชื่อหมวดหมู่จากร้าน';
          categoryBar.appendChild(unavailable);
        }
        const toolbar = doc.getElementById('shop-toolbar');
        if (toolbar?.parentElement && !doc.querySelector('.soulmate-category-filters')) {
          toolbar.parentElement.insertBefore(categoryBar, toolbar);
        }

        const productSearch = doc.getElementById('product-search-input') as HTMLInputElement | null;
        if (productSearch) productSearch.value = searchQuery;
        if (productSearch) {
          const submitCatalogSearch = () => {
            const query = productSearch.value.trim();
            navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
          };
          productSearch.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            submitCatalogSearch();
          });
          productSearch.parentElement
            ?.querySelector('button')
            ?.addEventListener('click', submitCatalogSearch);
        }

        const activeProductsWithImages = await Promise.all(
          visibleProducts.map(async (product) => ({
            product,
            imageUrl: await resolveProductDisplayImage(product),
          }))
        );
        if (countLabel) countLabel.textContent = `${visibleProducts.length} สินค้า`;

        const gridSec = doc.getElementById('state-grid');
        const listSec = doc.getElementById('state-list');
        const emptySec = doc.getElementById('state-empty');
        loadingSec?.classList.add('hidden');

        if (visibleProducts.length === 0) {
          if (gridSec) gridSec.classList.add('hidden');
          listSec?.classList.add('hidden');
          if (emptySec) {
            emptySec.classList.remove('hidden');
            const heading = emptySec.querySelector('h3');
            const message = emptySec.querySelector('p');
            if (searchQuery) {
              if (heading) heading.textContent = 'ไม่พบสินค้าที่ค้นหา';
              if (message) message.textContent = `ไม่มีสินค้าที่ตรงกับ “${searchQuery}” ลองใช้คำค้นอื่น`;
              const clearButton = emptySec.querySelector('button');
              if (clearButton) {
                clearButton.textContent = 'ล้างคำค้น';
                clearButton.addEventListener('click', () => navigate('/products'));
              }
            }
          }
        } else {
          if (emptySec) emptySec.classList.add('hidden');
          if (listSec) {
            listSec.innerHTML = activeProductsWithImages.map(({ product, imageUrl }) =>
              renderStorefrontProductCard({
                product,
                imageUrl: imageUrl || null,
                pricing: resolveStorefrontPricing(product),
                variant: 'catalog-list',
              })
            ).join('');
          }
          if (gridSec) {
            gridSec.classList.remove('hidden');
            gridSec.innerHTML = activeProductsWithImages
              .map(({ product, imageUrl }) => renderStorefrontProductCard({
                product,
                imageUrl: imageUrl || null,
                pricing: resolveStorefrontPricing(product),
                variant: 'catalog-grid',
              }))
              .join('');

            // Click listeners for viewing detail and adding to cart
            doc.querySelectorAll('#state-grid [data-action="view-product"], #state-list [data-action="view-product"]').forEach((card) => {
              card.addEventListener('click', () => {
                const slug = card.getAttribute('data-slug');
                if (slug) navigate(`/products/${slug}`);
              });
            });

            doc.querySelectorAll('#state-grid [data-action="add-to-cart"], #state-list [data-action="add-to-cart"]').forEach((btn) => {
              btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const pId = btn.getAttribute('data-product-id') || '';
                const pName = btn.getAttribute('data-product-name') || '';
                const pPrice = parseFloat(btn.getAttribute('data-product-price') || '0');
                const pImg = btn.getAttribute('data-product-img') || null;

                const cartPayload = {
                  productId: pId,
                  productName: pName,
                  unitPrice: pPrice,
                  quantity: 1,
                  productImage: pImg,
                };

                const persistedItems = addPersistedCartItem(cartPayload);

                updateAllCartBadges(
                  doc,
                  persistedItems.reduce(
                    (sum, item) => sum + item.quantity,
                    0
                  )
                );

                // Trigger toast in iframe if exists
                const toast = doc.getElementById('cart-toast');
                if (toast) {
                  toast.classList.remove('opacity-0', 'translate-y-3');
                  toast.classList.add('opacity-100', 'translate-y-0');
                  setTimeout(() => {
                    toast.classList.remove('opacity-100', 'translate-y-0');
                    toast.classList.add('opacity-0', 'translate-y-3');
                  }, 1600);
                }
              });
            });
          }
        }
      } catch (err) {
        console.error('[Storefront Catalog] Error:', err);
        loadingSec?.classList.add('hidden');
        if (countLabel) countLabel.textContent = 'จำนวนสินค้า: —';
        const gridSec = doc.getElementById('state-grid');
        const emptySec = doc.getElementById('state-empty');
        emptySec?.classList.add('hidden');
        if (gridSec) {
          gridSec.classList.remove('hidden');
          gridSec.innerHTML = '<p class="p-6 text-center text-error">ไม่สามารถโหลดสินค้าได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p>';
        }
      }
    }

    // --- Storefront Product Detail Wiring (/products/:slug) ---
    if (
      (location.pathname.startsWith('/products/') && location.pathname !== '/products') ||
      location.pathname.startsWith('/product/')
    ) {
      const parts = location.pathname.split('/');
      const slugOrId = parts[2];

      if (slugOrId) {
        try {
          const product = await getProductBySlugOrId(slugOrId);

          if (!product) {
            const main = doc.querySelector('main') || doc.body;
            main.innerHTML = `
              <div class="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center bg-surface">
                <span class="material-symbols-outlined text-[48px] text-outline mb-3">inventory_2</span>
                <h1 class="text-lg font-bold text-on-surface">ไม่พบสินค้า</h1>
                <p class="text-sm text-on-surface-variant mt-1">สินค้านี้อาจถูกลบหรือยังไม่ได้เผยแพร่</p>
                <button id="real-product-back-products" type="button" class="mt-5 px-5 py-3 rounded-xl bg-primary text-white font-semibold">
                  กลับไปหน้าสินค้า
                </button>
              </div>
            `;

            doc
              .getElementById('real-product-back-products')
              ?.addEventListener('click', () => navigate('/products'));

            return;
          }

          const rawProduct = product as any;

          // ---------------------------------------------------------
          // REAL FIRESTORE VALUES
          // ---------------------------------------------------------
          const asFiniteNumber = (...values: any[]): number => {
            for (const value of values) {
              if (value === null || value === undefined || value === '') continue;
              const num = Number(value);
              if (Number.isFinite(num)) return num;
            }
            return 0;
          };

          // Support both canonical fields and older form field names.
          const basePricing = resolveStorefrontPricing(product);

          const basePrice = basePricing.regularPrice;
          const baseSpecialPrice = basePricing.specialPrice;

          const baseStock = asFiniteNumber(
            product.stock,
            rawProduct.stockQuantity,
            rawProduct.inventory
          );

          const sku =
            String(product.sku || rawProduct.productSku || '').trim();

          const description =
            String(product.description || '').trim();

          const highlights = String(product.highlights || '').trim();
          const ingredients = String(product.ingredients || '').trim();
          const usageInstructions = String(product.usageInstructions || '').trim();
          const fdaRegistrationNumber = String(product.fdaRegistrationNumber || '').trim();
          const countryOfOrigin = String(product.countryOfOrigin || '').trim();
          const shelfLife = String(product.shelfLife || '').trim();

          // ---------------------------------------------------------
          // RESOLVE EVERY REAL PRODUCT IMAGE FROM FIREBASE STORAGE
          // ---------------------------------------------------------
          let resolvedImages: ProductImage[] = [];

          try {
            const result = await resolveAllProductImages(
              Array.isArray(product.images) ? product.images : [],
              product.id
            );

            resolvedImages = (result.images || []).filter((img) =>
              isRenderableProductImageUrl(img?.url)
            );
          } catch (imageResolveError) {
            console.warn(
              '[Storefront Detail] Could not resolve gallery images:',
              imageResolveError
            );
          }

          if (
            resolvedImages.length === 0 &&
            isRenderableProductImageUrl(product.primaryImageURL)
          ) {
            resolvedImages = [
              {
                id: 'primary-image',
                url: product.primaryImageURL,
                storagePath: '',
                isPrimary: true,
              },
            ];
          }

          const primaryImage =
            resolvedImages.find((img) => img.isPrimary) ||
            resolvedImages[0] ||
            null;

          let selectedImageUrl = primaryImage?.url || '';

          // ---------------------------------------------------------
          // VARIANT STATE
          // ---------------------------------------------------------
          const allVariants = Array.isArray(product.variants)
            ? product.variants.filter((variant: any) => variant?.active !== false)
            : [];

          let selectedVariant: any =
            product.hasVariants && allVariants.length > 0
              ? allVariants.find((variant: any) => Number(variant?.stock || 0) > 0) ||
                allVariants[0]
              : null;

          let quantity = 1;

          const getCurrentPricing = (): StorefrontPricing => {
            if (!selectedVariant) {
              return basePricing;
            }

            const variantRegular = asFiniteNumber(
              selectedVariant.price,
              basePrice
            );

            // If a variant has its own explicit special price, use it.
            // Otherwise, reuse the product-level special price only when the
            // variant regular price is the same as the base regular price.
            const variantExplicitSpecial =
              selectedVariant.compareAtPrice ??
              selectedVariant.salePrice ??
              null;

            const inheritedSpecial =
              variantExplicitSpecial !== null &&
              variantExplicitSpecial !== undefined &&
              variantExplicitSpecial !== ''
                ? Number(variantExplicitSpecial)
                : variantRegular === basePrice
                  ? baseSpecialPrice
                  : null;

            return resolveStorefrontPricing(
              {
                price: variantRegular,
                compareAtPrice: inheritedSpecial,
              },
              variantRegular,
              inheritedSpecial
            );
          };

          const getCurrentPrice = (): number =>
            getCurrentPricing().sellingPrice;

          const getCurrentStock = (): number =>
            selectedVariant
              ? asFiniteNumber(selectedVariant.stock)
              : baseStock;

          const getCurrentImage = (): string | null => {
            const variantImage = String(selectedVariant?.imageURL || '').trim();
            if (isRenderableProductImageUrl(variantImage)) {
              return variantImage;
            }
            return selectedImageUrl || null;
          };

          // ---------------------------------------------------------
          // BUILD REAL PRODUCT DETAIL UI
          // Replaces the old Stitch mock detail content completely.
          // ---------------------------------------------------------
          const main =
            doc.querySelector('main') ||
            doc.querySelector('[role="main"]') ||
            doc.querySelector('.main-content');

          const detailHost = main || doc.createElement('main');

          if (!main) {
            const header = doc.querySelector('header');
            if (header?.parentElement) {
              header.insertAdjacentElement('afterend', detailHost);
            } else {
              doc.body.appendChild(detailHost);
            }
          }

          // IMPORTANT:
          // Do not remove the legacy purchase controls before rebuilding the
          // product-detail host. On some imported Stitch screens the legacy
          // control wrapper can contain the same main container that we are
          // about to reuse, which can detach the detailHost from the document
          // and leave the page blank.
          detailHost.setAttribute('id', 'real-product-detail');
          detailHost.className =
            'w-full bg-surface pb-28';

          const renderPriceHtml = (pricing: StorefrontPricing) => {
            if (pricing.hasSpecialPrice && pricing.specialPrice !== null) {
              return `
                <div class="flex items-end gap-2 flex-wrap">
                  <span
                    id="real-product-regular-price"
                    class="text-sm text-on-surface-variant line-through"
                  >
                    ฿${pricing.regularPrice.toLocaleString('th-TH')}
                  </span>
                  <span
                    id="real-product-price"
                    class="text-[28px] leading-none font-bold text-tertiary"
                  >
                    ฿${pricing.specialPrice.toLocaleString('th-TH')}
                  </span>
                </div>
              `;
            }

            return `
              <div class="flex items-end gap-2 flex-wrap">
                <span
                  id="real-product-price"
                  class="text-[28px] leading-none font-bold text-tertiary"
                >
                  ฿${pricing.regularPrice.toLocaleString('th-TH')}
                </span>
              </div>
            `;
          };

          const renderGalleryHtml = () => {
            if (resolvedImages.length === 0) {
              return `
                <div class="w-full aspect-square bg-surface-container-low rounded-2xl flex flex-col items-center justify-center text-on-surface-variant">
                  <span class="material-symbols-outlined text-[48px]">image_not_supported</span>
                  <span class="text-sm mt-2">ยังไม่มีรูปสินค้า</span>
                </div>
              `;
            }

            return `
              <div class="w-full">
                <div class="w-full aspect-square rounded-2xl overflow-hidden bg-white border border-outline-variant/30 flex items-center justify-center">
                  <img
                    id="real-product-main-image"
                    src="${escapeHtml(selectedImageUrl)}"
                    alt="${escapeHtml(product.name)}"
                    class="w-full h-full object-contain"
                  />
                </div>

                ${
                  resolvedImages.length > 1
                    ? `
                      <div class="flex gap-2 overflow-x-auto pt-3 pb-1">
                        ${resolvedImages
                          .map(
                            (image, index) => `
                              <button
                                type="button"
                                class="real-product-thumb flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-white border ${
                                  image.url === selectedImageUrl
                                    ? 'border-primary ring-1 ring-primary'
                                    : 'border-outline-variant/50'
                                }"
                                data-image-index="${index}"
                                aria-label="เลือกรูปสินค้า ${index + 1}"
                              >
                                <img
                                  src="${escapeHtml(image.url)}"
                                  alt="${escapeHtml(product.name)} รูปที่ ${index + 1}"
                                  class="w-full h-full object-cover"
                                />
                              </button>
                            `
                          )
                          .join('')}
                      </div>
                    `
                    : ''
                }
              </div>
            `;
          };

          const optionGroups = Array.isArray(product.optionGroups)
            ? product.optionGroups
            : [];
          const variantOptionClass = (selected: boolean) =>
            `real-variant-option px-3 py-2 rounded-xl text-sm border transition-colors ${
              selected
                ? 'border-tertiary bg-tertiary text-on-tertiary font-semibold ring-2 ring-tertiary/20'
                : 'border-outline-variant bg-white text-on-surface hover:border-primary hover:bg-primary-container/20'
            }`;

          const renderVariantsHtml = () => {
            if (
              !product.hasVariants ||
              allVariants.length === 0 ||
              optionGroups.length === 0
            ) {
              return '';
            }

            return `
              <div id="real-product-variants">
                <div>
                  <h2 class="text-base font-bold text-on-surface">ตัวเลือกสินค้า</h2>
                </div>

                <div class="mt-4 space-y-4">
                  ${optionGroups
                    .map((group: any) => {
                      const values = Array.isArray(group?.values)
                        ? group.values
                        : [];

                      return `
                        <div>
                          <div class="text-sm font-semibold text-on-surface mb-2">
                            ${escapeHtml(String(group?.name || 'ตัวเลือก'))}
                          </div>
                          <div class="flex flex-wrap gap-2" data-real-option-group="${escapeHtml(
                            String(group?.id || '')
                          )}">
                            ${values
                              .map((value: any) => {
                                const isSelected = Boolean(
                                  selectedVariant?.options?.some(
                                    (opt: any) =>
                                      String(opt.groupId) === String(group.id) &&
                                      String(opt.valueId) === String(value.id)
                                  )
                                );

                                return `
                                  <button
                                    type="button"
                                    class="${variantOptionClass(isSelected)}"
                                    data-group-id="${escapeHtml(String(group?.id || ''))}"
                                    data-value-id="${escapeHtml(String(value?.id || ''))}"
                                  >
                                    ${escapeHtml(String(value?.name || value?.value || ''))}
                                  </button>
                                `;
                              })
                              .join('')}
                          </div>
                        </div>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            `;
          };

          const infoRows = [
            sku
              ? `<div class="flex justify-between gap-4 py-2 border-b border-surface-container"><span class="text-sm text-on-surface-variant">SKU</span><span class="text-sm font-medium text-on-surface text-right">${escapeHtml(
                  sku
                )}</span></div>`
              : '',
            fdaRegistrationNumber
              ? `<div class="flex justify-between gap-4 py-2 border-b border-surface-container"><span class="text-sm text-on-surface-variant">เลข อย.</span><span class="text-sm font-medium text-on-surface text-right">${escapeHtml(
                  fdaRegistrationNumber
                )}</span></div>`
              : '',
            countryOfOrigin
              ? `<div class="flex justify-between gap-4 py-2 border-b border-surface-container"><span class="text-sm text-on-surface-variant">ประเทศผู้ผลิต</span><span class="text-sm font-medium text-on-surface text-right">${escapeHtml(
                  countryOfOrigin
                )}</span></div>`
              : '',
            shelfLife
              ? `<div class="flex justify-between gap-4 py-2"><span class="text-sm text-on-surface-variant">อายุการเก็บรักษา</span><span class="text-sm font-medium text-on-surface text-right">${escapeHtml(
                  shelfLife
                )}</span></div>`
              : '',
          ]
            .filter(Boolean)
            .join('');

          const codEnabled = product.shipping?.codEnabled !== false;
          const variantsHtml = renderVariantsHtml();

          detailHost.innerHTML = `
              <div class="max-w-[520px] mx-auto px-4 py-4">

              <div id="real-product-primary-column">
              <button id="real-back-to-products" type="button" class="inline-flex min-h-10 items-center gap-2 self-start rounded-full border border-outline-variant/50 bg-white px-4 text-sm font-medium text-primary transition-colors hover:bg-primary-container/30" aria-label="กลับไปหน้าสินค้าทั้งหมด">
                <span class="material-symbols-outlined text-[20px]" aria-hidden="true">arrow_back</span>
                <span>กลับไปหน้าสินค้าทั้งหมด</span>
              </button>
              <section id="real-product-gallery">
                ${renderGalleryHtml()}
              </section>

              <section id="real-product-summary" class="bg-white rounded-2xl p-4 border border-outline-variant/20">
                <div>${renderPriceHtml(getCurrentPricing())}</div>
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    id="real-product-stock"
                    class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      getCurrentStock() > 0
                        ? 'bg-primary-container/50 text-primary'
                        : 'bg-error-container text-error'
                    }"
                  >
                    ${
                      getCurrentStock() > 0
                        ? `มีสินค้า ${getCurrentStock().toLocaleString('th-TH')} ชิ้น`
                        : 'สินค้าหมด'
                    }
                  </span>

                  ${
                    codEnabled
                      ? `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container">เก็บเงินปลายทางได้</span>`
                      : ''
                  }
                </div>
              </section>

              <section id="real-product-config" aria-label="ตัวเลือกสินค้าและจำนวน" class="bg-white rounded-2xl p-4 border border-outline-variant/20">
                ${variantsHtml}

              <div id="real-product-quantity" class="${variantsHtml ? 'mt-4 border-t border-outline-variant/30 pt-4' : ''}">
                <div class="flex items-center justify-between">
                  <h2 class="text-base font-bold text-on-surface">จำนวน</h2>

                  <div class="flex items-center border border-outline-variant rounded-xl overflow-hidden bg-white">
                    <button
                      type="button"
                      id="real-qty-minus"
                      class="w-11 h-11 flex items-center justify-center text-on-surface"
                      aria-label="ลดจำนวน"
                    >
                      <span class="material-symbols-outlined">remove</span>
                    </button>
                    <span
                      id="real-qty-display"
                      class="min-w-12 text-center font-bold text-on-surface"
                    >1</span>
                    <button
                      type="button"
                      id="real-qty-plus"
                      class="w-11 h-11 flex items-center justify-center text-on-surface"
                      aria-label="เพิ่มจำนวน"
                    >
                      <span class="material-symbols-outlined">add</span>
                    </button>
                  </div>
                </div>
              </div>
              </section>
              </div>

              <div id="real-product-secondary-column">
              <section id="real-product-overview" class="bg-white rounded-2xl p-5 border border-outline-variant/20">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h1 id="real-product-name" class="text-xl font-bold text-on-surface leading-snug">
                      ${escapeHtml(product.name)}
                    </h1>
                  </div>
                </div>
                ${
                  description
                    ? `<div id="real-product-description" class="mt-3 border-t border-outline-variant/30 pt-3">
                        <h2 class="text-base font-bold text-on-surface">รายละเอียดสินค้า</h2>
                        <p class="text-sm text-on-surface-variant mt-2 leading-relaxed whitespace-pre-line">${escapeHtml(description)}</p>
                      </div>`
                    : ''
                }

              </section>

              <div id="real-product-attributes">

              ${
                highlights
                  ? `
                    <section id="real-product-highlights" class="bg-white rounded-2xl p-4 border border-outline-variant/20">
                      <h2 class="text-base font-bold text-on-surface">จุดเด่น</h2>
                      <p class="text-sm text-on-surface-variant mt-3 leading-relaxed whitespace-pre-line">${escapeHtml(
                        highlights
                      )}</p>
                    </section>
                  `
                  : ''
              }

              ${
                ingredients
                  ? `
                    <section id="real-product-ingredients" class="bg-white rounded-2xl p-4 border border-outline-variant/20">
                      <h2 class="text-base font-bold text-on-surface">ส่วนประกอบสำคัญ</h2>
                      <p class="text-sm text-on-surface-variant mt-3 leading-relaxed whitespace-pre-line">${escapeHtml(
                        ingredients
                      )}</p>
                    </section>
                  `
                  : ''
              }

              ${
                usageInstructions
                  ? `
                    <section id="real-product-usage" class="bg-white rounded-2xl p-4 border border-outline-variant/20">
                      <h2 class="text-base font-bold text-on-surface">วิธีใช้ / รับประทาน</h2>
                      <p class="text-sm text-on-surface-variant mt-3 leading-relaxed whitespace-pre-line">${escapeHtml(
                        usageInstructions
                      )}</p>
                    </section>
                  `
                  : ''
              }

              ${
                infoRows
                  ? `
                    <section id="real-product-info" class="bg-white rounded-2xl p-4 border border-outline-variant/20">
                      <h2 class="text-base font-bold text-on-surface mb-2">ข้อมูลสินค้า</h2>
                      ${infoRows}
                    </section>
                  `
                  : ''
              }
              </div>
              </div>

            </div>

            <div
              id="real-product-purchase-bar"
              class="fixed left-0 right-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-outline-variant/30 pb-safe"
              style="background:rgba(255,255,255,.97);border-top:1px solid rgba(0,0,0,.08);"
            >
              <div class="max-w-[640px] mx-auto px-3 py-3 flex items-center gap-2">
                <div class="min-w-[82px]">
                  <div class="text-[10px] text-on-surface-variant">ยอดรวม</div>
                  <div
                    id="real-product-total"
                    class="text-lg font-bold text-tertiary"
                    style="color:#CA5A9A;font-weight:700;"
                  >
                    ฿${getCurrentPrice().toLocaleString('th-TH')}
                  </div>
                </div>

                <button
                  type="button"
                  id="real-add-to-cart"
                  class="flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-1 active:scale-[0.99] transition-transform disabled:opacity-50"
                  style="min-width:120px;border:1.5px solid #CA5A9A;background:#FFFFFF;color:#CA5A9A;border-radius:12px;"
                  ${getCurrentStock() <= 0 ? 'disabled' : ''}
                >
                  <span class="material-symbols-outlined text-[20px]">shopping_bag</span>
                  <span>${getCurrentStock() > 0 ? 'เพิ่มใส่ตะกร้า' : 'สินค้าหมด'}</span>
                </button>

                <button
                  type="button"
                  id="real-buy-now"
                  class="flex-1 h-12 rounded-xl font-bold flex items-center justify-center gap-1 active:scale-[0.99] transition-transform disabled:opacity-50"
                  style="min-width:110px;border:1.5px solid #CA5A9A;background:#CA5A9A;color:#FFFFFF;border-radius:12px;"
                  ${getCurrentStock() <= 0 ? 'disabled' : ''}
                >
                  <span class="material-symbols-outlined text-[20px]">bolt</span>
                  <span>${getCurrentStock() > 0 ? 'สั่งซื้อ' : 'สินค้าหมด'}</span>
                </button>
              </div>
            </div>
          `;

          const productAttributes = doc.getElementById('real-product-attributes');
          if (productAttributes && !productAttributes.querySelector('section')) {
            productAttributes.remove();
          }

          // The real product detail is mounted now.
          // Remove only residual Stitch/mock purchase controls that live OUTSIDE
          // #real-product-detail. Never touch the real purchase bar/buttons.
          Array.from(
            doc.querySelectorAll<HTMLButtonElement>('button')
          ).forEach((button) => {
            if (button.closest('#real-product-detail')) return;

            const label = (button.textContent || '')
              .replace(/\s+/g, ' ')
              .trim();

            if (
              label.includes('เพิ่มลงตะกร้า') ||
              label.includes('เพิ่มใส่ตะกร้า') ||
              label.includes('สั่งซื้อ')
            ) {
              const legacyBar =
                button.closest<HTMLElement>(
                  '[id*="sticky"], [class*="fixed"], [class*="sticky"], footer'
                );

              if (legacyBar) {
                legacyBar.remove();
              } else {
                button.remove();
              }
            }
          });

          // ---------------------------------------------------------
          // UI HELPERS
          // ---------------------------------------------------------
          const refreshDetailUi = () => {
            const currentPricing = getCurrentPricing();
            const currentPrice = currentPricing.sellingPrice;
            const currentStock = getCurrentStock();
            const currentImage = getCurrentImage();

            const priceEl = doc.getElementById('real-product-price');
            const regularPriceEl = doc.getElementById('real-product-regular-price');

            if (priceEl) {
              priceEl.textContent = `฿${currentPrice.toLocaleString('th-TH')}`;
            }

            if (regularPriceEl) {
              if (
                currentPricing.hasSpecialPrice &&
                currentPricing.specialPrice !== null
              ) {
                regularPriceEl.textContent =
                  `฿${currentPricing.regularPrice.toLocaleString('th-TH')}`;
                regularPriceEl.classList.remove('hidden');
              } else {
                regularPriceEl.classList.add('hidden');
              }
            }

            const stockEl = doc.getElementById('real-product-stock');
            if (stockEl) {
              stockEl.textContent =
                currentStock > 0
                  ? `มีสินค้า ${currentStock.toLocaleString('th-TH')} ชิ้น`
                  : 'สินค้าหมด';

              stockEl.className =
                `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                  currentStock > 0
                    ? 'bg-primary-container/50 text-primary'
                    : 'bg-error-container text-error'
                }`;
            }

            const mainImageEl = doc.getElementById(
              'real-product-main-image'
            ) as HTMLImageElement | null;

            if (mainImageEl && currentImage) {
              mainImageEl.src = currentImage;
            }

            const totalEl = doc.getElementById('real-product-total');
            if (totalEl) {
              totalEl.textContent = `฿${(
                currentPrice * quantity
              ).toLocaleString('th-TH')}`;
            }

            const addButton = doc.getElementById(
              'real-add-to-cart'
            ) as HTMLButtonElement | null;

            if (addButton) {
              addButton.disabled = currentStock <= 0;
              const label = addButton.querySelector('span:last-child');
              if (label) {
                label.textContent =
                  currentStock > 0 ? 'เพิ่มใส่ตะกร้า' : 'สินค้าหมด';
              }
            }

            const buyNowButton = doc.getElementById(
              'real-buy-now'
            ) as HTMLButtonElement | null;

            if (buyNowButton) {
              buyNowButton.disabled = currentStock <= 0;
              const label = buyNowButton.querySelector('span:last-child');
              if (label) {
                label.textContent =
                  currentStock > 0 ? 'สั่งซื้อ' : 'สินค้าหมด';
              }
            }
          };

          // ---------------------------------------------------------
          // GALLERY EVENTS
          // ---------------------------------------------------------
          doc.querySelectorAll<HTMLElement>('.real-product-thumb').forEach(
            (button) => {
              button.addEventListener('click', () => {
                const index = Number(button.dataset.imageIndex || 0);
                const chosen = resolvedImages[index];

                if (!chosen?.url) return;

                selectedImageUrl = chosen.url;

                doc.querySelectorAll<HTMLElement>('.real-product-thumb').forEach(
                  (thumb) => {
                    const thumbIndex = Number(thumb.dataset.imageIndex || 0);
                    const active = thumbIndex === index;
                    thumb.classList.toggle('border-primary', active);
                    thumb.classList.toggle('ring-1', active);
                    thumb.classList.toggle('ring-primary', active);
                    thumb.classList.toggle('border-outline-variant/50', !active);
                  }
                );

                const mainImageEl = doc.getElementById(
                  'real-product-main-image'
                ) as HTMLImageElement | null;

                if (mainImageEl) {
                  mainImageEl.src = chosen.url;
                }
              });
            }
          );

          // ---------------------------------------------------------
          // QUANTITY EVENTS
          // ---------------------------------------------------------
          const quantityDisplay = doc.getElementById('real-qty-display');

          const updateQuantity = (nextQuantity: number) => {
            const maxStock = Math.max(0, getCurrentStock());

            quantity = Math.max(
              1,
              maxStock > 0
                ? Math.min(nextQuantity, maxStock)
                : 1
            );

            if (quantityDisplay) {
              quantityDisplay.textContent = String(quantity);
            }

            refreshDetailUi();
          };

          doc
            .getElementById('real-qty-minus')
            ?.addEventListener('click', () => updateQuantity(quantity - 1));

          doc
            .getElementById('real-qty-plus')
            ?.addEventListener('click', () => updateQuantity(quantity + 1));

          // ---------------------------------------------------------
          // VARIANT EVENTS
          // ---------------------------------------------------------
          if (
            product.hasVariants &&
            allVariants.length > 0 &&
            optionGroups.length > 0
          ) {
            doc.querySelectorAll<HTMLElement>('.real-variant-option').forEach(
              (button) => {
                button.addEventListener('click', () => {
                  const groupId = String(button.dataset.groupId || '');
                  const valueId = String(button.dataset.valueId || '');

                  const selectedOptions = selectedVariant?.options
                    ? [...selectedVariant.options]
                    : [];

                  const existingIndex = selectedOptions.findIndex(
                    (option: any) => String(option.groupId) === groupId
                  );

                  const group = optionGroups.find(
                    (item: any) => String(item?.id) === groupId
                  );

                  const value = Array.isArray(group?.values)
                    ? group.values.find(
                        (item: any) => String(item?.id) === valueId
                      )
                    : null;

                  if (group && value) {
                    const nextOption = {
                      groupId,
                      groupName: String(group.name || ''),
                      valueId,
                      valueName: String(value.name || (value as any).value || ''),
                    };

                    if (existingIndex >= 0) {
                      selectedOptions[existingIndex] = nextOption;
                    } else {
                      selectedOptions.push(nextOption);
                    }
                  }

                  const matchedVariant =
                    allVariants.find((variant: any) => {
                      const variantOptions = Array.isArray(variant?.options)
                        ? variant.options
                        : [];

                      return selectedOptions.every((selected: any) =>
                        variantOptions.some(
                          (variantOption: any) =>
                            String(variantOption.groupId) ===
                              String(selected.groupId) &&
                            String(variantOption.valueId) ===
                              String(selected.valueId)
                        )
                      );
                    }) ||
                    allVariants.find((variant: any) =>
                      Array.isArray(variant?.options) &&
                      variant.options.some(
                        (variantOption: any) =>
                          String(variantOption.groupId) === groupId &&
                          String(variantOption.valueId) === valueId
                      )
                    );

                  if (!matchedVariant) return;

                  selectedVariant = matchedVariant;
                  quantity = 1;

                  doc
                    .querySelectorAll<HTMLElement>('.real-variant-option')
                    .forEach((optionButton) => {
                      const optionGroupId = String(
                        optionButton.dataset.groupId || ''
                      );
                      const optionValueId = String(
                        optionButton.dataset.valueId || ''
                      );

                      const active = Boolean(
                        selectedVariant?.options?.some(
                          (option: any) =>
                            String(option.groupId) === optionGroupId &&
                            String(option.valueId) === optionValueId
                        )
                      );

                      optionButton.className = variantOptionClass(active);
                    });

                  if (quantityDisplay) {
                    quantityDisplay.textContent = '1';
                  }

                  refreshDetailUi();
                });
              }
            );
          }

          // ---------------------------------------------------------
          // ADD TO CART - REAL FIRESTORE PRODUCT
          // ---------------------------------------------------------
          const handleRealAddToCart = async (event?: Event) => {
            event?.preventDefault();
            event?.stopPropagation();

            const currentPrice = getCurrentPrice();
            const currentStock = getCurrentStock();

            if (currentStock <= 0) {
              win.alert('สินค้านี้หมดสต็อก');
              return;
            }

            const cartPayload = {
              productId: product.id,
              productName: product.name,
              variantId: selectedVariant?.id || null,
              variantName: selectedVariant?.displayName || null,
              unitPrice: currentPrice,
              quantity,
              productImage: getCurrentImage(),
            };

            // Write directly to the single storefront cart source.
            addCartItem(cartPayload);

            // Re-read immediately. This is the proof that the item was actually
            // persisted rather than only changing a visual badge.
            const snapshot = getCartSnapshot();

            updateAllCartBadges(doc, snapshot.itemCount);

            const button = doc.getElementById(
              'real-add-to-cart'
            ) as HTMLButtonElement | null;

            if (button) {
              const originalHtml = button.innerHTML;

              button.innerHTML = `
                <span class="material-symbols-outlined text-[20px]">check_circle</span>
                <span>เพิ่มลงตะกร้าแล้ว (${snapshot.itemCount})</span>
              `;

              setTimeout(() => {
                button.innerHTML = originalHtml;
              }, 1600);
            }

            console.info('[SOULMATE Cart] Added product:', {
              productId: product.id,
              itemCount: snapshot.itemCount,
              subtotal: snapshot.subtotal,
            });
          };

          doc
            .getElementById('real-add-to-cart')
            ?.addEventListener('click', handleRealAddToCart);

          doc
            .getElementById('real-back-to-products')
            ?.addEventListener('click', (event) => {
              event.preventDefault();
              navigate('/products');
            });

          const handleRealBuyNow = async (event?: Event) => {
            event?.preventDefault();
            event?.stopPropagation();

            const currentPrice = getCurrentPrice();
            const currentStock = getCurrentStock();

            if (currentStock <= 0) {
              win.alert('สินค้านี้หมดสต็อก');
              return;
            }

            addCartItem({
              productId: product.id,
              productName: product.name,
              variantId: selectedVariant?.id || null,
              variantName: selectedVariant?.displayName || null,
              unitPrice: currentPrice,
              quantity,
              productImage: getCurrentImage(),
            });

            const snapshot = getCartSnapshot();
            updateAllCartBadges(doc, snapshot.itemCount);

            navigate('/cart');
          };

          doc
            .getElementById('real-buy-now')
            ?.addEventListener('click', handleRealBuyNow);

          // Safety net for any residual imported button that the HTML template
          // recreates after load. The real button is ignored here to avoid
          // double-adding.
          const productDetailDelegatedAdd = (event: Event) => {
            const target = (event.target as HTMLElement | null)?.closest(
              'button, [role="button"]'
            ) as HTMLElement | null;

            if (
              !target ||
              target.id === 'real-add-to-cart' ||
              target.id === 'real-buy-now'
            ) return;

            const label = (target.textContent || '')
              .replace(/\s+/g, ' ')
              .trim();

            if (label.includes('เพิ่มลงตะกร้า')) {
              void handleRealAddToCart(event);
            }
          };

          doc.addEventListener('click', productDetailDelegatedAdd);

          refreshDetailUi();

          const reviewsSection = doc.createElement('section');
          reviewsSection.id = 'soulmate-product-reviews';
          reviewsSection.className = 'mt-6 rounded-2xl border border-surface-container-high bg-white p-5';
          reviewsSection.innerHTML = `
            <h2 class="text-lg font-bold text-on-surface">รีวิวสินค้า</h2>
            <p class="mt-2 text-sm text-on-surface-variant">ระบบรีวิวยังไม่พร้อมใช้งาน จึงยังไม่มีรีวิวที่ตรวจสอบได้</p>
          `;

          const relatedSection = doc.createElement('section');
          relatedSection.id = 'soulmate-related-products';
          relatedSection.className = 'mt-6 rounded-2xl border border-surface-container-high bg-white p-5';
          relatedSection.innerHTML = `
            <h2 class="text-lg font-bold text-on-surface">สินค้าอื่นที่เลือกดูได้</h2>
            <div class="mt-4 grid grid-cols-2 gap-3" id="soulmate-related-grid">
              <p class="text-sm text-on-surface-variant">กำลังโหลดสินค้า…</p>
            </div>
          `;
          const detailLayout = detailHost.firstElementChild;
          const secondaryColumn = doc.getElementById('real-product-secondary-column');
          if (secondaryColumn) secondaryColumn.append(reviewsSection);
          if (detailLayout) detailLayout.append(relatedSection);

          try {
            const relatedProducts = (await getProducts({ status: 'active' }))
              .filter((item) => item.id !== product.id)
              .sort((a, b) => Number(b.categoryId === product.categoryId) - Number(a.categoryId === product.categoryId))
              .slice(0, 4);
            const relatedGrid = doc.getElementById('soulmate-related-grid');
            if (relatedGrid) {
              if (relatedProducts.length === 0) {
                relatedGrid.innerHTML = '<p class="text-sm text-on-surface-variant">ยังไม่มีสินค้าอื่นที่เผยแพร่</p>';
              } else {
                const relatedCards = await Promise.all(relatedProducts.map(async (item) => {
                  const image = await resolveProductDisplayImage(item);
                  return renderStorefrontProductCard({
                    product: item,
                    imageUrl: image,
                    pricing: resolveStorefrontPricing(item),
                    variant: 'related',
                  });
                }));
                relatedGrid.innerHTML = relatedCards.join('');
              }
            }
          } catch (relatedError) {
            const relatedGrid = doc.getElementById('soulmate-related-grid');
            if (relatedGrid) relatedGrid.innerHTML = '<p class="text-sm text-on-surface-variant">ไม่สามารถโหลดสินค้าอื่นได้ในขณะนี้</p>';
            console.warn('[Storefront Detail] Related products unavailable:', relatedError);
          }
        } catch (err) {
          console.error('[Storefront Detail] Error:', err);

          const main = doc.querySelector('main') || doc.body;
          main.innerHTML = `
            <div class="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center bg-surface">
              <span class="material-symbols-outlined text-[48px] text-error mb-3">error</span>
              <h1 class="text-lg font-bold text-on-surface">ไม่สามารถโหลดข้อมูลสินค้าได้</h1>
              <p class="text-sm text-on-surface-variant mt-1">กรุณากลับไปหน้าสินค้าแล้วลองอีกครั้ง</p>
              <button id="real-product-error-back" type="button" class="mt-5 px-5 py-3 rounded-xl bg-primary text-white font-semibold">
                กลับไปหน้าสินค้า
              </button>
            </div>
          `;

          doc
            .getElementById('real-product-error-back')
            ?.addEventListener('click', () => navigate('/products'));
        }
      }
    }

    // --- Storefront Home Wiring (/) ---
    if (location.pathname === '/') {
      // Clear imported sample products before the first asynchronous request.
      const initialProductGrid = doc.getElementById('product-grid-view');
      if (initialProductGrid) initialProductGrid.textContent = 'กำลังโหลดสินค้า…';
      doc.getElementById('toggle-state-btn')?.remove();
      doc.getElementById('product-empty-view')?.remove();
      const homeSearch = doc.getElementById('home-search-input') as HTMLInputElement | null;
      if (homeSearch) {
        const submitSearch = () => {
          const query = homeSearch.value.trim();
          navigate(query ? `/products?search=${encodeURIComponent(query)}` : '/products');
        };
        homeSearch.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submitSearch();
          }
        });
        homeSearch.parentElement?.querySelector('button')?.addEventListener('click', submitSearch);
      }
      try {
        // Storefront must show ONLY real published/active products from Firestore.
        // Never keep Stitch sample/mock cards on the production homepage.
        const activeProducts = await getProducts({ status: 'active' });

        const findSampleProductCard = (): HTMLElement | null => {
          const candidates: HTMLElement[] = Array.from(
            doc.querySelectorAll<HTMLElement>(
              '.product-card, article, a[href="/product"], a[href^="/products/"], div.group'
            )
          );

          return (
            candidates.find((el) => {
              if (el.closest('nav, header, footer')) return false;

              const text = (el.textContent || '').trim();

              return (
                text.includes('ชื่อสินค้าตัวอย่าง') ||
                text.includes('(Product Name)') ||
                text.includes('Product Name')
              );
            }) || null
          );
        };

        const sampleCard = findSampleProductCard();

        // Prefer the exact parent grid that currently contains the Stitch mock cards.
        // Fall back to known storefront product containers if the imported markup changed.
        let productGrid =
          initialProductGrid ||
          (sampleCard?.parentElement as HTMLElement | null) ||
          (doc.querySelector(
            '.product-grid, [data-purpose="product-grid"], [data-products-grid], section:has(.product-card)'
          ) as HTMLElement | null);

        // If a section wrapper was returned instead of the actual grid, use the inner grid.
        if (productGrid) {
          const innerGrid = productGrid.querySelector<HTMLElement>(
            '.grid, .product-grid, [data-products-grid]'
          );

          if (
            innerGrid &&
            !innerGrid.closest('nav, header, footer') &&
            (innerGrid.textContent || '').includes('Product')
          ) {
            productGrid = innerGrid;
          }
        }

        // Last-resort: locate the mock product heading text and use its closest sensible container.
        if (!productGrid) {
          const allElements: HTMLElement[] = Array.from(
            doc.querySelectorAll<HTMLElement>('main *')
          );

          const mockTextEl =
            allElements.find((el) => {
              const value = (el.textContent || '').trim();
              return (
                value.includes('ชื่อสินค้าตัวอย่าง') ||
                value.includes('(Product Name)')
              );
            }) || null;

          productGrid =
            (mockTextEl?.closest(
              '.grid, [class*="grid-cols"], section'
            ) as HTMLElement | null) || null;
        }

        if (!productGrid) {
          console.warn(
            '[Home Page] Could not locate imported product grid. No mock data was injected.'
          );
          return;
        }

        // Remove every mock/sample card from the product area.
        productGrid.innerHTML = '';

        // Real zero-state: no fake products.
        if (activeProducts.length === 0) {
          productGrid.className =
            'w-full flex flex-col items-center justify-center py-14 px-6 text-center';

          productGrid.innerHTML = `
            <div class="w-14 h-14 rounded-2xl bg-primary-container/50 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[30px]">inventory_2</span>
            </div>
            <h2 class="mt-4 text-lg font-bold text-on-surface">ยังไม่มีสินค้า</h2>
            <p class="mt-1 text-sm text-on-surface-variant">
              สินค้าที่เผยแพร่จากระบบหลังบ้านจะแสดงที่นี่
            </p>
          `;

          return;
        }

        // Resolve the real Firebase Storage gallery for each published product.
        const homeProducts = await Promise.all(
          activeProducts.map(async (product) => {
            let images: ProductImage[] = [];

            try {
              const result = await resolveAllProductImages(
                Array.isArray(product.images) ? product.images : [],
                product.id
              );

              images = (result.images || []).filter((image) =>
                isRenderableProductImageUrl(image?.url)
              );
            } catch (imageError) {
              console.warn(
                `[Home Page] Failed to resolve images for ${product.id}:`,
                imageError
              );
            }

            const primaryImage =
              images.find((image) => image.isPrimary) ||
              images[0] ||
              null;

            const pricing = resolveStorefrontPricing(product);

            return {
              product,
              imageUrl:
                primaryImage?.url ||
                (isRenderableProductImageUrl(product.primaryImageURL)
                  ? product.primaryImageURL
                  : ''),
              pricing,
            };
          })
        );

        // Keep the homepage responsive, but render only REAL Firestore products.
        productGrid.className =
          'grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4';

        productGrid.innerHTML = homeProducts
          .map(({ product, imageUrl, pricing }, index) => renderStorefrontProductCard({
            product,
            imageUrl: imageUrl || null,
            pricing,
            variant: 'home',
            index,
          }))
          .join('');

        const openHomeProduct = (index: number) => {
          const item = homeProducts[index];

          if (!item) return;

          const target =
            item.product.slug && String(item.product.slug).trim()
              ? `/products/${String(item.product.slug).trim()}`
              : `/products/${item.product.id}`;

          navigate(target);
        };

        doc
          .querySelectorAll<HTMLElement>('.real-home-product-card')
          .forEach((card) => {
            const index = Number(card.dataset.productIndex || 0);

            card.addEventListener('click', (event) => {
              // Add-to-cart button has its own action.
              if ((event.target as HTMLElement).closest('.real-home-add-cart')) {
                return;
              }

              event.preventDefault();
              event.stopPropagation();
              openHomeProduct(index);
            });

            card.addEventListener('keydown', (event: KeyboardEvent) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;

              event.preventDefault();
              event.stopPropagation();
              openHomeProduct(index);
            });
          });

        doc
          .querySelectorAll<HTMLButtonElement>('.real-home-add-cart')
          .forEach((button) => {
            button.addEventListener('click', async (event) => {
              event.preventDefault();
              event.stopPropagation();

              const index = Number(button.dataset.productIndex || 0);
              const item = homeProducts[index];

              if (!item) return;

              const product = item.product;
              const availableVariants = Array.isArray(product.variants)
                ? product.variants.filter(
                    (variant: any) =>
                      variant?.active !== false &&
                      Number(variant?.stock || 0) > 0
                  )
                : [];

              // If a product has variants, the customer should choose them
              // on the real product detail page instead of silently adding
              // a guessed variant from the homepage.
              if (product.hasVariants && availableVariants.length > 0) {
                openHomeProduct(index);
                return;
              }

              const raw = product as any;
              const stock = Number(
                product.stock ??
                  raw.stockQuantity ??
                  raw.inventory ??
                  0
              );

              if (!Number.isFinite(stock) || stock <= 0) {
                win.alert('สินค้านี้หมดสต็อก');
                return;
              }

              const cartPayload = {
                productId: product.id,
                productName: product.name,
                variantId: null,
                variantName: null,
                unitPrice: item.pricing.sellingPrice,
                quantity: 1,
                productImage: item.imageUrl || null,
              };

              const persistedItems = addPersistedCartItem(cartPayload);

              updateAllCartBadges(
                doc,
                persistedItems.reduce(
                  (sum, persistedItem) =>
                    sum + persistedItem.quantity,
                  0
                )
              );

              const icon = button.querySelector('.material-symbols-outlined');

              if (icon) {
                const oldText = icon.textContent;
                icon.textContent = 'check';

                setTimeout(() => {
                  icon.textContent = oldText || 'add';
                }, 1200);
              }
            });
          });
      } catch (err) {
        console.error('[Home Page] Error:', err);
        if (initialProductGrid) {
          initialProductGrid.innerHTML = '<p class="col-span-full py-10 text-center text-error">ไม่สามารถโหลดสินค้าได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง</p>';
        }
      }
    }
  };

  const showHydratedIframe = async () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      // The homepage and catalog clear sample cards synchronously before their
      // first data request. Reveal their navigation, banner and search at once.
      const hydration = handleIframeLoaded();
      if (routeType === 'storefront' && ['/', '/products'].includes(location.pathname)) {
        iframe.dataset.ready = 'true';
        iframe.style.visibility = 'visible';
      }
      await hydration;
    } catch (error) {
      console.error('[ScreenRenderer] Failed to prepare storefront screen:', error);
      if (routeType === 'storefront' && iframe.contentDocument) {
        const main = iframe.contentDocument.querySelector('main') || iframe.contentDocument.body;
        main.replaceChildren();
        const message = iframe.contentDocument.createElement('p');
        message.className = 'p-8 text-center text-error';
        message.textContent = 'ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
        main.appendChild(message);
      }
    } finally {
      if (iframeRef.current === iframe) {
        iframe.dataset.ready = 'true';
        iframe.style.visibility = 'visible';
      }
    }
  };

  useEffect(() => () => {
    guidanceCleanupRef.current?.();
    iframeResizeCleanupRef.current?.();
    iframeResizeObserverRef.current?.disconnect();
  }, []);

  useEffect(() => {
    // Keep iframe UI synchronized with the REAL React cart state.
    // The iframe only mounts its initial HTML once, so without this effect the
    // cart page can remain stuck in the imported empty-state even after
    // addToCart/update/remove succeeds.
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const win = iframe?.contentWindow as any;

    if (!doc) return;

    const stateItems = sanitizePersistedCartItems(
      (location.state as any)?.soulmateCartItems
    );

    if (stateItems.length > 0) {
      savePersistedCart(stateItems);
    }

    const effectiveCart = createEffectiveCart(cart);

    if (routeType === 'storefront') ensureHeaderSearchIcon(doc, navigate);
    updateAllCartBadges(doc, effectiveCart.itemCount);

    if (location.pathname === '/cart') {
      removeStorefrontTestModeUI(doc);
      renderCartScreen(doc, win, effectiveCart);
    }

    if (location.pathname === '/checkout') {
      configureCheckoutPaymentMethods(doc);
      renderCheckoutSummary(doc, win, effectiveCart);
    }
  }, [
    location.pathname,
    auth.customerProfile,
    auth.profileLoading,
  ]);

  const iframe = (
    <iframe
      key={`${screen.id}:${screen.htmlPath}:${location.pathname}:${location.search}`}
      ref={iframeRef}
      src={screen.htmlPath}
      title={screen.title}
      className="w-full border-0"
      style={routeType === 'admin' ? { visibility: 'hidden' } : undefined}
      onLoad={showHydratedIframe}
    />
  );

  if (routeType === 'storefront') {
    return (
      <StorefrontShell
        contentClassName={`storefront-embedded-content ${location.pathname.startsWith('/products/') || location.pathname.startsWith('/product/') ? 'storefront-content--product-detail' : ''}`}
        mobileChrome={false}
      >
        <div className="storefront-frame">
          <div className="storefront-frame-loading" role="status">กำลังโหลดข้อมูล…</div>
          {iframe}
        </div>
      </StorefrontShell>
    );
  }

  return <div className="admin-screen bg-surface">{iframe}</div>;
};
