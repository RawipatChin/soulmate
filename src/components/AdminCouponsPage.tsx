import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { AdminOrderShell } from './OrderPages';
import { deleteCoupon, getCoupon, listCoupons, saveCoupon, setCouponActive, type Coupon, type CouponInput } from '../services/couponService';
import './admin-coupons.css';

const baht = (satang: number) => `฿${(satang / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 })}`;
const dateText = (value: Timestamp) => value.toDate().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
const localDateTime = (value: Timestamp) => { const date = value.toDate(); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
const initial: CouponInput = { code: '', type: 'percent', value: 10, maxDiscountSatang: null, minSubtotalSatang: 0, startsAt: Timestamp.fromDate(new Date()), endsAt: Timestamp.fromDate(new Date(Date.now() + 30 * 86400_000)), active: false, usageLimit: 100 };

function statusOf(coupon: Coupon) {
  if (!coupon.active) return 'ปิดใช้';
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) return 'ใช้ครบ';
  if (Date.now() < coupon.startsAt.toMillis()) return 'ยังไม่เริ่ม';
  if (Date.now() >= coupon.endsAt.toMillis()) return 'หมดอายุ';
  return 'ใช้งานได้';
}

export function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ทั้งหมด');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setCoupons(await listCoupons()); }
    catch { setError('โหลดคูปองไม่สำเร็จ ลองอีกครั้ง'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => coupons.filter(c => c.code.toLowerCase().includes(query.trim().toLowerCase()) && (filter === 'ทั้งหมด' || statusOf(c) === filter)), [coupons, query, filter]);
  const toggle = async (coupon: Coupon) => {
    setBusy(coupon.code); setError('');
    try { await setCouponActive(coupon.code, !coupon.active); await load(); }
    catch { setError('เปลี่ยนสถานะไม่สำเร็จ ลองอีกครั้ง'); }
    finally { setBusy(''); }
  };
  return <AdminOrderShell title="คูปอง"><main className="coupon-page">
    <header className="coupon-page-head"><div><h1>คูปอง</h1><p>ส่วนลดสำหรับหน้าร้าน</p></div><Link className="coupon-primary" to="/admin/coupons/new"><Plus size={18} />สร้างคูปอง</Link></header>
    <div className="coupon-tools"><div className="coupon-tabs" role="group" aria-label="กรองสถานะ">{['ทั้งหมด', 'ใช้งานได้', 'ยังไม่เริ่ม', 'ใช้ครบ', 'หมดอายุ', 'ปิดใช้'].map(label => <button key={label} type="button" className={filter === label ? 'selected' : ''} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div><label className="coupon-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ค้นหารหัส" aria-label="ค้นหารหัสคูปอง" /></label><button className="coupon-icon" type="button" aria-label="รีเฟรช" title="รีเฟรช" onClick={() => void load()} disabled={loading}><RefreshCw size={18} /></button></div>
    {error && <p className="coupon-error" role="alert">{error}</p>}
    {loading ? <p className="coupon-muted" role="status">กำลังโหลดคูปอง…</p> : error ? null : visible.length === 0 ? <div className="coupon-empty"><h2>{query || filter !== 'ทั้งหมด' ? 'ไม่พบคูปอง' : 'ยังไม่มีคูปอง'}</h2><p>{query || filter !== 'ทั้งหมด' ? 'ลองเปลี่ยนคำค้นหรือสถานะ' : 'สร้างรหัสแรกเพื่อให้ลูกค้าใช้ที่ Checkout'}</p>{!query && filter === 'ทั้งหมด' && <Link to="/admin/coupons/new">สร้างคูปอง</Link>}</div> : <div className="coupon-table-scroll" role="region" aria-label="ตารางคูปอง" tabIndex={0}><table className="coupon-table"><thead><tr><th scope="col">รหัสคูปอง</th><th scope="col">สถานะ</th><th scope="col">ส่วนลด</th><th scope="col">ขั้นต่ำยอดสินค้า</th><th scope="col">ระยะเวลา</th><th scope="col">ใช้แล้ว / โควตา</th><th scope="col">เปิดใช้</th><th scope="col"><span className="coupon-visually-hidden">การจัดการ</span></th></tr></thead><tbody>{visible.map(coupon => <tr key={coupon.code}><th scope="row" className="coupon-table-code">{coupon.code}</th><td><span className={`coupon-status ${statusOf(coupon) === 'ใช้งานได้' ? 'live' : ''}`}>{statusOf(coupon)}</span></td><td className="coupon-table-discount">{coupon.type === 'percent' ? `ลด ${coupon.value}%${coupon.maxDiscountSatang ? ` (สูงสุด ${baht(coupon.maxDiscountSatang)})` : ''}` : `ลด ${baht(coupon.value)}`}</td><td>{baht(coupon.minSubtotalSatang)}</td><td className="coupon-table-validity">{dateText(coupon.startsAt)} – {dateText(coupon.endsAt)}</td><td className="coupon-table-usage">{coupon.usedCount} / {coupon.usageLimit ?? 'ไม่จำกัด'}</td><td><label className="coupon-switch"><input type="checkbox" checked={coupon.active} disabled={busy === coupon.code} onChange={() => void toggle(coupon)} aria-label={`${coupon.active ? 'ปิด' : 'เปิด'}คูปอง ${coupon.code}`} /><span aria-hidden="true" /></label></td><td><Link className="coupon-icon" aria-label={`แก้ไข ${coupon.code}`} to={`/admin/coupons/${encodeURIComponent(coupon.code)}/edit`}><Pencil size={17} /></Link></td></tr>)}</tbody></table></div>}
  </main></AdminOrderShell>;
}

export function AdminCouponFormPage() {
  const { couponId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<CouponInput>(initial);
  const [existing, setExisting] = useState<Coupon | null>(null);
  const [loading, setLoading] = useState(Boolean(couponId));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (!couponId) return; let live = true; void getCoupon(couponId).then(c => { if (!live) return; setExisting(c); if (c) setForm(c); else setError('ไม่พบคูปอง'); }).catch(() => { if (live) setError('โหลดคูปองไม่สำเร็จ'); }).finally(() => { if (live) setLoading(false); }); return () => { live = false; }; }, [couponId]);
  const locked = Boolean(existing?.everUsed);
  const set = <K extends keyof CouponInput>(key: K, value: CouponInput[K]) => setForm(prev => ({ ...prev, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,24}$/.test(code)) return setError('รหัสต้องเป็น A–Z หรือ 0–9 จำนวน 3–24 ตัว');
    if (!form.startsAt || !form.endsAt || form.startsAt.toMillis() >= form.endsAt.toMillis()) return setError('วันสิ้นสุดต้องอยู่หลังวันเริ่ม');
    if (!Number.isInteger(form.usageLimit) || (form.usageLimit ?? 0) < 1 || (form.usageLimit ?? 0) < (existing?.usedCount ?? 0)) return setError('จำนวนสิทธิ์ต้องไม่น้อยกว่าที่ใช้ไปแล้ว');
    if (form.type === 'percent' && (form.value < 1 || form.value > 100 || (form.maxDiscountSatang ?? 0) <= 0)) return setError('ระบุส่วนลด 1–100% และเพดานส่วนลด');
    if (form.type === 'fixed' && form.value <= 0) return setError('ระบุจำนวนเงินส่วนลด');
    setBusy(true);
    try { if (!couponId && await getCoupon(code)) throw new Error('รหัสคูปองนี้มีแล้ว'); await saveCoupon({ ...form, code }); navigate('/admin/coupons'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'บันทึกไม่สำเร็จ'); }
    finally { setBusy(false); }
  };
  const remove = async () => { if (!existing || existing.everUsed || !window.confirm(`ลบคูปอง ${existing.code}?`)) return; setBusy(true); try { await deleteCoupon(existing.code); navigate('/admin/coupons'); } catch { setError('ลบคูปองไม่สำเร็จ'); setBusy(false); } };
  return <AdminOrderShell title={couponId ? 'แก้ไขคูปอง' : 'สร้างคูปอง'}><main className="coupon-page"><header className="coupon-page-head"><div><Link className="coupon-back" to="/admin/coupons"><ArrowLeft size={17} /> คูปอง</Link><h1>{couponId ? 'แก้ไขคูปอง' : 'สร้างคูปอง'}</h1></div></header>{loading ? <p role="status">กำลังโหลด…</p> : <form className="coupon-form" onSubmit={submit}><div className="coupon-field"><label htmlFor="coupon-code">รหัสคูปอง</label><input id="coupon-code" value={form.code} onChange={e => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24))} placeholder="WELCOME10" disabled={Boolean(couponId)} required /></div><div className="coupon-field"><span>ส่วนลด</span><div className="coupon-segment">{(['percent', 'fixed'] as const).map(type => <label key={type}><input type="radio" name="coupon-type" value={type} checked={form.type === type} disabled={locked} onChange={() => setForm(prev => ({ ...prev, type, value: type === 'percent' ? 10 : 10000, maxDiscountSatang: null }))} />{type === 'percent' ? 'เปอร์เซ็นต์' : 'จำนวนเงิน'}</label>)}</div></div><div className="coupon-form-grid"><div className="coupon-field"><label htmlFor="coupon-value">{form.type === 'percent' ? 'ส่วนลด (%)' : 'ส่วนลด (บาท)'}</label><input id="coupon-value" type="number" min="1" max={form.type === 'percent' ? 100 : undefined} value={form.type === 'fixed' ? form.value / 100 : form.value} disabled={locked} onChange={e => set('value', form.type === 'fixed' ? Math.round(Number(e.target.value) * 100) : Number(e.target.value))} required /></div>{form.type === 'percent' && <div className="coupon-field"><label htmlFor="coupon-cap">ลดสูงสุด (บาท)</label><input id="coupon-cap" type="number" min="1" value={(form.maxDiscountSatang ?? 0) / 100 || ''} disabled={locked} onChange={e => set('maxDiscountSatang', Math.round(Number(e.target.value) * 100))} required /></div>}<div className="coupon-field"><label htmlFor="coupon-min">ยอดขั้นต่ำ (บาท)</label><input id="coupon-min" type="number" min="0" value={form.minSubtotalSatang / 100} disabled={locked} onChange={e => set('minSubtotalSatang', Math.round(Number(e.target.value) * 100))} /></div><div className="coupon-field"><label htmlFor="coupon-limit">จำนวนสิทธิ์รวม</label><input id="coupon-limit" type="number" min="1" value={form.usageLimit ?? 0} disabled={locked} onChange={e => set('usageLimit', Number(e.target.value))} required /></div><div className="coupon-field"><label htmlFor="coupon-start">เริ่มใช้</label><input id="coupon-start" type="datetime-local" value={localDateTime(form.startsAt)} disabled={locked} onChange={e => set('startsAt', Timestamp.fromDate(new Date(e.target.value)))} required /></div><div className="coupon-field"><label htmlFor="coupon-end">สิ้นสุด</label><input id="coupon-end" type="datetime-local" value={localDateTime(form.endsAt)} disabled={locked} onChange={e => set('endsAt', Timestamp.fromDate(new Date(e.target.value)))} required /></div></div><label className="coupon-active"><input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />เปิดใช้งาน</label>{locked && <p className="coupon-muted">คูปองนี้ถูกใช้แล้ว แก้ไขเงื่อนไขไม่ได้</p>}{error && <p className="coupon-error" role="alert">{error}</p>}<footer className="coupon-form-actions"><button className="coupon-primary" disabled={busy} type="submit">{busy ? 'กำลังบันทึก…' : 'บันทึกคูปอง'}</button><Link to="/admin/coupons">ยกเลิก</Link>{existing && !locked && <button type="button" className="coupon-danger" disabled={busy} onClick={() => void remove()}>ลบคูปอง</button>}</footer></form>}</main></AdminOrderShell>;
}




