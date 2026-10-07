import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bell, GalleryHorizontal, LayoutDashboard, LogOut, Menu, Package, Settings, ShoppingBag, TicketPercent, UserRound, UsersRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getOrder,
  listAdminOrders,
  listMyOrders,
  startPromptPay,
  type StoreOrder,
} from '../services/orderService';
import './order-pages.css';

const money = (satang: number) => `฿${(satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
const dateText = (order: StoreOrder) => order.createdAt?.toDate?.().toLocaleString('th-TH') ?? 'กำลังบันทึกเวลา';
const paymentText = (order: StoreOrder) => order.payment?.status === 'successful'
  ? 'ชำระแล้ว'
  : order.payment?.status === 'expired'
    ? 'หมดอายุ'
    : order.payment?.status === 'failed'
      ? 'ชำระไม่สำเร็จ'
      : 'รอชำระเงิน';

const adminNavigation = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/customers', label: 'Customers', icon: UsersRound },
  { to: '/admin/banners', label: 'Banners', icon: GalleryHorizontal },
  { to: '/admin/coupons', label: 'Coupons', icon: TicketPercent },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
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
        <div className="admin-order-logo"><Link to="/admin/dashboard" onClick={() => setDrawerOpen(false)}><img src="/logo-soulmate.png" alt="SOULMATE" /></Link><button className="admin-order-close" aria-label="ปิดเมนู" onClick={() => setDrawerOpen(false)}><X size={20} /></button></div>
        <p className="admin-order-nav-label">Navigation</p>
        <nav aria-label="เมนูแอดมิน">{adminNavigation.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setDrawerOpen(false)} className={({ isActive }) => `admin-order-nav-link${isActive ? ' is-active' : ''}`}><Icon size={20} /><span>{label}</span></NavLink>)}</nav>
      </div>
      <div className="admin-order-sidebar-bottom"><div className="admin-order-profile"><div className="admin-order-role"><span>Role</span><strong>Super Admin</strong></div><div className="admin-order-user"><span className="admin-order-avatar"><UserRound size={18} /></span><span><strong>Admin User</strong><small>{auth.customerProfile?.email || ''}</small></span></div></div><button className="admin-order-logout" onClick={logout}><LogOut size={18} />ออกจากระบบ</button></div>
    </aside>
    <div className="admin-order-content"><header className="admin-order-topbar"><div><button className="admin-order-menu" aria-label="เปิดเมนู" onClick={() => setDrawerOpen(true)}><Menu size={24} /></button><h1>Orders</h1></div><div className="admin-order-top-actions"><Link className="admin-order-storefront-link" to="/"><ArrowLeft size={18} />กลับไปหน้าร้าน</Link><button aria-label="การแจ้งเตือน" type="button"><Bell size={20} /></button><span className="admin-order-avatar"><UserRound size={18} /></span><span className="admin-order-user-name">Admin User</span></div></header>{children}</div>
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
  useEffect(() => {
    let alive = true;
    setBusy(true);
    (orderId ? getOrder(orderId).then((value) => { if (alive) setOrder(value); }) : listAdminOrders().then((value) => { if (alive) setOrders(value); }))
      .catch(() => { if (alive) setError('โหลดคำสั่งซื้อไม่สำเร็จ หรือบัญชีนี้ไม่มีสิทธิ์ดูข้อมูล'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [orderId]);
  if (orderId) return <AdminOrderShell><OrderDetail order={order} busy={busy} error={error} admin /></AdminOrderShell>;
  return <AdminOrderShell><main className="order-page order-page-admin"><Link className="order-back" to="/admin/dashboard">← หลังบ้าน</Link><header className="order-heading"><p>จัดการร้านค้า</p><h1>คำสั่งซื้อ</h1><span>guest และลูกค้าที่เข้าสู่ระบบ</span></header>{error && <p className="order-error">{error}</p>}{busy ? <p className="order-empty">กำลังโหลดคำสั่งซื้อ…</p> : <OrderRows orders={orders} admin />}</main></AdminOrderShell>;
}

export function OrderConfirmationPage() {
  const location = useLocation();
  const orderId = useMemo(() => new URLSearchParams(location.search).get('orderId'), [location.search]);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [error, setError] = useState('');
  const [showEmailDemo, setShowEmailDemo] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');
  const isEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
  const omiseEnabled = import.meta.env.VITE_OMISE_TEST_MODE_ENABLED === 'true';
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
      value ? setOrder(value) : setError('ไม่พบคำสั่งซื้อใน session นี้');
    })
      .catch(() => { if (alive) setError('ไม่สามารถเปิดคำสั่งซื้อนี้ได้จาก session ปัจจุบัน'); });
    void refresh();
    const shouldPoll = order?.payment?.status === 'pending';
    const poll = shouldPoll ? window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 5000) : undefined;
    return () => { alive = false; if (poll) window.clearInterval(poll); };
  }, [orderId, order?.payment?.status]);
  const beginPayment = async () => {
    if (!order) return;
    setPayBusy(true); setPayError('');
    try {
      const result = await startPromptPay(order.id);
      setOrder({ ...order, payment: { ...order.payment, chargeId: result.chargeId, qrUrl: result.qrUrl } });
    } catch (cause) {
      setPayError((cause as Error).message || 'ยังเริ่มชำระผ่าน PromptPay ไม่ได้');
    } finally { setPayBusy(false); }
  };
  if (error) return <main className="order-page"><section className="order-panel"><h1>เปิดคำสั่งซื้อไม่ได้</h1><p>{error}</p><Link className="order-primary" to="/products">กลับไปเลือกสินค้า</Link></section></main>;
  if (!order) return <main className="order-page"><p className="order-empty">กำลังโหลดคำสั่งซื้อ…</p></main>;
  return <main className="order-page order-confirmation">
    <section className="order-panel order-success-panel">
      <span className="order-success-icon" aria-hidden="true">✓</span>
      <p className="order-eyebrow">บันทึกคำสั่งซื้อแล้ว</p>
      <h1>ขอบคุณที่สั่งซื้อ</h1>
      <p>เลขคำสั่งซื้อ <strong>{order.orderNumber}</strong></p>
      <div className="order-status"><span>สถานะคำสั่งซื้อ</span><strong>{paymentText(order)}</strong></div>
      <p className="order-payment-note">{order.payment?.status === 'successful'
        ? 'Omise ยืนยันการชำระเงินสำเร็จแล้ว'
        : order.payment?.status === 'expired'
          ? 'QR PromptPay หมดอายุแล้ว กรุณาสร้างคำสั่งซื้อใหม่'
          : order.payment?.status === 'failed'
            ? 'การชำระเงินไม่สำเร็จ กรุณาสร้างคำสั่งซื้อใหม่'
            : 'บันทึกคำสั่งซื้อแล้ว แต่ยังไม่ถือว่าชำระเงินสำเร็จ'}</p>
      <div className="order-totals"><span>สินค้า {money(order.subtotalSatang)}</span><span>จัดส่ง {money(order.shippingFeeSatang)}</span><strong>ยอดรวม {money(order.totalSatang)}</strong></div>
      {order.payment?.status === 'successful'
        ? <p className="order-paid-note">ชำระเงินเรียบร้อยแล้ว</p>
        : order.payment?.status === 'expired' || order.payment?.status === 'failed'
          ? null
          : order.payment?.qrUrl
            ? <div className="order-qr"><img src={order.payment.qrUrl} alt="QR สำหรับชำระเงิน PromptPay"/><p>สแกน QR เพื่อชำระผ่าน Omise Test Mode</p></div>
            : <><button className="order-primary" disabled={payBusy || !omiseEnabled || isEmulator} onClick={beginPayment}>{payBusy ? 'กำลังเชื่อมต่อ…' : 'ชำระผ่าน PromptPay'}</button><p className="order-demo-note">{isEmulator ? 'Emulator บันทึกออเดอร์ทดสอบได้ แต่ยังไม่เชื่อมการชำระเงินจริง' : !omiseEnabled ? 'ยังไม่ได้ตั้งค่า Omise Test Mode และยังไม่สามารถเปิด QR PromptPay ได้' : ''}</p></>}
      {payError && <p className="order-error">{payError}</p>}
      <Link className="order-secondary" to="/products">เลือกซื้อสินค้าต่อ</Link>
    </section>
    {showEmailDemo && <div className="order-modal-backdrop" role="presentation"><section aria-labelledby="email-demo-title" aria-modal="true" className="order-modal" role="dialog"><button aria-label="ปิด" className="order-modal-close" onClick={() => setShowEmailDemo(false)}>×</button><span className="order-mail-icon">✉</span><p className="order-eyebrow">ตัวอย่างการแจ้งเตือน</p><h2 id="email-demo-title">เตรียมข้อมูลอีเมลไว้แล้ว</h2><p>อีเมลติดต่อ: <strong>{order.contact.email}</strong></p><p>เลขคำสั่งซื้อ: <strong>{order.orderNumber}</strong></p><p className="order-demo-note">นี่เป็นเพียงป๊อปอัปสาธิต ระบบยังไม่ได้ส่งอีเมลจริง{order.payment?.status === 'successful' ? ' และได้รับการชำระเงินแล้ว' : order.payment?.status === 'expired' ? ' และ QR หมดอายุแล้ว' : order.payment?.status === 'failed' ? ' และการชำระเงินไม่สำเร็จ' : ' และคำสั่งซื้อนี้ยังรอชำระเงิน'}</p><button className="order-primary" onClick={() => setShowEmailDemo(false)}>รับทราบ</button></section></div>}
  </main>;
}

function OrderDetail({ order, busy, error, admin = false }: { order: StoreOrder | null; busy: boolean; error: string; admin?: boolean }) {
  return <main className="order-page"><Link className="order-back" to={admin ? '/admin/orders' : '/account/orders'}>← กลับไปรายการคำสั่งซื้อ</Link>{busy ? <p className="order-empty">กำลังโหลดคำสั่งซื้อ…</p> : error || !order ? <p className="order-error">{error || 'ไม่พบคำสั่งซื้อ'}</p> : <section className="order-panel"><p className="order-eyebrow">รายละเอียดคำสั่งซื้อ</p><h1>{order.orderNumber}</h1><p>{dateText(order)} · {paymentText(order)}</p>{admin && <div className="order-contact"><strong>{order.contact.firstName} {order.contact.lastName}</strong><span>{order.contact.email}</span><span>{order.contact.phone}</span><span>{order.contact.addressLine1}, {order.contact.subdistrict}, {order.contact.district}, {order.contact.province} {order.contact.postalCode}</span></div>}<div className="order-items">{order.items.map((item, index) => <div className="order-item" key={`${item.productId}-${item.variantId}-${index}`}><span>{item.productName}{item.variantName ? ` · ${item.variantName}` : ''} × {item.quantity}</span><strong>{money(item.lineTotalSatang)}</strong></div>)}</div><div className="order-totals"><span>สินค้า {money(order.subtotalSatang)}</span><span>จัดส่ง {money(order.shippingFeeSatang)}</span><strong>รวม {money(order.totalSatang)}</strong></div></section>}</main>;
}
