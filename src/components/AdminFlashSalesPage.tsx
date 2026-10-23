import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, LoaderCircle, Pencil, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { AdminOrderShell } from './OrderPages';
import { deleteFlashSaleImage, getFlashSale, listFlashSales, MAX_FLASH_SALE_IMAGE_SIZE, normalizeFlashSaleLink, removeFlashSale, saveFlashSale, setFlashSaleActive, uploadFlashSaleImage, type FlashSale, type FlashSaleInput } from '../services/flashSaleService';
import './admin-flash-sales.css';

const localDateTime = (value: Timestamp) => { const date = value.toDate(); return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); };
const dateText = (value: Timestamp) => value.toDate().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
const freshForm = (): FlashSaleInput => ({ title: '', message: '', imageUrl: '', imagePath: '', linkUrl: '/products', startsAt: Timestamp.fromDate(new Date()), endsAt: Timestamp.fromDate(new Date(Date.now() + 3 * 86400_000)), active: false });

function usePreview(file: File | null) {
  const [url, setUrl] = useState('');
  useEffect(() => { if (!file) { setUrl(''); return; } const next = URL.createObjectURL(file); setUrl(next); return () => URL.revokeObjectURL(next); }, [file]);
  return url;
}

function saleStatus(sale: FlashSale) {
  const now = Date.now();
  if (!sale.active) return 'ปิดอยู่';
  if (sale.startsAt.toMillis() > now) return 'รอเริ่ม';
  if (sale.endsAt.toMillis() <= now) return 'หมดเวลา';
  return 'กำลังแสดง';
}

