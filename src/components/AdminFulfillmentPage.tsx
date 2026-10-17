import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Printer, RefreshCw, Search } from 'lucide-react';
import { AdminOrderShell } from './OrderPages';
import {
  acceptCodOrder,
  createLabelGeneration,
  effectiveFulfillmentStatus,
  getLabelGenerations,
  listAdminOrders,
  updateFulfillmentStatus,
  updateOrderContact,
  type OrderContact,
  type StoreOrder,
} from '../services/orderService';
import { getStoreSettings, type StoreSettings } from '../services/storeSettingsService';
import './admin-fulfillment.css';

type PrintKind = 'label' | 'packing';
type PrintEntry = { order: StoreOrder; reprint: boolean };
const currency = (satang: number) => `฿${(satang / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;
const paymentLabel = (order: StoreOrder) => {
  if (order.payment?.method === 'cod') return 'COD';
  if (order.status === 'paid' && order.payment?.status === 'successful') return 'ชำระแล้ว';
  if (order.status === 'awaiting_review') return 'รอตรวจสอบ';
  if (order.status === 'cancelled') return 'รอชำระเงิน';
  if (order.status === 'payment_failed') return 'ชำระไม่สำเร็จ';
  return 'รอชำระเงิน';
};
const stageLabel = (order: StoreOrder) => ({ awaiting_payment: 'รอชำระเงิน', awaiting_cod_acceptance: 'รอยืนยัน COD', ready_to_prepare: 'พร้อมจัดเตรียม', ready_to_ship: 'พร้อมส่ง', shipped: 'ส่งแล้ว' }[effectiveFulfillmentStatus(order)]);
const canGenerate = (order: StoreOrder) => order.schemaVersion === 2 && order.status !== 'cancelled' &&
  (effectiveFulfillmentStatus(order) === 'ready_to_prepare' || effectiveFulfillmentStatus(order) === 'ready_to_ship') &&
  (order.payment?.method === 'cod' ? Boolean(order.codAcceptance) : order.status === 'paid' && order.payment?.status === 'successful');
const completeContact = (contact?: OrderContact) => Boolean(contact && [contact.firstName, contact.lastName, contact.phone, contact.addressLine1, contact.subdistrict, contact.district, contact.province, contact.postalCode].every((value) => String(value ?? '').trim()));
const compareNumbers = (a: string, b: string) => {
  const parse = (value: string) => {
    const match = /^SM-(\d{4})(\d{4,})$/.exec(value.trim());
    return match ? [Number(match[1]), Number(match[2])] as const : null;
  };
  const left = parse(a), right = parse(b);
  if (!left || !right) return null;
  return left[0] === right[0] ? Math.sign(left[1] - right[1]) : Math.sign(left[0] - right[0]);
};
const shortDate = (date?: { toDate?: () => Date }) => date?.toDate?.().toLocaleString('th-TH') ?? 'ไม่ทราบเวลา';
const formatDateInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};
const parseDateInput = (value: string) => {
  if (!value) return '';
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1 || date.getDate() !== Number(day)) return null;
  return `${year}-${month}-${day}`;
};
function FulfillmentDateFilter({ id, label, value, onChange }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedISO = parseDateInput(value);
  const selectedDate = selectedISO ? new Date(`${selectedISO}T00:00:00`) : null;
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = selectedDate ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const dayCount = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(visibleMonth);
  const chooseDate = (day: number) => {
    const year = visibleMonth.getFullYear();
    const month = String(visibleMonth.getMonth() + 1).padStart(2, '0');
    const date = String(day).padStart(2, '0');
    onChange(`${date}/${month}/${year}`);
    setOpen(false);
  };
  return <label>{label}<span className="fulfillment-date-input">
    <input id={id} type="text" inputMode="numeric" placeholder="dd/mm/yyyy" aria-label={`${label} dd/mm/yyyy`} value={value} onChange={(event) => onChange(formatDateInput(event.target.value))} />
    <button type="button" className="fulfillment-date-picker" aria-label={`เปิดปฏิทิน${label}`} aria-expanded={open} aria-controls={`${id}-calendar`} onClick={() => {
      if (!open) {
        const initial = selectedDate ?? new Date();
        setVisibleMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
      }
      setOpen((current) => !current);
    }}><CalendarDays size={16} aria-hidden="true" /></button>
    {open && <span className="fulfillment-calendar" id={`${id}-calendar`} role="dialog" aria-label={`เลือกวันที่${label}`}>
      <span className="fulfillment-calendar-header"><button type="button" aria-label="เดือนก่อนหน้า" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1))}><ChevronLeft size={16} /></button><strong>{monthLabel}</strong><button type="button" aria-label="เดือนถัดไป" onClick={() => setVisibleMonth(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1))}><ChevronRight size={16} /></button></span>
      <span className="fulfillment-calendar-grid" role="grid" aria-label={monthLabel}>{['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map((weekday) => <span key={weekday} className="fulfillment-calendar-weekday" role="columnheader">{weekday}</span>)}{Array.from({ length: monthStart.getDay() }, (_, index) => <span key={`empty-${index}`} aria-hidden="true" />)}{Array.from({ length: dayCount }, (_, index) => {
        const day = index + 1;
        const isSelected = selectedDate?.getFullYear() === visibleMonth.getFullYear() && selectedDate.getMonth() === visibleMonth.getMonth() && selectedDate.getDate() === day;
        return <button key={day} type="button" role="gridcell" aria-label={`${day} ${monthLabel}`} aria-pressed={isSelected} className={isSelected ? 'is-selected' : ''} onClick={() => chooseDate(day)}>{day}</button>;
      })}</span>
    </span>}
  </span></label>;
}

function skipReason(order: StoreOrder, store: StoreSettings) {
  if (!canGenerate(order)) return order.payment?.method === 'cod' && !order.codAcceptance
    ? 'ยังไม่ยืนยันรับ COD' : 'ยังไม่พร้อมจัดเตรียมหรือยกเลิกแล้ว';
  if (!completeContact(order.contact)) return 'ข้อมูลผู้รับไม่ครบ';
  if (![store.storeName, store.storeAddress, store.contactPhone].every((value) => String(value ?? '').trim())) return 'กรอกชื่อ ที่อยู่ และเบอร์โทรร้านในตั้งค่าก่อน';
  return '';
}

function addressText(order: StoreOrder) {
  const c = order.contact;
  return `${c.addressLine1} ${c.subdistrict} ${c.district} ${c.province} ${c.postalCode}`;
}

export function AdminFulfillmentPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [store, setStore] = useState<StoreSettings>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('ready_to_prepare');
  const [payment, setPayment] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<StoreOrder | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getLabelGenerations>>>([]);
  const [editing, setEditing] = useState(false);
  const [contactDraft, setContactDraft] = useState<OrderContact | null>(null);
  const [workingId, setWorkingId] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKind, setPreviewKind] = useState<PrintKind>('label');
  const [layout, setLayout] = useState<'four' | 'two'>('four');
  const [printBatch, setPrintBatch] = useState<PrintEntry[]>([]);
  const [printKind, setPrintKind] = useState<PrintKind>('label');
  const [printRequested, setPrintRequested] = useState(false);

  const reload = async () => {
    setBusy(true); setError('');
    try {
      const [loadedOrders, loadedStore] = await Promise.all([listAdminOrders(), getStoreSettings()]);
      setOrders(loadedOrders); setStore(loadedStore);
      setSelectedOrder((current) => current ? loadedOrders.find((item) => item.id === current.id) ?? null : null);
    } catch (cause) { setError((cause as Error).message || 'โหลดรายการจัดส่งไม่สำเร็จ'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    let alive = true;
    if (!selectedOrder) { setHistory([]); return; }
    void getLabelGenerations(selectedOrder.id).then((items) => { if (alive) setHistory(items); })
      .catch(() => { if (alive) setHistory([]); });
    return () => { alive = false; };
  }, [selectedOrder?.id, selectedOrder?.shippingRevision]);
  useEffect(() => {
    if (!printRequested || !printBatch.length) return;
    const timer = window.setTimeout(() => { window.print(); setPrintRequested(false); }, 80);
    return () => window.clearTimeout(timer);
  }, [printRequested, printBatch, printKind, layout]);

  const filtered = useMemo(() => orders.filter((order) => {
    const stageMatches = stage === 'all' || effectiveFulfillmentStatus(order) === stage;
    const paymentMatches = payment === 'all' || order.payment?.method === payment;
    const created = order.createdAt?.toDate?.();
    const parts = created ? new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(created) : [];
    const day = created ? `${parts.find((part) => part.type === 'year')?.value}-${parts.find((part) => part.type === 'month')?.value}-${parts.find((part) => part.type === 'day')?.value}` : '';
    const fromDay = parseDateInput(dateFrom);
    const toDay = parseDateInput(dateTo);
    const dateMatches = fromDay !== null && toDay !== null && (!fromDay || day >= fromDay) && (!toDay || day <= toDay);
    const text = [order.orderNumber, order.contact?.firstName, order.contact?.lastName, order.contact?.phone, order.contact?.email].join(' ').toLocaleLowerCase('th-TH');
    return stageMatches && paymentMatches && dateMatches && text.includes(query.trim().toLocaleLowerCase('th-TH'));
  }), [orders, stage, payment, dateFrom, dateTo, query]);
  const selectedOrders = selectedIds.map((id) => orders.find((order) => order.id === id)).filter((order): order is StoreOrder => Boolean(order));
  const previewRows = selectedOrders.map((order) => ({ order, reason: skipReason(order, store) }));
  const eligibleSelected = previewRows.filter(({ reason }) => !reason).map(({ order }) => order);
  const codTotal = eligibleSelected.filter((order) => order.payment?.method === 'cod').reduce((sum, order) => sum + order.totalSatang, 0);

  const selectVisible = () => setSelectedIds((ids) => Array.from(new Set([...ids, ...filtered.map((order) => order.id)])));
  const toggleSelected = (id: string) => setSelectedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  const selectRange = () => {
    if (compareNumbers(rangeFrom, rangeTo) === null || compareNumbers(rangeFrom, rangeTo)! > 0) {
      setError('กรอกเลขออเดอร์รูปแบบ SM-YYYY0001 และตรวจสอบช่วงเริ่มต้นกับสิ้นสุด'); return;
    }
    const inRange = orders.filter((order) => {
      const fromStart = compareNumbers(order.orderNumber, rangeFrom);
      const toEnd = compareNumbers(order.orderNumber, rangeTo);
      return fromStart !== null && toEnd !== null && fromStart >= 0 && toEnd <= 0;
    });
    setSelectedIds((ids) => Array.from(new Set([...ids, ...inRange.map((order) => order.id)])));
    setError(''); setPreviewOpen(true);
  };
  const makePreview = (kind: PrintKind) => {
    setPreviewKind(kind); setPreviewOpen(true);
  };
  const generateAndPrint = async () => {
    if (!eligibleSelected.length) return;
    setWorkingId('batch'); setError('');
    const entries: PrintEntry[] = [];
    const skipped: string[] = [];
    for (const order of eligibleSelected) {
      try {
        const previous = await getLabelGenerations(order.id);
        const fresh = await createLabelGeneration(order.id, previewKind, Number(order.shippingRevision ?? 0));
        entries.push({ order: fresh, reprint: previous.some((item) => item.kind === previewKind) });
      } catch (cause) { skipped.push(`${order.orderNumber}: ${(cause as Error).message || 'สถานะเปลี่ยนไป'}`); }
    }
    await reload();
    setWorkingId(''); setPreviewOpen(false);
    if (skipped.length) setError(`ข้ามรายการที่เปลี่ยนข้อมูลหรือสถานะหลังเปิดตัวอย่าง: ${skipped.join(' · ')}`);
    if (entries.length) {
      entries.sort((a, b) => compareNumbers(a.order.orderNumber, b.order.orderNumber) ?? a.order.orderNumber.localeCompare(b.order.orderNumber));
      setPrintKind(previewKind); setPrintBatch(entries); setPrintRequested(true);
    }
  };
  const updateStage = async (order: StoreOrder, next: 'ready_to_ship' | 'shipped') => {
    setWorkingId(order.id); setError('');
    try { await updateFulfillmentStatus(order.id, next); await reload(); }
    catch (cause) { setError((cause as Error).message || 'เปลี่ยนสถานะจัดส่งไม่สำเร็จ'); }
    finally { setWorkingId(''); }
  };
  const acceptCod = async (order: StoreOrder) => {
    setWorkingId(order.id); setError('');
    try { await acceptCodOrder(order.id); await reload(); }
    catch (cause) { setError((cause as Error).message || 'ยืนยัน COD ไม่สำเร็จ'); }
    finally { setWorkingId(''); }
  };
  const openContactEditor = (order: StoreOrder) => { setSelectedOrder(order); setContactDraft({ ...order.contact }); setEditing(true); };
  const saveContact = async () => {
    if (!selectedOrder || !contactDraft) return;
    setWorkingId(selectedOrder.id); setError('');
    try { await updateOrderContact(selectedOrder.id, contactDraft); setEditing(false); await reload(); }
    catch (cause) { setError((cause as Error).message || 'บันทึกที่อยู่ไม่สำเร็จ'); }
    finally { setWorkingId(''); }
  };

  const pages = useMemo(() => {
    if (printKind === 'packing') return printBatch.map((entry) => [entry]);
    const perPage = layout === 'four' ? 4 : 2;
    const result: PrintEntry[][] = [];
    for (let index = 0; index < printBatch.length; index += perPage) result.push(printBatch.slice(index, index + perPage));
    return result;
  }, [printBatch, printKind, layout]);

  return <AdminOrderShell><main className="order-page order-page-admin fulfillment-page">
    <header className="fulfillment-header"><div><p className="order-eyebrow">SOULMATE ADMIN</p><h2>จัดเตรียมและส่งพัสดุ</h2><p>สถานะจัดส่งแยกจากสถานะรับเงิน · COD ต้องยืนยันรับออเดอร์ก่อนเตรียม</p></div><div className="fulfillment-header-actions"><Link className="order-secondary" to="/admin/orders">กลับไปคำสั่งซื้อ</Link><button className="order-refresh" type="button" onClick={() => void reload()} disabled={busy}><RefreshCw size={16} className={busy ? 'is-spinning' : ''} />รีเฟรช</button></div></header>
    {error && <p className="order-error" role="alert">{error}</p>}
    <section className="fulfillment-panel">
      <div className="fulfillment-tools">
        <label className="order-search"><Search size={17} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเลขออเดอร์ ชื่อ หรือเบอร์โทร" aria-label="ค้นหาออเดอร์จัดส่ง" /></label>
        <label>สถานะจัดส่ง<select value={stage} onChange={(event) => setStage(event.target.value)}><option value="all">ทั้งหมด</option><option value="awaiting_cod_acceptance">รอยืนยัน COD</option><option value="awaiting_payment">รอชำระเงิน</option><option value="ready_to_prepare">พร้อมจัดเตรียม</option><option value="ready_to_ship">พร้อมส่ง</option><option value="shipped">ส่งแล้ว</option></select></label>
        <label>วิธีชำระ<select value={payment} onChange={(event) => setPayment(event.target.value)}><option value="all">ทั้งหมด</option><option value="cod">COD</option><option value="manual_promptpay">ชำระล่วงหน้า</option></select></label>
        <FulfillmentDateFilter id="date-from" label="ตั้งแต่" value={dateFrom} onChange={setDateFrom} /><FulfillmentDateFilter id="date-to" label="ถึง" value={dateTo} onChange={setDateTo} />
      </div>
      <div className="fulfillment-batch-tools">
        <button type="button" onClick={selectVisible}>เลือกทั้งหมดในผลลัพธ์ ({filtered.length})</button>
        <span>เลือก {selectedOrders.length} · พร้อมพิมพ์ {eligibleSelected.length} · ข้าม {previewRows.length - eligibleSelected.length}</span>
        <button type="button" disabled={!selectedIds.length} onClick={() => makePreview('label')}><Printer size={16} />ตัวอย่างใบปะหน้า</button>
        <button type="button" disabled={!selectedIds.length} onClick={() => makePreview('packing')}>เอกสารแพ็กของ</button>
      </div>
      <div className="fulfillment-range"><strong>เลือกด้วยช่วงเลขออเดอร์</strong><input aria-label="เลขออเดอร์เริ่มต้น" placeholder="SM-20260001" value={rangeFrom} onChange={(event) => setRangeFrom(event.target.value)} /><span>ถึง</span><input aria-label="เลขออเดอร์สิ้นสุด" placeholder="SM-20260020" value={rangeTo} onChange={(event) => setRangeTo(event.target.value)} /><button type="button" onClick={selectRange}>เลือกช่วง</button></div>
      <div className="fulfillment-table-wrap"><table className="fulfillment-table"><thead><tr><th><input aria-label="เลือกออเดอร์ทั้งหมดในผลลัพธ์" type="checkbox" checked={Boolean(filtered.length) && filtered.every((order) => selectedIds.includes(order.id))} onChange={(event) => event.target.checked ? selectVisible() : setSelectedIds((ids) => ids.filter((id) => !filtered.some((order) => order.id === id)))} /></th><th>ออเดอร์ / ผู้รับ</th><th>วันที่</th><th>ชำระเงิน</th><th>จัดส่ง</th><th>ยอดรวม</th><th title="ยืนยัน COD หรือเปลี่ยนสถานะไปยังขั้นตอนถัดไป">ขั้นตอนถัดไป</th></tr></thead><tbody>
        {filtered.map((order) => {
          const reason = skipReason(order, store);
          return <tr key={order.id} className={selectedOrder?.id === order.id ? 'is-selected' : ''} onClick={() => setSelectedOrder(order)}>
            <td><input aria-label={`เลือก ${order.orderNumber}`} type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleSelected(order.id)} onClick={(event) => event.stopPropagation()} /></td>
            <td><strong>{order.orderNumber}</strong><small>{order.contact?.firstName} {order.contact?.lastName} · {order.contact?.phone}</small>{reason && <small className="fulfillment-skip-reason">{reason}</small>}</td><td>{shortDate(order.createdAt)}</td><td><span className={order.payment?.method === 'cod' ? 'fulfillment-tag is-cod' : 'fulfillment-tag'}>{paymentLabel(order)}{order.payment?.method === 'cod' && order.status !== 'paid' ? ' · รอเก็บ' : ''}</span></td><td>{stageLabel(order)}</td><td>{currency(order.totalSatang)}</td><td className="fulfillment-row-actions">
              {order.payment?.method === 'cod' && order.fulfillmentStatus === 'awaiting_cod_acceptance' && <button type="button" disabled={workingId === order.id} onClick={(event) => { event.stopPropagation(); void acceptCod(order); }}>รับ COD</button>}
              {order.fulfillmentStatus === 'ready_to_prepare' && <button type="button" disabled={workingId === order.id} onClick={(event) => { event.stopPropagation(); void updateStage(order, 'ready_to_ship'); }}>พร้อมส่ง</button>}
              {order.fulfillmentStatus === 'ready_to_ship' && <button type="button" disabled={workingId === order.id} onClick={(event) => { event.stopPropagation(); void updateStage(order, 'shipped'); }}>ส่งแล้ว</button>}
            </td>
          </tr>;
        })}
        </tbody></table>{busy && <p className="order-loading">กำลังโหลดออเดอร์…</p>}{!busy && !filtered.length && <p className="order-empty">ไม่พบออเดอร์ในตัวกรองนี้</p>}</div>
      {selectedOrder && <aside className="fulfillment-detail"><div><strong>{selectedOrder.orderNumber}</strong><span>{selectedOrder.contact.firstName} {selectedOrder.contact.lastName}</span><span>{selectedOrder.contact.phone}</span><span>{addressText(selectedOrder)}</span></div><div className="fulfillment-detail-actions"><button type="button" disabled={selectedOrder.fulfillmentStatus === 'shipped' || selectedOrder.status === 'cancelled'} onClick={() => openContactEditor(selectedOrder)}>แก้ข้อมูลผู้รับ</button></div>
        {history.length > 0 && <div className="fulfillment-history"><strong>ประวัติเอกสาร</strong>{history.slice(0, 5).map((item) => <span key={item.id}>{item.kind === 'label' ? 'ใบปะหน้า' : 'เอกสารแพ็กของ'} · {shortDate(item.createdAt)} · แอดมิน {item.createdByEmail}{item.shippingRevision < Number(selectedOrder.shippingRevision ?? 0) ? ' · ใบเดิมข้อมูลล้าสมัย' : ''}</span>)}</div>}
      </aside>}
    </section>
    {previewOpen && <div className="fulfillment-modal-backdrop"><section className="fulfillment-modal" role="dialog" aria-modal="true" aria-labelledby="fulfillment-preview-title"><h3 id="fulfillment-preview-title">ตรวจรายการก่อน{previewKind === 'label' ? 'พิมพ์ใบปะหน้า' : 'พิมพ์เอกสารแพ็กของ'}</h3><p>เลือก {previewRows.length} · พร้อม {eligibleSelected.length} · ข้าม {previewRows.length - eligibleSelected.length}</p>{previewKind === 'label' && <p>ยอด COD ที่ต้องลงในระบบขนส่ง: <strong>{currency(codTotal)}</strong></p>}<ul>{previewRows.map(({ order, reason }) => <li key={order.id}><strong>{order.orderNumber}</strong> · {order.contact.firstName} {order.contact.lastName}<br /><span>{order.contact.phone} · {addressText(order)}</span>{reason ? <em> · ข้าม: {reason}</em> : ''}</li>)}</ul><label className="fulfillment-layout-choice">รูปแบบ A4<select value={layout} onChange={(event) => setLayout(event.target.value as 'four' | 'two')}><option value="four">4 ใบต่อแผ่น</option><option value="two">2 ใบต่อแผ่น ตัวอักษรใหญ่</option></select></label><div className="fulfillment-modal-actions"><button type="button" onClick={() => setPreviewOpen(false)}>กลับไปแก้รายการ</button><button type="button" className="order-primary" disabled={!eligibleSelected.length || workingId === 'batch'} onClick={() => void generateAndPrint()}>{workingId === 'batch' ? 'กำลังเตรียมเอกสาร…' : 'สร้างและพิมพ์'}</button></div></section></div>}
    {editing && contactDraft && selectedOrder && <div className="fulfillment-modal-backdrop"><form className="fulfillment-modal fulfillment-contact-form" onSubmit={(event) => { event.preventDefault(); void saveContact(); }}><h3>แก้ข้อมูลจัดส่ง {selectedOrder.orderNumber}</h3>{(['firstName', 'lastName', 'phone', 'email', 'addressLine1', 'subdistrict', 'district', 'province', 'postalCode'] as const).map((field) => <label key={field}>{({ firstName: 'ชื่อ', lastName: 'นามสกุล', phone: 'เบอร์โทร', email: 'อีเมล', addressLine1: 'ที่อยู่', subdistrict: 'ตำบล/แขวง', district: 'อำเภอ/เขต', province: 'จังหวัด', postalCode: 'รหัสไปรษณีย์' })[field]}<input required value={contactDraft[field]} onChange={(event) => setContactDraft({ ...contactDraft, [field]: event.target.value })} /></label>)}<div className="fulfillment-modal-actions"><button type="button" onClick={() => setEditing(false)}>ยกเลิก</button><button type="submit" className="order-primary" disabled={workingId === selectedOrder.id}>บันทึกและทำให้ใบเดิมล้าสมัย</button></div></form></div>}
    {printBatch.length > 0 && <div className={`fulfillment-print-root ${printKind === 'packing' ? 'is-packing' : ''}`} aria-hidden="true">{pages.map((page, pageIndex) => printKind === 'packing'
      ? <section className="fulfillment-print-page packing-print-page" key={pageIndex}><header><h1>SOULMATE · รายการแพ็กสินค้า</h1><span>หน้า {pageIndex + 1}</span></header>{page.map(({ order }) => <article className="packing-order" key={order.id}><h2>{order.orderNumber}</h2><p>{order.contact.firstName} {order.contact.lastName} · {order.contact.phone}</p>{order.items.map((item, index) => <div className="packing-item" key={`${item.productId}-${item.variantId}-${index}`}><span>{item.productName}{item.variantName ? ` · ${item.variantName}` : ''} × {item.quantity}</span><i /></div>)}</article>)}</section>
      : <section className={`fulfillment-print-page label-print-page ${layout === 'two' ? 'is-two' : 'is-four'}`} key={pageIndex}>{page.map(({ order }) => <article className="parcel-label" key={order.id}><header><strong>SOULMATE</strong></header><div className="parcel-recipient"><span>ผู้รับ</span><h2>{order.contact.firstName} {order.contact.lastName}</h2><strong>{order.contact.phone}</strong><p>{addressText(order)}</p></div><div className="parcel-sender"><span>ผู้ส่ง / ส่งคืน</span><strong>{store.storeName}</strong><p>{store.storeAddress}</p><strong>{store.contactPhone}</strong></div><footer><strong>{order.orderNumber}</strong>{order.payment?.method === 'cod' ? <div className="parcel-cod"><span>เก็บเงินปลายทาง</span><b>{currency(order.totalSatang)}</b></div> : <b className="parcel-prepaid">ไม่ต้องเก็บเงิน</b>}</footer></article>)}</section>
    )}</div>}
  </main></AdminOrderShell>;
}
