import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, ExternalLink, LogOut, RefreshCw, Search, UserRound, XCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import {
  getOrder,
  listAdminOrders,
  listMyOrders,
  loadOrderSlip,
  getPromptPaySettings,
  acceptCodOrder,
  reviewOrder,
  updateFulfillmentStatus,
  createLabelGeneration,
  getLabelGenerations,
  updateOrderContact,
  updateOrderTrackingNumber,
  savePromptPaySettings,
  submitOrderSlip,
  type StoreOrder,
} from '../services/orderService';
import { promptPayPayload } from '../services/promptPayQr';
import './order-pages.css';
import { AdminSidebarNav } from './admin/AdminSidebarNav';
import { AdminNotificationBell } from './AdminNotificationBell';
import './admin-notifications.css';

const money = (satang: number) => `฿${(satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
const dateText = (order: StoreOrder) => order.createdAt?.toDate?.().toLocaleString('th-TH') ?? 'กำลังบันทึกเวลา';
const slipDeadline = (order: StoreOrder) => (order.createdAt?.toMillis?.() ?? 0) + 24 * 60 * 60 * 1000;
const expiryText = (order: StoreOrder) => order.schemaVersion === 2 && order.createdAt
  ? new Date(slipDeadline(order)).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) : '';
const isPaid = (order: StoreOrder) => order.payment?.status === 'successful' || order.status === 'paid';
const isFailedPayment = (order: StoreOrder) => ['failed', 'expired', 'cancelled'].includes(order.payment?.status ?? '') || ['payment_failed', 'expired', 'cancelled'].includes(order.status);
type QueueCategory = 'pending' | 'review' | 'paid' | 'cancelled';
const queueCategory = (order: StoreOrder): QueueCategory => isPaid(order) ? 'paid' : order.status === 'awaiting_review' ? 'review' : isFailedPayment(order) ? 'cancelled' : 'pending';
const paymentText = (order: StoreOrder) => order.payment?.status === 'successful'
  ? 'ชำระแล้ว'
  : isPaid(order)
    ? 'ชำระแล้ว'
    : order.status === 'awaiting_review'
      ? 'รอตรวจสลิป'
      : order.status === 'cancelled'
        ? 'ยกเลิกแล้ว'
      : order.status === 'pending_payment' && order.payment?.method === 'manual_promptpay' && order.schemaVersion === 2 && order.createdAt && Date.now() >= slipDeadline(order)
        ? 'เกินกำหนดส่งสลิป'
    : order.payment?.status === 'expired' || order.status === 'expired'
    ? 'หมดอายุ'
    : order.payment?.status === 'failed' || order.status === 'payment_failed'
      ? 'ชำระไม่สำเร็จ'
      : order.payment?.method === 'cod' ? 'รอเก็บเงินปลายทาง' : order.schemaVersion === 2 && order.payment?.method == null ? 'บันทึกแล้ว · รอแจ้งชำระเงิน' : 'รอชำระเงิน';
const paymentKind = (order: StoreOrder) => order.payment?.method === 'manual_promptpay' ? 'พร้อมเพย์ · ตรวจสลิปโดยแอดมิน' : order.payment?.method === 'promptpay' ? 'PromptPay' : order.payment?.method === 'cod' ? 'เก็บเงินสดเมื่อได้รับสินค้า' : 'รอร้านแจ้งวิธีชำระเงิน';
const orderDate = (order: StoreOrder) => order.createdAt?.toDate?.() ?? null;
const dayTime = (order: StoreOrder) => orderDate(order)?.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' }) ?? 'กำลังบันทึกเวลา';

export function AdminOrderShell({ children, title = 'คำสั่งซื้อ' }: { children: ReactNode; title?: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const logout = async () => {
    await auth.logout();
    navigate('/admin/login', { replace: true });
  };

  return <div className="admin-order-shell">
    {drawerOpen && <button className="admin-order-backdrop" aria-label="ปิดเมนู" onClick={() => setDrawerOpen(false)} />}
    <aside className={`admin-order-sidebar${drawerOpen ? ' is-open' : ''}`}>
      <div>
        <div className="admin-order-logo"><Link to="/admin/dashboard" onClick={() => setDrawerOpen(false)}><img src="/logo-soulmate.png" alt="SOULMATE" /></Link><button className="admin-order-close" aria-label="ปิดเมนู" onClick={() => setDrawerOpen(false)}><span className="material-symbols-outlined" aria-hidden="true">close</span></button></div>
        <p className="admin-order-nav-label">Navigation</p>
        <nav aria-label="เมนูแอดมิน"><AdminSidebarNav pathname={location.pathname} isSuperAdmin={auth.customerProfile?.role === 'super_admin'} onNavigate={(path) => { navigate(path); setDrawerOpen(false); }} /></nav>
      </div>
      <div className="admin-order-sidebar-bottom"><div className="admin-order-profile"><div className="admin-order-role"><span>สิทธิ์การใช้งาน</span><strong>ผู้ดูแลระบบ</strong></div><div className="admin-order-user"><span className="admin-order-avatar"><UserRound size={18} /></span><span><strong>ทีม SOULMATE</strong><small>{auth.customerProfile?.email || ''}</small></span></div></div><button className="admin-order-logout" onClick={logout}><LogOut size={18} />ออกจากระบบ</button></div>
    </aside>
    <div className="admin-order-content"><header className="admin-order-topbar"><div><button className="admin-order-menu" aria-label="เปิดเมนู" onClick={() => setDrawerOpen(true)}><span className="material-symbols-outlined" aria-hidden="true">menu</span></button><h1>{title}</h1></div><div className="admin-order-top-actions"><Link className="admin-order-storefront-link" to="/" aria-label="กลับไปหน้าร้าน"><span className="material-symbols-outlined" aria-hidden="true">storefront</span><span>กลับไปหน้าร้าน</span></Link><AdminNotificationBell onNavigate={navigate} /><span className="admin-order-user-divider" /><span className="admin-order-avatar"><UserRound size={18} /></span><span className="admin-order-user-name">ผู้ดูแลระบบ</span></div></header>{children}</div>
  </div>;
}

function OrderPaymentPanel({ order, onUpdated }: { order: StoreOrder; onUpdated: () => void }) {
  const [qrUrl, setQrUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canSubmit = order.payment?.method === 'manual_promptpay' && order.status === 'pending_payment' && Date.now() < slipDeadline(order);
  useEffect(() => {
    let alive = true;
    const phone = order.payment?.promptPayPhone;
    if (order.schemaVersion === 2 && phone && order.status === 'pending_payment') {
      QRCode.toDataURL(promptPayPayload(phone, order.totalSatang), { width: 280, margin: 2 })
        .then((url) => { if (alive) setQrUrl(url); })
        .catch(() => { if (alive) setError('สร้าง QR ไม่สำเร็จ กรุณาติดต่อร้าน'); });
    }
    return () => { alive = false; };
  }, [order.id, order.payment?.promptPayPhone, order.status, order.totalSatang, order.schemaVersion]);
  if (order.schemaVersion !== 2) return null;
  return <div className="order-manual-payment">
    {order.status === 'pending_payment' && order.payment?.method == null && <p className="order-demo-note">บันทึกออเดอร์แล้ว ยังไม่ต้องโอนเงินหรือส่งสลิป ร้านจะแจ้งวิธีชำระเงินภายหลัง</p>}
    {order.status === 'pending_payment' && order.payment?.method === 'cod' && <p className="order-demo-note">เลือกเก็บเงินปลายทาง ชำระเงินสดกับผู้จัดส่งเมื่อได้รับสินค้า</p>}
    {order.status === 'pending_payment' && order.payment?.method === 'manual_promptpay' && <>
      <h2>โอนเงินด้วยพร้อมเพย์</h2>
      <p>สแกน QR เพื่อโอนยอด <strong>{money(order.totalSatang)}</strong> ไปยังเบอร์พร้อมเพย์ <strong>{order.payment.promptPayPhone}</strong></p>
      {qrUrl && <img className="order-payment-qr" src={qrUrl} alt={`QR พร้อมเพย์ยอด ${money(order.totalSatang)}`} />}
      <p className="order-demo-note">กรุณาตรวจชื่อผู้รับในแอปธนาคารก่อนยืนยันการโอน QR ระบุยอดชำระไว้ แต่การสแกนยังไม่ยืนยันว่าเงินเข้าร้าน</p>
      <p>ส่งสลิปภายใน <strong>{expiryText(order)}</strong> เพื่อให้แอดมินตรวจสอบ</p>
      {canSubmit
        ? <form onSubmit={async (event) => {
          event.preventDefault();
          if (!file) return;
          setBusy(true); setError('');
          try { await submitOrderSlip(order, file); onUpdated(); }
          catch (cause) { setError((cause as Error).message || 'ส่งสลิปไม่สำเร็จ'); }
          finally { setBusy(false); }
        }}>
          <label htmlFor={`slip-${order.id}`}>รูปสลิป JPG, PNG หรือ WebP ไม่เกิน 5 MB</label>
          <input id={`slip-${order.id}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          <button className="order-primary" type="submit" disabled={busy || !file}>{busy ? 'กำลังส่งสลิป…' : 'ส่งสลิปให้แอดมินตรวจ'}</button>
        </form>
        : <p className="order-error">ครบกำหนดส่งสลิปแล้ว กรุณาติดต่อร้าน</p>}
    </>}
    {order.status === 'awaiting_review' && <p className="order-demo-note">ส่งสลิปแล้ว กำลังรอแอดมินตรวจรายการเงินเข้าจริง</p>}
    {order.status === 'paid' && <p className="order-paid-note">แอดมินยืนยันว่าได้รับเงินแล้ว ออเดอร์สำเร็จ</p>}
    {order.status === 'cancelled' && <p className="order-error">ออเดอร์ถูกยกเลิก{order.review?.reason ? ` · ${order.review.reason}` : ''}</p>}
    {error && <p className="order-error" role="alert">{error}</p>}
  </div>;
}

