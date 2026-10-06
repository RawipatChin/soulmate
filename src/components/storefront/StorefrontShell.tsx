import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getCartSnapshot } from '../../services/cartService';
import './storefront.css';

type StorefrontShellProps = {
  children: React.ReactNode;
  /** Hide React navigation on mobile when the embedded Stitch screen owns it. */
  mobileChrome?: boolean;
  contentClassName?: string;
};

const primaryLinks = [
  { label: 'หน้าแรก', path: '/' },
  { label: 'สินค้า', path: '/products' },
];

export function StorefrontShell({
  children,
  mobileChrome = true,
  contentClassName = '',
}: StorefrontShellProps) {
  const location = useLocation();
  const [cartCount, setCartCount] = useState(() => getCartSnapshot().itemCount);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const refreshCart = () => setCartCount(getCartSnapshot().itemCount);
    window.addEventListener('soulmate-cart-updated', refreshCart);
    window.addEventListener('storage', refreshCart);
    refreshCart();
    return () => {
      window.removeEventListener('soulmate-cart-updated', refreshCart);
      window.removeEventListener('storage', refreshCart);
    };
  }, []);

  useEffect(() => setMenuOpen(false), [location.pathname]);
  const active = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <div className={`storefront-shell ${mobileChrome ? 'storefront-shell--mobile' : 'storefront-shell--embedded'}`}>
      <header className="storefront-header">
        <div className="storefront-header-inner">
          <button
            aria-label={menuOpen ? 'ปิดเมนู' : 'เปิดเมนู'}
            aria-expanded={menuOpen}
            className="storefront-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            type="button"
          >
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>
          <Link aria-label="SOULMATE หน้าแรก" className="storefront-brand" to="/">
            <img src="/logo-soulmate.png" alt="SOULMATE Health & Beauty" />
          </Link>

          <nav aria-label="เมนูหลัก" className={`storefront-primary-nav ${menuOpen ? 'is-open' : ''}`}>
            {primaryLinks.map((item) => (
              <Link
                aria-current={active(item.path) ? 'page' : undefined}
                className={active(item.path) ? 'is-active' : ''}
                key={item.path}
                to={item.path}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="storefront-header-actions">
            <Link aria-label={`ตะกร้าสินค้า ${cartCount} ชิ้น`} className="storefront-icon-link storefront-cart-link" to="/cart">
              <span className="material-symbols-outlined">shopping_bag</span>
              <span className="storefront-action-label">ตะกร้า</span>
              <span aria-live="polite" className="storefront-cart-count">{cartCount}</span>
            </Link>
            <Link aria-label="บัญชีผู้ใช้" className="storefront-icon-link" to="/account">
              <span className="material-symbols-outlined">person</span>
              <span className="storefront-action-label">บัญชี</span>
            </Link>
          </div>
        </div>
      </header>

      {menuOpen && <button aria-label="ปิดเมนู" className="storefront-menu-backdrop" onClick={() => setMenuOpen(false)} type="button" />}

      <main className={`storefront-content ${contentClassName}`}>{children}</main>

      <nav aria-label="เมนูด้านล่าง" className="storefront-mobile-tabs">
        <Link aria-current={active('/') ? 'page' : undefined} to="/">
          <span className="material-symbols-outlined">home</span><span>หน้าแรก</span>
        </Link>
        <Link aria-current={active('/products') ? 'page' : undefined} to="/products">
          <span className="material-symbols-outlined">grid_view</span><span>สินค้า</span>
        </Link>
        <Link aria-current={active('/cart') ? 'page' : undefined} to="/cart">
          <span className="material-symbols-outlined">shopping_bag</span><span>ตะกร้า</span>
        </Link>
        <Link aria-current={active('/account') ? 'page' : undefined} to="/account">
          <span className="material-symbols-outlined">person</span><span>บัญชี</span>
        </Link>
      </nav>

      <footer className="storefront-footer">
        <div className="storefront-footer-inner">
          <Link className="storefront-footer-brand" to="/">SOULMATE</Link>
          <nav aria-label="ข้อมูลเพิ่มเติม">
            <Link to="/about">เกี่ยวกับเรา</Link>
            <Link to="/contact">ติดต่อเรา</Link>
            <Link to="/privacy">นโยบายความเป็นส่วนตัว</Link>
            <Link to="/terms">ข้อกำหนดการใช้งาน</Link>
          </nav>
          <span>Health &amp; Beauty</span>
        </div>
      </footer>
    </div>
  );
}
