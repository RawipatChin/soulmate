import React from 'react';

export const adminSidebarLinks = [
  { path: '/admin/dashboard', key: 'admin-dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/admin/products', key: 'admin-products', label: 'Products', icon: 'inventory_2' },
  { path: '/admin/orders', key: 'admin-orders', label: 'Orders', icon: 'shopping_bag' },
  { path: '/admin/customers', key: 'admin-customers', label: 'Customers', icon: 'group' },
  { path: '/admin/banners', key: 'admin-banners', label: 'Banners', icon: 'view_carousel' },
  { path: '/admin/coupons', key: 'admin-coupons', label: 'Coupons', icon: 'confirmation_number' },
  { path: '/admin/settings', key: 'admin-settings', label: 'Settings', icon: 'settings' },
];

export function isAdminSidebarLinkCurrent(path: string, pathname: string) {
  return path === '/admin/dashboard'
    ? pathname === path
    : pathname === path || pathname.startsWith(`${path}/`);
}

export function adminSidebarLinkClass(active: boolean) {
  return active
    ? 'flex items-center gap-space-sm px-space-md py-space-sm transition-all bg-primary-container text-on-primary-container font-label-lg rounded-xl shadow-xs'
    : 'flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all';
}

export function AdminSidebarNav({ pathname, onNavigate }: { pathname: string; onNavigate?: (path: string) => void }) {
  return <>
    {adminSidebarLinks.map((item) => {
      const active = isAdminSidebarLinkCurrent(item.path, pathname);
      return <a
        key={item.key}
        data-path={item.key}
        data-route={item.path}
        href={item.path}
        onClick={onNavigate ? (event) => { event.preventDefault(); onNavigate(item.path); } : undefined}
        aria-current={active ? 'page' : undefined}
        className={adminSidebarLinkClass(active)}
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </a>;
    })}
  </>;
}