function AdminReviewPanel({ order, onUpdated }: { order: StoreOrder; onUpdated: () => void }) {
  const [slipPreview, setSlipPreview] = useState<{ orderId: string; slipPath: string; url: string } | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const slipUrl = slipPreview?.orderId === order.id && slipPreview.slipPath === order.slipPath ? slipPreview.url : '';
  useEffect(() => {
    let alive = true;
    let url = '';
    setSlipPreview(null);
    setChecked(false);
    setError('');
    if (order.slipPath) loadOrderSlip(order).then((blob) => {
      url = URL.createObjectURL(blob);
      if (alive) setSlipPreview({ orderId: order.id, slipPath: order.slipPath!, url });
      else URL.revokeObjectURL(url);
    }).catch(() => { if (alive) setError('เปิดสลิปไม่ได้ ห้ามอนุมัติจนกว่าจะตรวจหลักฐานได้'); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [order.id, order.slipPath]);
  if (order.schemaVersion !== 2) return null;
  const finished = order.status === 'paid' || order.status === 'cancelled';
  const codNeedsAcceptance = order.payment?.method === 'cod' && order.status === 'pending_payment' && !order.codAcceptance;
  const codCanCollect = order.payment?.method === 'cod' && order.status === 'pending_payment' && Boolean(order.codAcceptance) && order.fulfillmentStatus === 'shipped';
  const act = async (action: 'approved' | 'cancelled') => {
    const approvePrompt = order.payment?.method === 'cod' ? 'ยืนยันว่าได้รับเงินสดจากผู้จัดส่งแล้วและปิดออเดอร์?' : 'ตรวจเงินเข้าบัญชีแล้วและยืนยันให้ออเดอร์สำเร็จ?';
    if (!window.confirm(action === 'approved' ? approvePrompt : 'ยกเลิกออเดอร์และคืนสต็อก?')) return;
    const reason = action === 'cancelled' ? window.prompt('เหตุผลที่ยกเลิกออเดอร์', '') : '';
    if (reason === null) return;
    setBusy(true); setError('');
    try { await reviewOrder(order.id, action, reason ?? ''); onUpdated(); }
    catch (cause) { setError((cause as Error).message || 'บันทึกผลตรวจไม่สำเร็จ'); }
    finally { setBusy(false); }
  };
  return <div className="order-review-panel">
    <h3>{order.payment?.method === 'cod' ? 'เก็บเงินปลายทาง' : 'ตรวจการโอนเงิน'}</h3>
    <p>ยอดออเดอร์ <strong>{money(order.totalSatang)}</strong>{order.payment?.promptPayPhone ? ` · พร้อมเพย์ ${order.payment.promptPayPhone}` : order.payment?.method === 'cod' ? ' · ชำระกับผู้จัดส่ง' : ' · ยังไม่เปิดรับชำระเงิน'}</p>
    {order.status === 'pending_payment' && order.payment?.method === 'manual_promptpay' && Date.now() >= slipDeadline(order) && <p className="order-error">เลยกำหนดส่งสลิป 24 ชั่วโมงแล้ว</p>}
    {order.slipPath && (slipUrl ? <img className="order-slip-preview" src={slipUrl} alt="สลิปที่ลูกค้าส่ง" /> : <p>กำลังเปิดสลิป…</p>)}
    {!finished && <>
      {(order.status === 'awaiting_review' && slipUrl || codCanCollect) && <label className="order-review-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />{order.payment?.method === 'cod' ? 'ผู้จัดส่งส่งเงิน COD ให้ร้านแล้ว' : 'ตรวจยอด ผู้รับ และเงินเข้าบัญชีจริงแล้ว'}</label>}
      {codNeedsAcceptance && <label className="order-review-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} />ตรวจรายละเอียดออเดอร์และยืนยันรับ COD</label>}
      <div className="order-review-actions">
        {codNeedsAcceptance
          ? <button className="order-primary" disabled={busy || !checked} onClick={async () => { setBusy(true); setError(''); try { await acceptCodOrder(order.id); onUpdated(); } catch (cause) { setError((cause as Error).message || 'ยืนยัน COD ไม่สำเร็จ'); } finally { setBusy(false); } }}>ยืนยันรับออเดอร์ COD</button>
          : <button className="order-primary" disabled={busy || !checked || (order.payment?.method === 'cod' ? !codCanCollect : !slipUrl || order.status !== 'awaiting_review')} onClick={() => void act('approved')}>{order.payment?.method === 'cod' ? 'ยืนยันว่าได้รับเงิน COD แล้ว' : 'อนุมัติว่าเงินเข้าแล้ว'}</button>}
        <button className="order-secondary" disabled={busy} onClick={() => void act('cancelled')}>ยกเลิกและคืนสต็อก</button>
      </div>
    </>}
    {order.review && <p>ผลตรวจ: {order.review.result === 'approved' ? 'อนุมัติ' : 'ยกเลิก'} · UID {order.review.by}</p>}
    {error && <p className="order-error" role="alert">{error}</p>}
  </div>;
}

function fulfillmentText(order: StoreOrder) {
  switch (order.fulfillmentStatus) {
    case 'awaiting_cod_acceptance': return 'รอแอดมินยืนยัน COD';
    case 'awaiting_payment': return 'รอยืนยันการชำระเงิน';
    case 'ready_to_prepare': return 'พร้อมจัดเตรียม';
    case 'ready_to_ship': return 'พร้อมส่ง';
    case 'shipped': return 'ส่งแล้ว';
    default: return order.status === 'paid' ? 'พร้อมจัดเตรียม' : 'สถานะจัดส่งยังไม่พร้อมใช้งาน';
  }
}

function AdminFulfillmentPanel({ order, onUpdated }: { order: StoreOrder; onUpdated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [trackingBusy, setTrackingBusy] = useState(false);
  const [fulfillmentError, setFulfillmentError] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber ?? '');
  useEffect(() => { setTrackingNumber(order.trackingNumber ?? ''); }, [order.id, order.trackingNumber]);
  if (order.schemaVersion !== 2) return null;
  const next = order.fulfillmentStatus === 'ready_to_prepare' ? 'ready_to_ship'
    : order.fulfillmentStatus === 'ready_to_ship' ? 'shipped' : null;
  const action = next === 'ready_to_ship' ? 'ยืนยันว่าแพ็กสินค้าแล้ว · พร้อมส่ง' : 'ยืนยันว่าส่งมอบให้ขนส่งแล้ว';
  return <>
    <section className="order-review-panel" aria-label="สถานะจัดส่ง">
      <h3>สถานะจัดส่ง</h3>
      <p><strong>{fulfillmentText(order)}</strong></p>
      {next && <button className="order-primary" type="button" disabled={busy} onClick={async () => {
        setBusy(true); setFulfillmentError('');
        try { await updateFulfillmentStatus(order.id, next); onUpdated(); }
        catch (cause) { setFulfillmentError((cause as Error).message || 'เปลี่ยนสถานะจัดส่งไม่สำเร็จ'); }
        finally { setBusy(false); }
      }}>{busy ? 'กำลังบันทึก…' : action}</button>}
      {fulfillmentError && <p className="order-error" role="alert">{fulfillmentError}</p>}
    </section>
    <section className="order-review-panel order-tracking-panel" aria-labelledby={`tracking-heading-${order.id}`}>
      <h3 id={`tracking-heading-${order.id}`}>เลข Tracking</h3>
      <form className="order-tracking-form" onSubmit={async (event) => {
        event.preventDefault(); setTrackingBusy(true); setTrackingError('');
        try { await updateOrderTrackingNumber(order.id, trackingNumber); onUpdated(); }
        catch (cause) { setTrackingError((cause as Error).message || 'บันทึกเลข Tracking ไม่สำเร็จ'); }
        finally { setTrackingBusy(false); }
      }}>
        <div><input id={`tracking-${order.id}`} aria-label="เลข Tracking" value={trackingNumber} maxLength={80} placeholder="กรอกเลขติดตามพัสดุ ถ้ามี" disabled={order.status === 'cancelled' || trackingBusy} onChange={(event) => setTrackingNumber(event.target.value)} /><button className="order-secondary" type="submit" disabled={order.status === 'cancelled' || trackingBusy || trackingNumber.trim() === (order.trackingNumber ?? '')}>{trackingBusy ? 'กำลังบันทึก…' : 'บันทึกเลข'}</button></div>
      </form>
      {trackingError && <p className="order-error" role="alert">{trackingError}</p>}
    </section>
  </>;
}

function PaymentSetupPanel() {
  const auth = useAuth();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void getPromptPaySettings().then((settings) => {
    if (settings) { setPhone(settings.phone); setName(settings.payeeName); }
  }).catch(() => {}); }, []);
  if (auth.customerProfile?.role !== 'super_admin') return null;
  return <section className="order-payment-settings">
    <h3>ตั้งค่าบัญชีรับเงินพร้อมเพย์</h3>
    <p>Checkout จะแสดงวิธีที่เปิดใช้งานใน Settings โดย PromptPay จะสร้าง QR ตามยอดออเดอร์ ส่วน COD ชำระเงินกับผู้จัดส่งเมื่อได้รับสินค้า</p>
    <form onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setMessage('');
      try { await savePromptPaySettings(phone, name); setMessage('บันทึกเบอร์พร้อมเพย์แล้ว'); }
      catch (cause) { setMessage((cause as Error).message || 'บันทึกไม่สำเร็จ'); }
      finally { setBusy(false); }
    }}>
      <label>เบอร์พร้อมเพย์ <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="numeric" maxLength={10} required /></label>
      <label>ชื่อผู้รับ <input value={name} onChange={(event) => setName(event.target.value)} required /></label>
      <button className="order-primary" type="submit" disabled={busy}>บันทึกผู้รับเงิน</button>
    </form>
    {message && <p role="status">{message}</p>}
  </section>;
}

export function AdminPaymentSettingsPage() {
  return <AdminOrderShell><main className="order-page order-page-admin"><div className="order-toolbar"><div><h2>การชำระเงิน</h2><p>ตั้งค่าบัญชี PromptPay ที่ใช้รับเงินและสร้าง QR ตามยอดของแต่ละออเดอร์</p></div></div><PaymentSetupPanel /></main></AdminOrderShell>;
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
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setBusy(true);
    (orderId ? getOrder(orderId).then((value) => { if (alive) setOrder(value); }) : listMyOrders().then((value) => { if (alive) setOrders(value); }))
      .catch(() => { if (alive) setError('โหลดคำสั่งซื้อไม่สำเร็จ กรุณาลองอีกครั้ง'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [orderId, refreshKey]);
  if (orderId) return <OrderDetail order={order} busy={busy} error={error} onUpdated={() => setRefreshKey((key) => key + 1)} />;
  return <main className="order-page"><Link className="order-back" to="/account">← บัญชีของฉัน</Link><header className="order-heading"><p>บัญชีของฉัน</p><h1>คำสั่งซื้อของฉัน</h1><span>รายการที่บันทึกไว้ในบัญชีนี้</span></header>{error && <p className="order-error">{error}</p>}{busy ? <p className="order-empty">กำลังโหลดคำสั่งซื้อ…</p> : <OrderRows orders={orders} />}</main>;
}

export function AdminOrdersPage() {
  const pageSize = 10;
  const { orderId } = useParams();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [queryText, setQueryText] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | QueueCategory>('all');
  const [selectedId, setSelectedId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    let alive = true;
    setBusy(true);
    (orderId ? getOrder(orderId).then((value) => { if (alive) setOrder(value); }) : listAdminOrders().then((value) => { if (alive) setOrders(value); }))
      .catch(() => { if (alive) setError('โหลดคำสั่งซื้อไม่สำเร็จ หรือบัญชีนี้ไม่มีสิทธิ์ดูข้อมูล'); })
      .finally(() => { if (alive) setBusy(false); });
    return () => { alive = false; };
  }, [orderId, refreshKey]);
  if (orderId) return <AdminOrderShell><OrderDetail order={order} busy={busy} error={error} admin onUpdated={() => setRefreshKey((key) => key + 1)} /></AdminOrderShell>;
  const counts = {
    all: orders.length,
    pending: orders.filter((item) => queueCategory(item) === 'pending').length,
    review: orders.filter((item) => queueCategory(item) === 'review').length,
    paid: orders.filter((item) => queueCategory(item) === 'paid').length,
    cancelled: orders.filter((item) => queueCategory(item) === 'cancelled').length,
  };
  const visibleOrders = orders.filter((item) => {
    const statusMatches = paymentFilter === 'all' || queueCategory(item) === paymentFilter;
    const haystack = [item.orderNumber, item.contact?.firstName, item.contact?.lastName, item.contact?.phone, item.contact?.email].join(' ').toLocaleLowerCase('th-TH');
    return statusMatches && haystack.includes(queryText.trim().toLocaleLowerCase('th-TH'));
  });
  const pageCount = Math.max(1, Math.ceil(visibleOrders.length / pageSize));
  const page = Math.min(currentPage, pageCount);
  const pageOrders = visibleOrders.slice((page - 1) * pageSize, page * pageSize);
  const selectedOrder = pageOrders.find((item) => item.id === selectedId) ?? pageOrders[0] ?? null;
  const chooseFilter = (filter: typeof paymentFilter) => { setPaymentFilter(filter); setCurrentPage(1); };
  return <AdminOrderShell><main className="order-page order-page-admin">
    <div className="order-toolbar"><button className="order-refresh" type="button" onClick={() => setRefreshKey((key) => key + 1)} disabled={busy}><RefreshCw size={16} className={busy ? 'is-spinning' : ''} />รีเฟรช</button></div>
    <section className="order-workbench" aria-label="คิวและรายละเอียดคำสั่งซื้อ">
      <div className="order-queue">
        <div className="order-queue-tools"><label className="order-search"><Search size={17} aria-hidden="true" /><input value={queryText} onChange={(event) => { setQueryText(event.target.value); setCurrentPage(1); }} placeholder="ค้นหาเลขออเดอร์ ชื่อ เบอร์โทร" aria-label="ค้นหาคำสั่งซื้อ" /></label>
          <div className="order-filters" role="group" aria-label="กรองตามสถานะชำระเงิน">
            {([['all', 'ทั้งหมด'], ['pending', 'รอดำเนินการ'], ['review', 'รอตรวจสลิป'], ['paid', 'สำเร็จ'], ['cancelled', 'ยกเลิก']] as const).map(([key, label]) => <button key={key} type="button" className={paymentFilter === key ? 'is-active' : ''} aria-pressed={paymentFilter === key} onClick={() => chooseFilter(key)}>{label}<span>{counts[key]}</span></button>)}
          </div>
        </div>
        {error && <div className="order-error" role="alert">{error}<button type="button" onClick={() => setRefreshKey((key) => key + 1)}>ลองอีกครั้ง</button></div>}
        {busy ? <div className="order-loading" role="status"><span className="order-loading-mark" />กำลังโหลดคิวคำสั่งซื้อ…</div> : visibleOrders.length ? <div className="order-queue-list" aria-label="คำสั่งซื้อ">
          {pageOrders.map((item) => <button className={`order-queue-item${selectedOrder?.id === item.id ? ' is-selected' : ''}`} key={item.id} type="button" aria-pressed={selectedOrder?.id === item.id} onClick={() => setSelectedId(item.id)}>
            <span className="order-queue-item-top"><strong>{item.orderNumber || item.id}</strong><small>{dayTime(item)}</small></span>
            <span className="order-queue-item-bottom"><span>{`${item.contact?.firstName ?? ''} ${item.contact?.lastName ?? ''}`.trim() || 'ลูกค้าทั่วไป'}</span><strong>{money(item.totalSatang)}</strong></span>
            <span className={`order-status-chip ${isPaid(item) ? 'is-paid' : isFailedPayment(item) ? 'is-failed' : 'is-pending'}`}>{isPaid(item) ? <CheckCircle2 size={14} /> : isFailedPayment(item) ? <XCircle size={14} /> : <Clock3 size={14} />}{paymentText(item)}</span>
          </button>)}
        </div> : <div className="order-queue-empty"><span className="order-empty-icon"><Search size={20} /></span><strong>{orders.length ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีคำสั่งซื้อ'}</strong><p>{orders.length ? 'ลองค้นหาด้วยคำอื่น หรือเลือกสถานะทั้งหมด' : 'ออเดอร์ใหม่จะแสดงที่นี่เมื่อมีการสั่งซื้อจากหน้าร้าน'}</p>{orders.length > 0 && <button type="button" onClick={() => { setQueryText(''); setPaymentFilter('all'); }}>ล้างตัวกรอง</button>}</div>}
        {!busy && orders.length > 0 && <div className="order-queue-footer"><span>แสดง {visibleOrders.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, visibleOrders.length)} จาก {visibleOrders.length} รายการ</span>{pageCount > 1 && <nav className="order-queue-pagination" aria-label="เปลี่ยนหน้าคำสั่งซื้อ"><button type="button" disabled={page <= 1} onClick={() => setCurrentPage(Math.max(1, page - 1))}>ก่อนหน้า</button><span>หน้า {page} / {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setCurrentPage(Math.min(pageCount, page + 1))}>ถัดไป</button></nav>}</div>}
      </div>
      <aside className="order-inspector" aria-label="รายละเอียดรายการที่เลือก">
        {selectedOrder ? <>
          <div className="order-inspector-head"><div><span>รายละเอียดออเดอร์</span><h3>{selectedOrder.orderNumber || selectedOrder.id}</h3></div><Link to={`/admin/orders/${encodeURIComponent(selectedOrder.id)}`} aria-label="เปิดรายละเอียดเต็ม"><ExternalLink size={17} /></Link></div>
          <div className={`order-payment-state ${isPaid(selectedOrder) ? 'is-paid' : isFailedPayment(selectedOrder) ? 'is-failed' : 'is-pending'}`}><span>{isPaid(selectedOrder) ? <CheckCircle2 size={18} /> : isFailedPayment(selectedOrder) ? <XCircle size={18} /> : <Clock3 size={18} />}</span><div><strong>{paymentText(selectedOrder)}</strong><small>{paymentKind(selectedOrder)}</small></div></div>
          <div className="order-inspector-section"><h4>ลูกค้า</h4><strong>{`${selectedOrder.contact?.firstName ?? ''} ${selectedOrder.contact?.lastName ?? ''}`.trim() || 'ลูกค้าทั่วไป'}</strong><span>{selectedOrder.contact?.phone || 'ไม่ระบุเบอร์โทร'}</span><span>{selectedOrder.contact?.email || 'ไม่ระบุอีเมล'}</span><small>{selectedOrder.ownerType === 'guest' ? 'สั่งซื้อแบบไม่สมัครสมาชิก' : 'สมาชิก SOULMATE'}</small></div>
          <div className="order-inspector-section"><h4>สินค้าในออเดอร์ <span>{selectedOrder.items.length} รายการ</span></h4>{selectedOrder.items.map((item, index) => <div className="order-inspector-product" key={`${item.productId}-${item.variantId}-${index}`}><span>{item.productName}{item.variantName ? ` · ${item.variantName}` : ''}<small>จำนวน {item.quantity}</small></span><strong>{money(item.lineTotalSatang)}</strong></div>)}</div>
          <div className="order-inspector-total"><span>ยอดสินค้า</span><strong>{money(selectedOrder.subtotalSatang)}</strong><span>ค่าจัดส่ง</span><strong>{money(selectedOrder.shippingFeeSatang)}</strong><span className="is-grand-total">ยอดรวม</span><strong className="is-grand-total">{money(selectedOrder.totalSatang)}</strong></div>
          <AdminReviewPanel order={selectedOrder} onUpdated={() => setRefreshKey((key) => key + 1)} />
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
  const [refreshKey, setRefreshKey] = useState(0);
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
  }, [orderId, refreshKey]);
  if (error) return <main className="order-page"><section className="order-panel"><h1>เปิดคำสั่งซื้อไม่ได้</h1><p>{error}</p><Link className="order-primary" to="/products">กลับไปเลือกสินค้า</Link></section></main>;
  if (!order) return <main className="order-page"><p className="order-empty">กำลังโหลดคำสั่งซื้อ…</p></main>;
  return <main className="order-page order-confirmation">
    <section className="order-panel order-success-panel">
      <span className="order-success-icon" aria-hidden="true">✓</span>
      <p className="order-eyebrow">บันทึกคำสั่งซื้อแล้ว</p>
      <h1>ขอบคุณที่สั่งซื้อ</h1>
      <p>เลขคำสั่งซื้อ <strong>{order.orderNumber}</strong></p>
      <div className="order-status"><span>สถานะคำสั่งซื้อ</span><strong>{paymentText(order)}</strong></div>
      <p className="order-payment-note">{order.payment?.method === 'cod' ? 'ชำระเงินสดกับผู้จัดส่งเมื่อได้รับสินค้า' : order.payment?.method == null ? 'บันทึกออเดอร์แล้ว ยังไม่ต้องชำระเงิน ร้านจะแจ้งวิธีชำระภายหลัง' : 'บันทึกออเดอร์แล้ว การโอนเงินจะถือว่าสำเร็จหลังแอดมินตรวจเงินจริงและอนุมัติ'}</p>
      <div className="order-totals"><span>สินค้า {money(order.subtotalSatang)}</span><span>จัดส่ง {money(order.shippingFeeSatang)}</span><strong>ยอดรวม {money(order.totalSatang)}</strong></div>
      <OrderPaymentPanel order={order} onUpdated={() => setRefreshKey((key) => key + 1)} />
      <Link className="order-secondary" to="/products">เลือกซื้อสินค้าต่อ</Link>
    </section>
    {showEmailDemo && <div className="order-modal-backdrop" role="presentation"><section aria-labelledby="email-demo-title" aria-modal="true" className="order-modal" role="dialog"><button aria-label="ปิด" className="order-modal-close" onClick={() => setShowEmailDemo(false)}>×</button><span className="order-mail-icon">✉</span><h2 id="email-demo-title">บันทึกออเดอร์แล้ว</h2><p>เลขคำสั่งซื้อ: <strong>{order.orderNumber}</strong></p><p>ยังไม่มีอีเมลส่งออก กรุณาเก็บเลขคำสั่งซื้อนี้ไว้ ร้านจะแจ้งวิธีชำระเงินภายหลัง</p><button className="order-primary" onClick={() => setShowEmailDemo(false)}>รับทราบ</button></section></div>}
  </main>;
}

function OrderDetail({ order, busy, error, admin = false, onUpdated }: { order: StoreOrder | null; busy: boolean; error: string; admin?: boolean; onUpdated: () => void }) {
  return <main className="order-page"><Link className="order-back" to={admin ? '/admin/orders' : '/account/orders'}>← กลับไปรายการคำสั่งซื้อ</Link>{busy ? <p className="order-empty">กำลังโหลดคำสั่งซื้อ…</p> : error || !order ? <p className="order-error">{error || 'ไม่พบคำสั่งซื้อ'}</p> : <section className="order-panel"><p className="order-eyebrow">รายละเอียดคำสั่งซื้อ</p><h1>{order.orderNumber}</h1><p>{dateText(order)} · {paymentText(order)}</p>{admin && <div className="order-contact"><strong>{order.contact.firstName} {order.contact.lastName}</strong><span>{order.contact.email}</span><span>{order.contact.phone}</span><span>{order.contact.addressLine1}, {order.contact.subdistrict}, {order.contact.district}, {order.contact.province} {order.contact.postalCode}</span></div>}<div className="order-items">{order.items.map((item, index) => <div className="order-item" key={`${item.productId}-${item.variantId}-${index}`}><span>{item.productName}{item.variantName ? ` · ${item.variantName}` : ''} × {item.quantity}</span><strong>{money(item.lineTotalSatang)}</strong></div>)}</div><div className="order-totals"><span>สินค้า {money(order.subtotalSatang)}</span><span>จัดส่ง {money(order.shippingFeeSatang)}</span><strong>รวม {money(order.totalSatang)}</strong></div>{admin ? <><AdminReviewPanel order={order} onUpdated={onUpdated} /><AdminFulfillmentPanel order={order} onUpdated={onUpdated} /></> : <OrderPaymentPanel order={order} onUpdated={onUpdated} />}</section>}</main>;
}
