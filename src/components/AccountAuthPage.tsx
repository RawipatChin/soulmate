import React, { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessAdmin, customerReturnPath, hasActiveAccount } from '../utils/accountAccess';
import { StorefrontShell } from './storefront/StorefrontShell';
import './account-auth.css';

type AuthMode = 'login' | 'register' | 'admin';

export function AccountAuthPage({ mode }: { mode: AuthMode }) {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = customerReturnPath((location.state as { from?: unknown } | null)?.from);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const submitting = useRef(false);

  useEffect(() => {
    setError('');
    setNotice('');
    setResetMode(false);
  }, [mode]);

  if (!auth.loading && !auth.profileLoading && auth.user && hasActiveAccount(auth.customerProfile)) {
    if (mode === 'admin' && canAccessAdmin(auth.customerProfile)) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (mode !== 'admin') {
      return <Navigate to={returnPath} replace />;
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError('');
    setNotice('');
    if (!email.trim()) {
      setError('กรุณาระบุอีเมล');
      return;
    }
    if (!resetMode && !password) {
      setError('กรุณาระบุรหัสผ่าน');
      return;
    }
    if (mode === 'register' && (password !== confirmPassword || !firstName.trim() || !lastName.trim() || !phone.trim())) {
      setError(password !== confirmPassword ? 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' : 'กรุณากรอกชื่อ นามสกุล และเบอร์โทรศัพท์');
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      if (resetMode) {
        await auth.resetPassword(email);
        setNotice('หากอีเมลนี้มีบัญชี ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้');
      } else if (mode === 'register') {
        await auth.register(email, password, { firstName, lastName, phone });
        navigate(returnPath, { replace: true });
      } else if (mode === 'admin') {
        const result = await auth.adminLogin(email, password);
        if (!result.authorized) {
          setError(result.reason || 'บัญชีนี้ไม่มีสิทธิ์เข้าหลังบ้าน');
          return;
        }
        navigate('/admin/dashboard', { replace: true });
      } else {
        await auth.login(email, password);
        navigate(returnPath, { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ดำเนินการไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  const isAdmin = mode === 'admin';
  const title = resetMode ? 'ตั้งรหัสผ่านใหม่' : mode === 'register' ? 'สมัครสมาชิก' : isAdmin ? 'เข้าสู่ระบบหลังบ้าน' : 'เข้าสู่ระบบ';
  const form = (
    <div className={`account-auth ${isAdmin ? 'account-auth--admin' : ''}`}>
      {isAdmin && (
        <aside className="account-auth-visual" aria-hidden="true">
          <div className="account-auth-visual-image" />
          <p>SOULMATE</p>
        </aside>
      )}
      <section className="account-auth-main" aria-labelledby="account-auth-heading">
        {isAdmin && <Link className="account-auth-brand" to="/"><img src="/logo-soulmate.png" alt="SOULMATE" /></Link>}
        <div className="account-auth-intro">
          <h1 id="account-auth-heading">{title}</h1>
          <p>{resetMode ? 'ระบุอีเมลที่ใช้กับบัญชีของคุณ' : isAdmin ? 'จัดการร้านด้วยบัญชี SOULMATE ของคุณ' : mode === 'register' ? 'สร้างบัญชีเพื่อจัดการข้อมูลส่วนตัว' : 'ยินดีต้อนรับกลับสู่ SOULMATE'}</p>
          {!isAdmin && !resetMode && <p>ซื้อสินค้าแบบ guest ได้โดยไม่ต้องสมัครสมาชิก</p>}
        </div>
        <form className="account-auth-form" onSubmit={submit} noValidate>
          {mode === 'register' && !resetMode && (
            <div className="account-auth-name-row">
              <label>ชื่อ<input autoComplete="given-name" maxLength={80} onChange={(e) => setFirstName(e.target.value)} required value={firstName} /></label>
              <label>นามสกุล<input autoComplete="family-name" maxLength={80} onChange={(e) => setLastName(e.target.value)} required value={lastName} /></label>
            </div>
          )}
          {mode === 'register' && !resetMode && (
            <label>เบอร์โทรศัพท์<input autoComplete="tel" inputMode="tel" maxLength={20} onChange={(e) => setPhone(e.target.value)} required type="tel" value={phone} /></label>
          )}
          <label>อีเมล<input autoComplete="email" onChange={(e) => setEmail(e.target.value)} required type="email" value={email} /></label>
          {!resetMode && (
            <label>รหัสผ่าน
              <span className="account-auth-password">
                <input autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={8} onChange={(e) => setPassword(e.target.value)} required type={showPassword ? 'text' : 'password'} value={password} />
                <button aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onClick={() => setShowPassword((value) => !value)} type="button"><span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
              </span>
            </label>
          )}
          {mode === 'register' && !resetMode && (
            <label>ยืนยันรหัสผ่าน<input autoComplete="new-password" minLength={8} onChange={(e) => setConfirmPassword(e.target.value)} required type={showPassword ? 'text' : 'password'} value={confirmPassword} /></label>
          )}
          {error && <p className="account-auth-message account-auth-message--error" role="alert">{error}</p>}
          {notice && <p className="account-auth-message account-auth-message--success" role="status">{notice}</p>}
          <button className="account-auth-submit" disabled={busy} type="submit">{busy ? 'กำลังดำเนินการ…' : resetMode ? 'ส่งลิงก์ตั้งรหัสผ่านใหม่' : mode === 'register' ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}</button>
        </form>
        {mode !== 'register' && (
          <button className="account-auth-text-action" onClick={() => { setResetMode((value) => !value); setError(''); setNotice(''); }} type="button">
            {resetMode ? 'กลับไปเข้าสู่ระบบ' : 'ลืมรหัสผ่าน?'}
          </button>
        )}
        <div className="account-auth-footer">
          {isAdmin ? <Link to="/">กลับไปหน้าร้าน</Link> : mode === 'register' ? <span>มีบัญชีอยู่แล้ว? <Link state={{ from: returnPath }} to="/login">เข้าสู่ระบบ</Link></span> : <span>ยังไม่มีบัญชี? <Link state={{ from: returnPath }} to="/register">สมัครสมาชิก</Link></span>}
        </div>
      </section>
    </div>
  );

  return isAdmin ? form : <StorefrontShell>{form}</StorefrontShell>;
}
