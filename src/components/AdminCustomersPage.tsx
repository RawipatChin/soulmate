import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, ChevronLeft, ChevronRight, Search, RefreshCw, Users, X } from 'lucide-react';
import { AdminOrderShell } from './OrderPages';
import { getCustomer, listCustomerOrders, listCustomers } from '../services/customerService';
import type { CustomerProfile } from '../types/customer';
import type { StoreOrder } from '../services/orderService';
import './admin-customers.css';

const nameOf = (person: CustomerProfile) => [person.firstName, person.lastName].filter(Boolean).join(' ') || person.displayName || 'ไม่ระบุชื่อ';
const dateOf = (value: CustomerProfile['createdAt']) => value?.toDate?.()?.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) ?? 'ไม่ระบุ';
const money = (value: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 2 }).format(value);
const statusOf = (person: CustomerProfile) => person.status === 'active' ? 'ใช้งานปกติ' : person.status === 'suspended' ? 'ระงับใช้งาน' : 'ไม่ระบุสถานะ';

function Notice({ error, loading, retry }: { error: string; loading: boolean; retry: () => void }) {
  return <div className="customer-notice" role={error ? 'alert' : 'status'}>
    <p>{error || (loading ? 'กำลังโหลดข้อมูลลูกค้า…' : 'ยังไม่มีบัญชีลูกค้า')}</p>
    {error ? <button onClick={retry}>ลองอีกครั้ง</button> : !loading && <span>บัญชีที่สมัครผ่านหน้าร้านจะแสดงที่นี่</span>}
  </div>;
}

export function AdminCustomersPage() {
  const [people, setPeople] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '';
  const filter = params.get('status') || 'all';
  const sort = params.get('sort') || 'newest';
  const pageSize = 12;
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    listCustomers().then(result => { if (active) setPeople(result); }).catch(() => {
      if (active) setError('โหลดรายชื่อลูกค้าไม่สำเร็จ กรุณาลองอีกครั้ง');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };
  const filtered = useMemo(() => people.filter(person => {
    const term = search.trim().toLocaleLowerCase('th');
    const matches = `${nameOf(person)} ${person.email || ''} ${person.phone || ''}`.toLocaleLowerCase('th').includes(term);
    return matches && (filter === 'all' || person.status === filter);
  }).sort((a, b) => sort === 'name' ? nameOf(a).localeCompare(nameOf(b), 'th') : (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)), [people, search, filter, sort]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1));
  return <AdminOrderShell title="ลูกค้า"><main className="customers-page">
    <div className="customers-heading"><div><h1>ลูกค้า</h1><p>ค้นหาบัญชีลูกค้าและดูประวัติคำสั่งซื้อ</p></div><button onClick={() => setRevision(value => value + 1)} disabled={loading}><RefreshCw size={16} />รีเฟรช</button></div>
    <div className="customers-toolbar"><label className="customer-search"><Search size={18} /><input aria-label="ค้นหาลูกค้า" placeholder="ค้นหาชื่อ อีเมล หรือเบอร์โทร" value={search} onChange={event => update('q', event.target.value)} />{search && <button aria-label="ล้างคำค้นหา" onClick={() => update('q', '')}><X size={16} /></button>}</label><label className="customer-sort">เรียงตาม<select value={sort} onChange={event => update('sort', event.target.value)}><option value="newest">สมัครล่าสุด</option><option value="name">ชื่อ ก–ฮ</option></select></label></div>
    <div className="customer-filters" aria-label="กรองสถานะลูกค้า">{[['all', 'ทั้งหมด'], ['active', 'ใช้งานปกติ'], ['suspended', 'ระงับใช้งาน']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => update('status', value)}>{label}</button>)}<span aria-live="polite">{!loading && !error ? `${filtered.length.toLocaleString('th-TH')} บัญชี` : ''}</span></div>
    {loading || error || people.length === 0 ? <Notice error={error} loading={loading} retry={() => setRevision(value => value + 1)} /> : filtered.length === 0 ? <div className="customer-notice" role="status"><Users size={28} /><h2>ไม่พบลูกค้าที่ตรงกัน</h2><p>ลองค้นหาด้วยชื่อ อีเมล หรือเบอร์โทรอื่น</p><button onClick={() => setParams({})}>ล้างการค้นหาและตัวกรอง</button></div> : <>
      <div className="customer-table-wrap"><table className="customer-table"><caption className="customer-sr-only">รายชื่อบัญชีลูกค้า</caption><thead><tr><th>ลูกค้า</th><th>เบอร์โทร</th><th>สถานะ</th><th>วันที่สมัคร</th><th><span className="customer-sr-only">รายละเอียด</span></th></tr></thead><tbody>{filtered.slice((page - 1) * pageSize, page * pageSize).map(person => <tr key={person.uid}><td><Link className="customer-name" to={`/admin/customers/${encodeURIComponent(person.uid)}`}><span className="customer-initial" aria-hidden="true">{Array.from(nameOf(person))[0]}</span><span><strong>{nameOf(person)}</strong><small>{person.email || 'ไม่ระบุอีเมล'}</small></span></Link></td><td>{person.phone || 'ไม่ระบุ'}</td><td><span className={`customer-status ${person.status === 'suspended' ? 'is-suspended' : ''}`}>{statusOf(person)}</span></td><td>{dateOf(person.createdAt)}</td><td><Link className="customer-open" to={`/admin/customers/${encodeURIComponent(person.uid)}`} aria-label={`ดูข้อมูล ${nameOf(person)}`}><ArrowUpRight size={18} /></Link></td></tr>)}</tbody></table></div>
      <footer className="customer-pagination"><span>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} จาก {filtered.length} บัญชี</span><div><button aria-label="หน้าก่อนหน้า" disabled={page === 1} onClick={() => update('page', String(page - 1))}><ChevronLeft size={18} /></button><span>{page} / {pages}</span><button aria-label="หน้าถัดไป" disabled={page === pages} onClick={() => update('page', String(page + 1))}><ChevronRight size={18} /></button></div></footer>
    </>}
    <p className="customer-footnote">แสดงบัญชีที่ลงทะเบียน · ผู้ซื้อแบบไม่สมัครสมาชิกดูได้ในหน้าคำสั่งซื้อ</p>
  </main></AdminOrderShell>;
}

