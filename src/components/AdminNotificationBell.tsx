import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle2, Clock3, ExternalLink, PackagePlus, RefreshCw } from 'lucide-react';
import {
  buildAdminNotifications,
  subscribeToAdminNotifications,
  type AdminNotification,
} from '../services/adminNotificationService';
import type { StoreOrder } from '../services/orderService';

const notificationIcons = {
  new_order: PackagePlus,
  slip_review: Clock3,
  cod_confirmation: CheckCircle2,
} as const;

export function AdminNotificationBell({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [panelPosition, setPanelPosition] = useState<CSSProperties>();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const notifications = useMemo(() => buildAdminNotifications(orders), [orders]);
  const visibleNotifications = notifications.slice(0, 10);
  const countLabel = notifications.length > 99 ? '99+' : String(notifications.length);
  const dateLabel = (timestamp: number) => timestamp
    ? new Intl.DateTimeFormat('th-TH', { dateStyle: 'short', timeStyle: 'short' }).format(timestamp)
    : 'เวลาไม่พร้อมใช้งาน';

  useEffect(() => {
    setError('');
    return subscribeToAdminNotifications(setOrders, (cause) => {
      setError(cause.message || 'โหลดการแจ้งเตือนไม่สำเร็จ');
    });
  }, [retryKey]);

  useLayoutEffect(() => {
    if (!open) return;
    const ownerDocument = rootRef.current?.ownerDocument ?? document;
    const ownerWindow = ownerDocument.defaultView ?? window;
    const positionPanel = () => {
      const trigger = rootRef.current?.querySelector('button');
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const viewportWidth = ownerWindow.innerWidth;
      const viewportHeight = ownerWindow.innerHeight;
      const width = Math.min(368, Math.max(0, viewportWidth - 24));
      const left = Math.min(Math.max(12, rect.right - width), Math.max(12, viewportWidth - width - 12));
      const maxPanelHeight = Math.min(760, Math.max(0, viewportHeight - 24));
      const top = Math.min(rect.bottom + 10, Math.max(12, viewportHeight - maxPanelHeight - 12));
      setPanelPosition({ left, top, width, maxHeight: Math.min(maxPanelHeight, Math.max(0, viewportHeight - top - 12)) });
    };
    positionPanel();
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    ownerDocument.addEventListener('pointerdown', handlePointerDown);
    ownerDocument.addEventListener('keydown', handleKeyDown);
    ownerWindow.addEventListener('resize', positionPanel);
    ownerWindow.addEventListener('scroll', positionPanel, true);
    return () => {
      ownerDocument.removeEventListener('pointerdown', handlePointerDown);
      ownerDocument.removeEventListener('keydown', handleKeyDown);
      ownerWindow.removeEventListener('resize', positionPanel);
      ownerWindow.removeEventListener('scroll', positionPanel, true);
    };
  }, [open]);

  const openOrder = (notification: AdminNotification) => {
    setOpen(false);
    const path = `/admin/orders/${encodeURIComponent(notification.orderId)}`;
    if (onNavigate) onNavigate(path);
    else window.location.assign(path);
  };

  const ownerDocument = rootRef.current?.ownerDocument;
  const notificationPanel = open && ownerDocument?.body ? createPortal(
    <section ref={panelRef} className="admin-notification-panel" id="admin-notification-panel" aria-label="รายการแจ้งเตือน" style={panelPosition}>
      <header className="admin-notification-heading">
        <div><h2>แจ้งเตือน</h2><p>รายการล่าสุดที่ต้องจัดการ</p></div>
        {error && <button className="admin-notification-retry" type="button" aria-label="ลองโหลดใหม่" onClick={() => setRetryKey((key) => key + 1)}><RefreshCw size={15} /></button>}
      </header>
      {error
        ? <p className="admin-notification-empty" role="status">โหลดการแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่</p>
        : visibleNotifications.length
          ? <ul className="admin-notification-list">{visibleNotifications.map((item) => {
            const Icon = notificationIcons[item.kind];
            return <li key={item.id}><button className="admin-notification-item" type="button" onClick={() => openOrder(item)}>
              <span className={`admin-notification-icon is-${item.kind}`}><Icon aria-hidden="true" size={17} /></span>
              <span className="admin-notification-copy"><span className="admin-notification-order-line"><strong>{item.orderNumber}</strong><span className={`admin-notification-status is-${item.kind}`}>{item.statusLabel}</span></span><small>{item.detail} · {dateLabel(item.createdAtMillis)}</small></span>
              <ExternalLink aria-hidden="true" className="admin-notification-open-icon" size={15} />
            </button></li>;
          })}</ul>
          : <p className="admin-notification-empty">ไม่มีรายการที่ต้องจัดการ</p>}
      {notifications.length > visibleNotifications.length && <footer className="admin-notification-footer">แสดง 10 รายการล่าสุด</footer>}
    </section>,
    ownerDocument.body,
  ) : null;

  return <>
    <div className="admin-notification" ref={rootRef}>
      <button
        aria-label={notifications.length ? `การแจ้งเตือน ${notifications.length} รายการที่ต้องจัดการ` : 'การแจ้งเตือน'}
        aria-expanded={open}
        aria-controls="admin-notification-panel"
        className="admin-notification-trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <Bell aria-hidden="true" size={19} />
        {notifications.length > 0 && <span aria-hidden="true" className="admin-notification-count">{countLabel}</span>}
      </button>
    </div>
    {notificationPanel}
  </>;
}
