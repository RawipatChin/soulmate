import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, ExternalLink, LogOut, RefreshCw, Search, UserRound, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getOrder,
  listAdminOrders,
  listMyOrders,
  type StoreOrder,
} from '../services/orderService';
import './order-pages.css';

const money = (satang: number) => `฿${(satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
const dateText = (order: StoreOrder) => order.createdAt?.toDate?.().toLocaleString('th-TH') ?? 'กำลังบันทึกเวลา';
const expiryText = (order: StoreOrder) => order.expiresAt?.toDate?.().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) ?? '';
const isPaid = (order: StoreOrder) => order.payment?.status === 'successful' || order.status === 'paid';
const isFailedPayment = (order: StoreOrder) => ['failed', 'expired'].includes(order.payment?.status ?? '') || ['payment_failed', 'expired'].includes(order.status);
const paymentText = (order: StoreOrder) => order.payment?.status === 'successful'
  ? 'ชำระแล้ว'
  : isPaid(order)
    ? 'ชำระแล้ว'
    : order.payment?.status === 'expired' || order.status === 'expired'
    ? 'หมดอายุ'
    : order.payment?.status === 'failed' || order.status === 'payment_failed'
      ? 'ชำระไม่สำเร็จ'
      : 'รอชำระเงิน';
const paymentKind = (order: StoreOrder) => order.payment?.method === 'promptpay' ? 'PromptPay' : 'ยังไม่ระบุ';
const orderDate = (order: StoreOrder) => order.createdAt?.toDate?.() ?? null;
const dayTime = (order: StoreOrder) => orderDate(order)?.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) ?? 'กำลังบันทึกเวลา';

const adminNavigation = [
  { to: '/admin/dashboard', label: 'ภาพรวม', icon: 'dashboard' },
  { to: '/admin/products', label: 'สินค้าและสต็อก', icon: 'inventory_2' },
  { to: '/admin/orders', label: 'คำสั่งซื้อ', icon: 'shopping_bag' },
  { to: '/admin/customers', label: 'ลูกค้า', icon: 'group' },
  { to: '/admin/banners', label: 'แบนเนอร์', icon: 'view_carousel' },
  { to: '/admin/coupons', label: 'คูปอง', icon: 'confirmation_number' },
  { to: '/admin/settings', label: 'ตั้งค่า', icon: 'settings' },
];

function AdminOrderShell({ children }: { children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const logout = async () => {
    await auth.logout();
    navigate('/admin/login', { replace: true });
  };

  return <div className="admin-order-shell">
    {drawerOpen && <button className="admin-order-backdrop" aria-label="ปิดเมนู" onClick={() => setDrawerOpen(false)} />}
    <aside className={`admin-order-sidebar${drawerOpen ? ' is-open' : ''}`}>
      <div>
        <div className="admin-order-logo"><Link to="/admin/dashboard" onClick={() => setDrawerOpen(false)}><img src="/logo-soulmate.png" alt="SOULMATE" /></Link><button className="admin-order-close" aria-label="ปิดเมนู" onClick={() => setDrawerOpen(false)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div>
        <p className="admin-order-nav-label">จัดการร้าน</p>
        <nav aria-label="เมนูแอดมิน">{adminNavigation.map(({ to, label, icon }) => <NavLink key={to} to={to} onClick={() => setDrawerOpen(false)} className={({ isActive }) => `admin-order-nav-link${isActive ? ' is-active' : ''}`}><span className="material-symbols-outlined" aria-hidden="true">{icon}</span><span>{label}</span></NavLink>)}</nav>
      </div>
      <div className="admin-order-sidebar-bottom"><div className="admin-order-profile"><div className="admin-order-role"><span>สิทธิ์การใช้งาน</span><strong>ผู้ดูแลระบบ</strong></div><div className="admin-order-user"><span className="admin-order-avatar"><UserRound size={18} /></span><span><strong>ทีม SOULMATE</strong><small>{auth.customerProfile?.email || ''}</small></span></div></div><button className="admin-order-logout" onClick={logout}><LogOut size={18} />ออกจากระบบ</button></div>
    </aside>
    <div className="admin-order-content"><header className="admin-order-topbar"><div><button className="admin-order-menu" aria-label="เปิดเมนู" onClick={() => setDrawerOpen(true)}><span className="material-symbols-outlined" aria-hidden="true">menu</span></button><h1>คำสั่งซื้อ</h1></div><div className="admin-order-top-actions"><Link className="admin-order-storefront-link" to="/" aria-label="กลับไปหน้าร้าน"><span className="material-symbols-outlined" aria-hidden="true">storefront</span><span>กลับไปหน้าร้าน</span></Link><button className="admin-order-notifications" type="button" aria-label="การแจ้งเตือน"><span className="material-symbols-outlined" aria-hidden="true">notifications</span><span className="admin-order-notification-dot" /></button><span className="admin-order-user-divider" /><span className="admin-order-avatar"><UserRound size={18} /></span><span className="admin-order-user-name">ผู้ดูแลระบบ</span></div></header>{children}</div>
  </div>;
}

function OrderRows({ orders, admin = false }: { orders: StoreOrder[]; admin?: boolean }) {
  if (!orders.length) return <div className="order-empty">ยังไม่มีคำสั่งซื้อ</div>;
  return <div className="order-list">{orders.map((order) => (
    <Link className="order-row" key={order.id} to={`${admin ? '/admin/orders' : '/account/orders'}/${order.id}`}>
      <span className="order-row-main"><strong>{order.orderNumber}</strong><small>{dateText(order)}{admin ? ` · ${order.contact?.email ?? ''}` : ''}</small></span>
      <span className="order-row-end"><strong>{money(order.totalSatang)}</strong><small>{paymentText(order)}</small></span>
    </Link>
  ))}</div>;
}

export function CustomerOrdersPage() {
  const { orderId } = useParams();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let alive = true;
    setBusy(true);
    (orderId ? getOrder(orderId).then((value) => { if (alive) setOrder(value); }) : listMyOrders().then((value) => { if (alive) setOrders(value); }))
      .catch(() => { if (alive) setError('โหลดคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [orderId]);
  if (orderId) return <OrderDetail order={order} busy={busy} error={error} />;
  return <main className="order-page"><Link className="order-back" to="/account">← บัญชีของฉัน</Link><header className="order-heading"><p>บัญชีของฉัน</p><h1>คำสั่งซื้อของฉัน</h1><span>รายการที่บันทึกไว้ในบัญชีนี้</span></header>{error && <p className="order-error">{error}</p>}{busy ? <p className="order-empty">กำลังโหลดคำสั่งซื้อ…</p> : <OrderRows orders={orders} />}</main>;
}

export function AdminOrdersPage() {
  const { orderId } = useParams();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [queryText, setQueryText] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [selectedId, setSelectedId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setBusy(true);
    (orderId ? getOrder(orderId).then((value) => { if (alive) setOrder(value); }) : listAdminOrders().then((value) => { if (alive) setOrders(value); }))
      .catch(() => { if (alive) setError('โหลดคำสั่งซื้อไม่สำเร็จ หรือบัญชีนี้ไม่มีสิทธิ์ดูข้อมูล'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [orderId, refreshKey]);
  if (orderId) return <AdminOrderShell><OrderDetail order={order} busy={busy} error={error} admin /></AdminOrderShell>;
  const counts = {
    all: orders.length,
    pending: orders.filter((item) => !isPaid(item) && !isFailedPayment(item)).length,
    paid: orders.filter(isPaid).length,
    failed: orders.filter(isFailedPayment).length,
  };
  const visibleOrders = orders.filter((item) => {
    const statusMatches = paymentFilter === 'all' || (paymentFilter === 'paid' ? isPaid(item) : paymentFilter === 'pending' ? !isPaid(item) && !isFailedPayment(item) : isFailedPayment(item));
    const haystack = [item.orderNumber, item.contact?.firstName, item.contact?.lastName, item.contact?.phone, item.contact?.email].join(' ').toLocaleLowerCase('th-TH');
    return statusMatches && haystack.includes(queryText.trim().toLocaleLowerCase('th-TH'));
  });
  const selectedOrder = visibleOrders.find((item) => item.id === selectedId) ?? visibleOrders[0] ?? null;
  const chooseFilter = (filter: typeof paymentFilter) => setPaymentFilter(filter);
  return <AdminOrderShell><main className="order-page order-page-admin">
    <div className="order-toolbar"><div><h2>คิวคำสั่งซื้อ</h2><p>ตรวจสถานะชำระเงินและเปิดรายละเอียดได้จากรายการเดียว</p></div><button className="order-refresh" type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={busy}><RefreshCw size={16} className={busy ? 'is-spinning' : ''} />รีเฟรช</button></div>
    <section className="order-workbench" aria-label="คิวและรายละเอียดคำสั่งซื้อ">
      <div className="order-queue">
        <div className="order-queue-tools"><label className="order-search"><Search size={17} aria-hidden="true" /><input value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="ค้นหาเลขออเดอร์ ชื่อ เบอร์โทร" aria-label="ค้นหาคำสั่งซื้อ" /></label>
          <div className="order-filters" role="group" aria-label="กรองตามสถานะชำระเงิน">
            {([['all', 'ทั้งหมด'], ['pending', 'รอชำระ'], ['paid', 'ชำระแล้ว'], ['failed', 'ไม่สำเร็จ']] as const).map(([key, label]) => <button key={key} type="button" className={paymentFilter === key ? 'is-active' : ''} aria-pressed={paymentFilter === key} onClick={() => chooseFilter(key)}>{label}<span>{counts[key]}</span></button>)}
          </div>
        </div>
        {error && <div className="order-error" role="alert">{error}<button type="button" onClick={() => setRefreshKey((key) => key + 1)}>ลองอีกครั้ง</button></div>}
        {busy ? <div className="order-loading" role="status"><span className="order-loading-mark" />กำลังโหลดคิวคำสั่งซื้อ…</div> : visibleOrders.length ? <div className="order-queue-list" aria-label="คำสั่งซื้อ">
          {visibleOrders.map((item) => <button className={`order-queue-item${selectedOrder?.id === item.id ? ' is-selected' : ''}`} key={item.id} type="button" aria-pressed={selectedOrder?.id === item.id} onClick={() => setSelectedId(item.id)}>
            <span className="order-queue-item-top"><strong>{item.orderNumber || item.id}</strong><small>{dayTime(item)}</small></span>
            <span className="order-queue-item-bottom"><span>{`${item.contact?.firstName ?? ''} ${item.contact?.lastName ?? ''}`.trim() || 'ลูกค้าทั่วไป'}</span><strong>{money(item.totalSatang)}</strong></span>
            <span className={`order-status-chip ${isPaid(item) ? 'is-paid' : isFailedPayment(item) ? 'is-failed' : 'is-pending'}`}>{isPaid(item) ? <CheckCircle2 size={14} /> : isFailedPayment(item) ? <XCircle size={14} /> : <Clock3 size={14} />}{paymentText(item)}</span>
          </button>)}
        </div> : <div className="order-queue-empty"><span className="order-empty-icon"><Search size={20} /></span><strong>{orders.length ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีคำสั่งซื้อ'}</strong><p>{orders.length ? 'ลองค้นหาด้วยคำอื่น หรือเลือกสถานะทั้งหมด' : 'ออเดอร์ใหม่จะแสดงที่นี่เมื่อมีการสั่งซื้อจากหน้าร้าน'}</p>{orders.length > 0 && <button type="button" onClick={() => { setQueryText(''); setPaymentFilter('all'); }}>ล้างตัวกรอง</button>}</div>}
        {!busy && orders.length > 0 && <div className="order-queue-footer">แสดง {visibleOrders.length} จาก {orders.length} รายการ</div>}
      </div>
      <aside className="order-inspector" aria-label="รายละเอียดรายการที่เลือก">
        {selectedOrder ? <>
          <div className="order-inspector-head"><div><span>รายละเอียดออเดอร์</span><h3>{selectedOrder.orderNumber || selectedOrder.id}</h3></div><Link to={`/admin/orders/${encodeURIComponent(selectedOrder.id)}`} aria-label="เปิดรายละเอียดเต็ม"><ExternalLink size={17} /></Link></div>
          <div className={`order-payment-state ${isPaid(selectedOrder) ? 'is-paid' : isFailedPayment(selectedOrder) ? 'is-failed' : 'is-pending'}`}><span>{isPaid(selectedOrder) ? <CheckCircle2 size={18} /> : isFailedPayment(selectedOrder) ? <XCircle size={18} /> : <Clock3 size={18} />}</span><div><strong>{paymentText(selectedOrder)}</strong><small>{paymentKind(selectedOrder)}</small></div></div>
          <div className="order-inspector-section"><h4>ลูกค้า</h4><strong>{`${selectedOrder.contact?.firstName ?? ''} ${selectedOrder.contact?.lastName ?? ''}`.trim() || 'ลูกค้าทั่วไป'}</strong><span>{selectedOrder.contact?.phone || 'ไม่ระบุเบอร์โทร'}</span><span>{selectedOrder.contact?.email || 'ไม่ระบุอีเมล'}</span><small>{selectedOrder.ownerType === 'guest' ? 'สั่งซื้อแบบไม่สมัครสมาชิก' : 'สมาชิก SOULMATE'}</small></div>
          <div className="order-inspector-section"><h4>สินค้าในออเดอร์ <span>{selectedOrder.items.length} รายการ</span></h4>{selectedOrder.items.map((item, index) => <div className="order-inspector-product" key={`${item.productId}-${item.variantId}-${index}`}><span>{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}<small>จำนวน {item.quantity}</small></span><strong>{money(item.lineTotalSatang)}</strong></div>)}</div>
          <div className="order-inspector-total"><span>ยอดสินค้า</span><strong>{money(selectedOrder.subtotalSatang)}</strong><span>ค่าจัดส่ง</span><strong>{money(selectedOrder.shippingFeeSatang)}</strong><span className="is-grand-total">ยอดรวม</span><strong className="is-grand-total">{money(selectedOrder.totalSatang)}</strong></div>
          <Link className="order-open-detail" to={`/admin/orders/${encodeURIComponent(selectedOrder.id)}`}>ดูข้อมูลจัดส่งและรายละเอียดเต็ม<ExternalLink size={16} /></Link>
        </> : <div className="order-inspector-placeholder"><span className="order-empty-icon"><ExternalLink size={20} /></span><strong>เลือกรายการเพื่อดูรายละเอียด</strong><p>สถานะชำระเงิน ข้อมูลลูกค้า และสินค้า จะแสดงที่นี่</p></div>}
      </aside>
    </section>
  </main></AdminOrderShell>;
}

export function OrderConfirmationPage() {
  const location = useLocation();
  const orderId = useMemo(() => new URLSearchParams(location.search).get('orderId'), [location.search]);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [error, setError] = useState('');
  const [showEmailDemo, setShowEmailDemo] = useState(false);
  useEffect(() => {
    if (!orderId) return;
    const demoOrderId = sessionStorage.getItem('soulmate_email_demo_order');
    if (demoOrderId === orderId) {
      sessionStorage.removeItem('soulmate_email_demo_order');
      setShowEmailDemo(true);
    }
  }, [orderId]);
  useEffect(() => {
    if (!orderId) { setError('ไม่พบเลขอ้างอิงคำสั่งซื้อ'); return; }
    let alive = true;
    const refresh = () => getOrder(orderId).then((value) => {
      if (!alive) return;
      if (value) { setOrder(value); setError(''); }
      else setError('ไม่พบคำสั่งซื้อใน session นี้');
    })
      .catch(() => { if (alive) setError('ไม่สามารถเปิดคำสั่งซื้อนี้ได้จาก session ปัจจุบัน'); });
    void refresh();
    return () => { alive = false; };
  }, [orderId]);
  if (error) return <main className="order-page"><section className="order-panel"><h1>เปิดคำสั่งซื้อไม่ได้</h1><p>{error}</p><Link className="order-primary" to="/products">กลับไปเลือกสินค้า</Link></section></main>;
  if (!order) return <main className="order-page"><p className="order-empty">กำลังโหลดคำสั่งซื้อ…</p></main>;
  return <main className="order-page order-confirmation">
    <section className="order-panel order-success-panel">
      <span className="order-success-icon" aria-hidden="true">✓</span>
      <p className="order-eyebrow">บันทึกคำสั่งซื้อแล้ว</p>
      <h1>ขอบคุณที่สั่งซื้อ</h1>
      <p>เลขคำสั่งซื้อ <strong>{order.orderNumber}</strong></p>
      <div className="order-status"><span>สถานะคำสั่งซื้อ</span><strong>{paymentText(order)}</strong></div>
      {order.payment?.status === 'pending' && expiryText(order) && <p className="order-demo-note">ออเดอร์ทดสอบนี้จะหมดเวลารอชำระเวลา {expiryText(order)} น. หลังจากนั้นระบบจะปิดคำสั่งซื้อและคืนสต็อกเมื่อมีการเรียกใช้งานครั้งถัดไป</p>}
      <p className="order-payment-note">{order.payment?.status === 'successful'
        ? 'Omise ยืนยันการชำระเงินสำเร็จแล้ว'
        : order.payment?.status === 'expired'
          ? 'คำสั่งซื้อหมดอายุแล้ว กรุณาสร้างคำสั่งซื้อใหม่'
          : order.payment?.status === 'failed'
            ? 'การชำระเงินไม่สำเร็จ กรุณาสร้างคำสั่งซื้อใหม่'
            : 'บันทึกคำสั่งซื้อแล้ว แต่ยังไม่ถือว่าชำระเงินสำเร็จ'}</p>
      <div className="order-totals"><span>สินค้า {money(order.subtotalSatang)}</span><span>จัดส่ง {money(order.shippingFeeSatang)}</span><strong>ยอดรวม {money(order.totalSatang)}</strong></div>
      {order.payment?.status === 'successful'
        ? <p className="order-paid-note">ชำระเงินเรียบร้อยแล้ว</p>
        : order.payment?.status === 'expired' || order.payment?.status === 'failed'
          ? null
          : <p className="order-demo-note">บันทึกออเดอร์แล้ว ระบบทดสอบยังไม่เปิดการชำระเงิน</p>}
      <Link className="order-secondary" to="/products">เลือกซื้อสินค้าต่อ</Link>
    </section>
    {showEmailDemo && <div className="order-modal-backdrop" role="presentation"><section aria-labelledby="email-demo-title" aria-modal="true" className="order-modal" role="dialog"><button aria-label="ปิด" className="order-modal-close" onClick={() => setShowEmailDemo(false)}>×</button><span className="order-mail-icon">✉</span><p className="order-eyebrow">ตัวอย่างการแจ้งเตือน</p><h2 id="email-demo-title">เตรียมข้อมูลอีเมลไว้แล้ว</h2><p>อีเมลติดต่อ: <strong>{order.contact.email}</strong></p><p>เลขคำสั่งซื้อ: <strong>{order.orderNumber}</strong></p><p className="order-demo-note">นี่เป็นเพียงป๊อปอัปสาธิต ระบบยังไม่ได้ส่งอีเมลจริง{order.payment?.status === 'successful' ? ' และได้รับการชำระเงินแล้ว' : order.payment?.status === 'expired' ? ' และคำสั่งซื้อหมดอายุแล้ว' : order.payment?.status === 'failed' ? ' และการชำระเงินไม่สำเร็จ' : ' และคำสั่งซื้อนี้ยังรอชำระเงิน'}</p><button className="order-primary" onClick={() => setShowEmailDemo(false)}>รับทราบ</button></section></div>}
  </main>;
}

function OrderDetail({ order, busy, error, admin = false }: { order: StoreOrder | null; busy: boolean; error: string; admin?: boolean }) {
  return <main className="order-page"><Link className="order-back" to={admin ? '/admin/orders' : '/account/orders'}>← กลับไปรายการคำสั่งซื้อ</Link>{busy ? <p className="order-empty">กำลังโหลดคำสั่งซื้อ…</p> : error || !order ? <p className="order-error">{error || 'ไม่พบคำสั่งซื้อ'}</p> : <section className="order-panel"><p className="order-eyebrow">รายละเอียดคำสั่งซื้อ</p><h1>{order.orderNumber}</h1><p>{dateText(order)} · {paymentText(order)}</p>{admin && <div className="order-contact"><strong>{order.contact.firstName} {order.contact.lastName}</strong><span>{order.contact.email}</span><span>{order.contact.phone}</span><span>{order.contact.addressLine1}, {order.contact.subdistrict}, {order.contact.district}, {order.contact.province} {order.contact.postalCode}</span></div>}<div className="order-items">{order.items.map((item, index) => <div className="order-item" key={`${item.productId}-${item.variantId}-${index}`}><span>{item.productName}{item.variantName ? ` · ${item.variantName}` : ''} × {item.quantity}</span><strong>{money(item.lineTotalSatang)}</strong></div>)}</div><div className="order-totals"><span>สินค้า {money(order.subtotalSatang)}</span><span>จัดส่ง {money(order.shippingFeeSatang)}</span><strong>รวม {money(order.totalSatang)}</strong></div></section>}</main>;
}