export function AdminCustomerDetailPage() {
  const { customerId } = useParams();
  const [person, setPerson] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setPerson(null); setOrders([]);
    if (!customerId) { setLoading(false); return; }
    Promise.all([getCustomer(customerId), listCustomerOrders(customerId)]).then(([profile, history]) => {
      if (active) { setPerson(profile); setOrders(history); }
    }).catch(() => { if (active) setError('โหลดข้อมูลลูกค้าไม่สำเร็จ กรุณาลองอีกครั้ง'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customerId, revision]);
  const address = person?.defaultShippingAddress;
  return <AdminOrderShell title="ข้อมูลลูกค้า"><main className="customers-page">
    <Link className="customer-back" to="/admin/customers"><ArrowLeft size={16} />รายชื่อลูกค้า</Link>
    {loading || error ? <Notice loading={loading} error={error} retry={() => setRevision(value => value + 1)} /> : !person ? <div className="customer-notice"><h1>ไม่พบบัญชีลูกค้า</h1><p>บัญชีนี้อาจถูกลบหรือไม่ใช่บัญชีลูกค้า</p></div> : <>
      <div className="customers-heading"><div><h1>{nameOf(person)}</h1><p>สมัครเมื่อ {dateOf(person.createdAt)}</p></div><span className="customer-status">{statusOf(person)}</span></div>
      <section className="customer-contact" aria-labelledby="contact-title"><h2 id="contact-title">ข้อมูลติดต่อ</h2><dl><div><dt>อีเมล</dt><dd>{person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : 'ไม่ระบุ'}</dd></div><div><dt>เบอร์โทร</dt><dd>{person.phone ? <a href={`tel:${person.phone}`}>{person.phone}</a> : 'ไม่ระบุ'}</dd></div><div><dt>ที่อยู่จัดส่งเริ่มต้น</dt><dd>{address ? [address.firstName, address.lastName, address.addressLine1, address.subdistrict, address.district, address.province, address.postalCode].filter(Boolean).join(' ') : 'ยังไม่ได้บันทึกที่อยู่'}</dd></div></dl></section>
      <section className="customer-history" aria-labelledby="history-title"><div className="customer-section-heading"><h2 id="history-title">ประวัติคำสั่งซื้อ</h2><span>{orders.length} รายการ</span></div>{orders.length === 0 ? <div className="customer-notice"><p>ยังไม่มีคำสั่งซื้อของบัญชีนี้</p></div> : <div className="customer-table-wrap"><table className="customer-table"><thead><tr><th>คำสั่งซื้อ</th><th>วันที่</th><th>สถานะการชำระเงิน</th><th>ยอดรวม</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><Link to={`/admin/orders/${encodeURIComponent(order.id)}`}>{order.orderNumber || order.id}</Link></td><td>{dateOf(order.createdAt)}</td><td>{order.payment?.status === 'successful' || order.status === 'paid' ? 'ชำระแล้ว' : order.status === 'cancelled' ? 'ยกเลิกแล้ว' : order.status === 'awaiting_review' ? 'รอตรวจสลิป' : order.status === 'expired' || order.payment?.status === 'expired' ? 'หมดอายุ' : order.status === 'payment_failed' || order.payment?.status === 'failed' ? 'ชำระไม่สำเร็จ' : order.payment?.method === 'cod' ? 'รอเก็บเงินปลายทาง' : 'รอชำระเงิน'}</td><td>{money((order.totalSatang || 0) / 100)}</td></tr>)}</tbody></table></div>}</section>
    </>}
  </main></AdminOrderShell>;
}