export function AdminFlashSalesPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setSales(await listFlashSales()); }
    catch (cause) { console.error('[Flash Sale] Load failed', cause); setError('โหลดแคมเปญไม่สำเร็จ ลองอีกครั้ง'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const toggle = async (sale: FlashSale) => {
    setBusy(sale.id); setError('');
    try { await setFlashSaleActive(sale.id, !sale.active); await load(); }
    catch (cause) { console.error('[Flash Sale] Status update failed', cause); setError('เปลี่ยนสถานะไม่สำเร็จ'); }
    finally { setBusy(''); }
  };
  const remove = async (sale: FlashSale) => {
    if (!window.confirm(`ลบแคมเปญ “${sale.title}” หรือไม่?`)) return;
    setBusy(sale.id); setError('');
    try { await removeFlashSale(sale); setSales((current) => current.filter((item) => item.id !== sale.id)); }
    catch (cause) { console.error('[Flash Sale] Delete failed', cause); setError('ลบแคมเปญไม่สำเร็จ'); }
    finally { setBusy(''); }
  };
  return <AdminOrderShell title="Flash Sale"><main className="flash-admin-page">
    <header className="flash-page-heading"><div><h2>Flash Sale Popup</h2><p>โปรโมชันที่แสดงเมื่อเข้าหน้าร้านครั้งแรก</p></div><div className="flash-page-actions"><button className="flash-icon-button" type="button" aria-label="รีเฟรช" onClick={() => void load()} disabled={loading}><RefreshCw size={17} /></button><button className="flash-primary-button" type="button" onClick={() => navigate('/admin/flash-sales/new')}><Plus size={17} />สร้างโปรโมชัน</button></div></header>
    {error && <p className="flash-error" role="alert">{error}</p>}
    {loading ? <div className="flash-loading" role="status"><LoaderCircle className="flash-spin" size={20} />กำลังโหลด</div> : error ? null : sales.length === 0 ? <div className="flash-empty"><ImageIcon size={25} /><h3>ยังไม่มีโปรโมชัน</h3><p>สร้างแคมเปญเพื่อแสดงป๊อปอัปบนหน้าแรก</p><button className="flash-primary-button" type="button" onClick={() => navigate('/admin/flash-sales/new')}><Plus size={17} />สร้างโปรโมชัน</button></div> : <div className="flash-list">{sales.map((sale) => <article className="flash-row" key={sale.id}>
      {sale.imageUrl ? <img className="flash-row-image" src={sale.imageUrl} alt="" /> : <span className="flash-row-placeholder"><ImageIcon size={22} /></span>}
      <div className="flash-row-copy"><div className="flash-row-title"><h3>{sale.title}</h3><span className={`flash-status ${saleStatus(sale) === 'กำลังแสดง' ? 'is-live' : ''}`}>{saleStatus(sale)}</span></div><p>{sale.message}</p><small>{dateText(sale.startsAt)} – {dateText(sale.endsAt)}</small></div>
      <button className={`flash-switch ${sale.active ? 'is-active' : ''}`} type="button" role="switch" aria-checked={sale.active} aria-label={`${sale.active ? 'ปิด' : 'เปิด'} ${sale.title}`} onClick={() => void toggle(sale)} disabled={busy === sale.id}><span /></button>
      <button className="flash-icon-button" type="button" aria-label={`แก้ไข ${sale.title}`} onClick={() => navigate(`/admin/flash-sales/${sale.id}/edit`)}><Pencil size={16} /></button>
      <button className="flash-icon-button is-danger" type="button" aria-label={`ลบ ${sale.title}`} onClick={() => void remove(sale)} disabled={busy === sale.id}><Trash2 size={16} /></button>
    </article>)}</div>}
  </main></AdminOrderShell>;
}

export function AdminFlashSaleFormPage() {
  const { flashSaleId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(flashSaleId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sale, setSale] = useState<FlashSale | null>(null);
  const [form, setForm] = useState<FlashSaleInput>(freshForm);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const preview = usePreview(file);
  useEffect(() => {
    if (!flashSaleId) return;
    let alive = true;
    getFlashSale(flashSaleId).then((result) => { if (!alive) return; if (!result) setError('ไม่พบโปรโมชัน'); else { setSale(result); setForm(result); } })
      .catch((cause) => { console.error('[Flash Sale] Load failed', cause); if (alive) setError('โหลดโปรโมชันไม่สำเร็จ'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [flashSaleId]);
  const imageUrl = useMemo(() => preview || form.imageUrl, [form.imageUrl, preview]);
  const set = <K extends keyof FlashSaleInput>(key: K, value: FlashSaleInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError('');
    if (!form.title.trim()) return setError('กรอกชื่อโปรโมชัน');
    if (!imageUrl) return setError('เลือกรูปโปรโมชัน');
    if (form.startsAt.toMillis() >= form.endsAt.toMillis()) return setError('วันสิ้นสุดต้องอยู่หลังวันเริ่ม');
    try { normalizeFlashSaleLink(form.linkUrl); } catch (cause) { return setError(cause instanceof Error ? cause.message : 'ลิงก์ไม่ถูกต้อง'); }
    if (file && (file.size > MAX_FLASH_SALE_IMAGE_SIZE || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) return setError('เลือกรูป JPG, PNG หรือ WEBP ขนาดไม่เกิน 5 MB');
    setSaving(true);
    const campaignKey = flashSaleId || crypto.randomUUID();
    let uploaded: { url: string; path: string } | null = null;
    try {
      if (file) uploaded = await uploadFlashSaleImage(campaignKey, file);
      const next: FlashSaleInput = { ...form, imageUrl: uploaded?.url ?? form.imageUrl, imagePath: uploaded?.path ?? form.imagePath };
      await saveFlashSale(flashSaleId ?? null, next);
      if (sale && uploaded) await deleteFlashSaleImage(sale.imagePath);
      navigate('/admin/flash-sales', { replace: true });
    } catch (cause) {
      console.error('[Flash Sale] Save failed', cause);
      if (uploaded) await deleteFlashSaleImage(uploaded.path).catch((cleanupError) => console.warn('[Flash Sale] Image cleanup failed', cleanupError));
      setError(cause instanceof Error ? cause.message : 'บันทึกโปรโมชันไม่สำเร็จ'); setSaving(false);
    }
  };
  return <AdminOrderShell title={editing ? 'แก้ไข Flash Sale' : 'สร้าง Flash Sale'}><main className="flash-admin-page flash-form-page">
    <button className="flash-back-button" type="button" onClick={() => navigate('/admin/flash-sales')}><ArrowLeft size={17} />Flash Sale</button><header className="flash-page-heading"><div><h2>{editing ? 'แก้ไขโปรโมชัน' : 'โปรโมชันใหม่'}</h2><p>ตั้งรูป ข้อความ และช่วงเวลาที่แสดง</p></div></header>
    {loading ? <div className="flash-loading" role="status"><LoaderCircle className="flash-spin" size={20} />กำลังโหลด</div> : error && editing && !sale ? <p className="flash-error" role="alert">{error}</p> : <form className="flash-form" onSubmit={save}>
      <div className="flash-form-main"><label className="flash-field"><span>ชื่อแคมเปญ</span><input maxLength={100} value={form.title} onChange={(event) => set('title', event.currentTarget.value)} placeholder="เช่น Flash Sale ปลายเดือน" required /></label>
        <label className="flash-field"><span>ข้อความโปรโมชัน</span><textarea maxLength={240} rows={3} value={form.message} onChange={(event) => set('message', event.currentTarget.value)} placeholder="บอกสิทธิพิเศษให้ลูกค้าเข้าใจในประโยคเดียว" /></label>
        <label className="flash-field"><span>ลิงก์ปุ่ม</span><input value={form.linkUrl} onChange={(event) => set('linkUrl', event.currentTarget.value)} placeholder="/products" required /><small>ใช้ลิงก์ภายในร้าน เช่น /products หรือ /products/ชื่อสินค้า</small></label>
        <div className="flash-date-grid"><label className="flash-field"><span>เริ่มแสดง</span><input type="datetime-local" value={localDateTime(form.startsAt)} onChange={(event) => set('startsAt', Timestamp.fromDate(new Date(event.currentTarget.value)))} required /></label><label className="flash-field"><span>สิ้นสุด</span><input type="datetime-local" value={localDateTime(form.endsAt)} onChange={(event) => set('endsAt', Timestamp.fromDate(new Date(event.currentTarget.value)))} required /></label></div>
        <label className="flash-active"><span><strong>เปิดใช้โปรโมชัน</strong><small>แสดงในช่วงเวลาที่กำหนด</small></span><button type="button" role="switch" aria-checked={form.active} aria-label="เปิดใช้โปรโมชัน" className={`flash-switch ${form.active ? 'is-active' : ''}`} onClick={() => set('active', !form.active)}><span /></button></label>
      </div>
      <div className="flash-image-field"><h3>รูปโปรโมชัน</h3><div className="flash-image-preview">{imageUrl ? <img src={imageUrl} alt="ตัวอย่างรูปโปรโมชัน" /> : <ImageIcon size={28} />}</div><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => { setFile(event.currentTarget.files?.[0] ?? null); }} /><div className="flash-image-actions"><button type="button" className="flash-secondary-button" onClick={() => inputRef.current?.click()}><Upload size={16} />{imageUrl ? 'เปลี่ยนรูป' : 'เลือกรูป'}</button>{file && <button type="button" className="flash-icon-button" aria-label="ยกเลิกรูปใหม่" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ''; }}><X size={17} /></button>}</div><small>JPG, PNG, WEBP · ไม่เกิน 5 MB</small></div>
      {error && <p className="flash-error" role="alert">{error}</p>}<footer className="flash-form-footer"><button type="button" className="flash-secondary-button" onClick={() => navigate('/admin/flash-sales')} disabled={saving}>ยกเลิก</button><button className="flash-primary-button" type="submit" disabled={saving}>{saving && <LoaderCircle className="flash-spin" size={16} />}{saving ? 'กำลังบันทึก…' : 'บันทึกโปรโมชัน'}</button></footer>
    </form>}
  </main></AdminOrderShell>;
}

