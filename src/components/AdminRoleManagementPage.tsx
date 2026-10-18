import { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, Users, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { CustomerProfile } from '../types/customer';
import { changeUserRole, listRoleManagedUsers, type StaffRole } from '../services/adminRoleService';
import { AdminOrderShell } from './OrderPages';
import './admin-role-management.css';

type PendingRoleChange = { person: CustomerProfile; role: StaffRole };

const roleName = (role: string) => role === 'super_admin' ? 'Super Admin' : role === 'admin' ? 'Admin' : 'ลูกค้า';
const personName = (person: CustomerProfile) => [person.firstName, person.lastName].filter(Boolean).join(' ').trim() || person.displayName || person.email || 'ไม่ระบุชื่อ';

export function AdminRoleManagementPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const [pendingChange, setPendingChange] = useState<PendingRoleChange | null>(null);
  const [busyUid, setBusyUid] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listRoleManagedUsers().then((result) => {
      if (active) setPeople(result);
    }).catch(() => {
      if (active) setError('โหลดบัญชีผู้ใช้ไม่สำเร็จ กรุณาลองอีกครั้ง');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [revision]);

  const filteredPeople = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('th');
    return people.filter((person) => `${personName(person)} ${person.email || ''}`.toLocaleLowerCase('th').includes(term));
  }, [people, search]);

  const applyRoleChange = async ({ person, role }: PendingRoleChange) => {
    setBusyUid(person.uid);
    setError('');
    setNotice('');
    try {
      await changeUserRole(person.uid, role);
      setPeople((current) => current.map((item) => item.uid === person.uid ? { ...item, role } : item));
      setNotice(`เปลี่ยนสิทธิ์ ${personName(person)} เป็น ${roleName(role)} แล้ว`);
      setPendingChange(null);
      if (person.uid === auth.user?.uid) {
        await auth.refreshCustomerProfile();
        if (role !== 'super_admin') navigate('/admin/dashboard', { replace: true });
      }
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'เปลี่ยนสิทธิ์ไม่สำเร็จ กรุณาลองอีกครั้ง');
      setPendingChange(null);
    } finally {
      setBusyUid('');
    }
  };

  const requestRoleChange = (person: CustomerProfile, value: string) => {
    const role: StaffRole = value === 'admin' || value === 'super_admin' ? value : 'customer';
    const previousRole = person.role === 'user' ? 'customer' : person.role;
    if (role === previousRole) return;
    const change = { person, role };
    if (role === 'super_admin' || previousRole === 'super_admin') setPendingChange(change);
    else void applyRoleChange(change);
  };

  return <AdminOrderShell title="ผู้ดูแลและสิทธิ์"><main className="admin-role-page">
    <section className="admin-role-heading">
      <div>
        <p className="admin-role-eyebrow"><ShieldCheck size={15} />ควบคุมสิทธิ์การเข้าถึง</p>
        <h1>ผู้ดูแลและสิทธิ์</h1>
        <p>ค้นหาบัญชีที่มีอยู่แล้ว แล้วกำหนดระดับการเข้าถึงหลังบ้าน</p>
      </div>
      <button className="admin-role-refresh" type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading}>
        <RefreshCw size={16} /> รีเฟรช
      </button>
    </section>

    <section className="admin-role-card" aria-labelledby="admin-role-list-title">
      <div className="admin-role-card-heading">
        <div><h2 id="admin-role-list-title">บัญชีผู้ใช้</h2><p>เปลี่ยนสิทธิ์ได้เฉพาะบัญชีที่เปิดใช้งาน</p></div>
        <span className="admin-role-count"><Users size={15} />{people.length.toLocaleString('th-TH')} บัญชี</span>
      </div>
      <label className="admin-role-search"><Search size={17} aria-hidden="true" /><span className="sr-only">ค้นหาบัญชี</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อหรืออีเมล" /></label>
      {error && <p className="admin-role-feedback is-error" role="alert">{error}</p>}
      {notice && <p className="admin-role-feedback" role="status">{notice}</p>}
      {loading ? <div className="admin-role-empty" role="status">กำลังโหลดบัญชีผู้ใช้…</div> : error ? <div className="admin-role-empty"><button type="button" onClick={() => setRevision((value) => value + 1)}>ลองอีกครั้ง</button></div> : filteredPeople.length === 0 ? <div className="admin-role-empty" role="status">{people.length ? 'ไม่พบบัญชีที่ตรงกับคำค้นหา' : 'ยังไม่มีบัญชีผู้ใช้'}</div> : <div className="admin-role-table-wrap"><table className="admin-role-table">
        <thead><tr><th scope="col">บัญชีผู้ใช้</th><th scope="col">สิทธิ์ปัจจุบัน</th><th scope="col">สถานะ</th><th scope="col">กำหนดสิทธิ์</th></tr></thead>
        <tbody>{filteredPeople.map((person) => {
          const active = person.status === 'active';
          const currentRole = person.role === 'user' ? 'customer' : person.role;
          return <tr key={person.uid}>
            <td><strong>{personName(person)}</strong><small>{person.email || 'ไม่ระบุอีเมล'}</small></td>
            <td><span className={`admin-role-badge role-${currentRole}`}>{roleName(currentRole)}</span></td>
            <td><span className={`admin-role-status ${active ? 'is-active' : ''}`}>{active ? 'ใช้งาน' : person.status === 'suspended' ? 'ระงับใช้งาน' : 'ไม่ทราบสถานะ'}</span></td>
            <td><select aria-label={`กำหนดสิทธิ์ ${personName(person)}`} disabled={!active || busyUid === person.uid} value={currentRole} onChange={(event) => requestRoleChange(person, event.target.value)}>
              <option value="customer">ลูกค้า</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option>
            </select></td>
          </tr>;
        })}</tbody>
      </table></div>}
    </section>
    <p className="admin-role-footnote">บัญชีใหม่ต้องสมัครใช้งานก่อน จึงจะกำหนดสิทธิ์ผู้ดูแลได้</p>

    {pendingChange && <div className="admin-role-dialog-backdrop"><section className="admin-role-dialog" role="alertdialog" aria-modal="true" aria-labelledby="role-confirm-title" aria-describedby="role-confirm-message">
      <span className="admin-role-dialog-icon"><ShieldCheck size={20} /></span>
      <h2 id="role-confirm-title">ยืนยันการเปลี่ยน Super Admin</h2>
      <p id="role-confirm-message">คุณกำลังเปลี่ยนสิทธิ์ของ <strong>{personName(pendingChange.person)}</strong> จาก <strong>{roleName(pendingChange.person.role)}</strong> เป็น <strong>{roleName(pendingChange.role)}</strong> ซึ่งจะเปลี่ยนการเข้าถึงการตั้งค่าร้านและบัญชีผู้ดูแล</p>
      <div className="admin-role-dialog-actions"><button type="button" onClick={() => setPendingChange(null)} disabled={Boolean(busyUid)}>ยกเลิก</button><button type="button" onClick={() => void applyRoleChange(pendingChange)} disabled={Boolean(busyUid)}>{busyUid ? 'กำลังบันทึก…' : 'ยืนยันการเปลี่ยนสิทธิ์'}</button></div>
    </section></div>}
  </main></AdminOrderShell>;
}
