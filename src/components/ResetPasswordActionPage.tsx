import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { ArrowLeft, CheckCircle2, KeyRound, ShieldAlert } from 'lucide-react';
import { auth } from '../lib/firebase';
import { StorefrontShell } from './storefront/StorefrontShell';
import './reset-password-action.css';

type PageState = 'checking' | 'ready' | 'complete' | 'invalid';

function actionErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
    return 'ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ตั้งรหัสผ่านใหม่';
  }
  if (code === 'auth/user-disabled') return 'บัญชีนี้ถูกระงับ กรุณาติดต่อร้านค้า';
  if (code === 'auth/user-not-found') return 'ไม่พบบัญชีนี้ กรุณาตรวจสอบอีเมลหรือสมัครสมาชิกใหม่';
  if (code === 'auth/weak-password') return 'รหัสผ่านยังไม่ปลอดภัยเพียงพอ กรุณาใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร';
  if (code === 'auth/network-request-failed') return 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง';
  return 'ดำเนินการไม่สำเร็จ กรุณาขอลิงก์ตั้งรหัสผ่านใหม่แล้วลองอีกครั้ง';
}

export function ResetPasswordActionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const mode = params.get('mode');
  const actionCode = params.get('oobCode');
  const [pageState, setPageState] = useState<PageState>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!auth || mode !== 'resetPassword' || !actionCode) {
      setPageState('invalid');
      return () => { active = false; };
    }

    verifyPasswordResetCode(auth, actionCode)
      .then((accountEmail) => {
        if (!active) return;
        setEmail(accountEmail);
        setPageState('ready');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(actionErrorMessage(cause));
        setPageState('invalid');
      });

    return () => { active = false; };
  }, [actionCode, mode]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || !actionCode || busy) return;
    setError('');
    if (password.length < 8) {
      setError('กรุณาตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }

    setBusy(true);
    try {
      await confirmPasswordReset(auth, actionCode, password);
      setPageState('complete');
      setPassword('');
      setConfirmPassword('');
    } catch (cause) {
      setError(actionErrorMessage(cause));
      if ((cause as { code?: string })?.code === 'auth/expired-action-code' || (cause as { code?: string })?.code === 'auth/invalid-action-code') {
        setPageState('invalid');
      }
    } finally {
      setBusy(false);
    }
  }

  const heading = pageState === 'complete'
    ? 'ตั้งรหัสผ่านใหม่แล้ว'
    : pageState === 'invalid'
      ? 'ลิงก์นี้ใช้ไม่ได้แล้ว'
      : 'ตั้งรหัสผ่านใหม่';

  return (
    <StorefrontShell contentClassName="reset-action-content">
      <div className="reset-action" aria-labelledby="reset-action-heading">
        <section className="reset-action-panel">
          <Link className="reset-action-brand" to="/" aria-label="SOULMATE หน้าแรก">
            <img src="/logo-soulmate.png" alt="SOULMATE Health & Beauty" />
          </Link>

          <div className={`reset-action-mark reset-action-mark--${pageState}`} aria-hidden="true">
            {pageState === 'complete' ? <CheckCircle2 /> : pageState === 'invalid' ? <ShieldAlert /> : <KeyRound />}
          </div>

          <h1 id="reset-action-heading">{heading}</h1>
          {pageState === 'checking' && <p className="reset-action-copy" role="status">กำลังตรวจสอบลิงก์…</p>}
          {pageState === 'ready' && (
            <>
              <p className="reset-action-copy">ตั้งรหัสผ่านใหม่สำหรับบัญชีนี้</p>
              <p className="reset-action-email">{email}</p>
              <form className="reset-action-form" onSubmit={submit}>
                <label>รหัสผ่านใหม่
                  <input autoComplete="new-password" minLength={8} onChange={(event) => setPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={password} />
                </label>
                <label>ยืนยันรหัสผ่านใหม่
                  <input autoComplete="new-password" minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type={showPassword ? 'text' : 'password'} value={confirmPassword} />
                </label>
                <label className="reset-action-show-password">
                  <input checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} type="checkbox" />
                  แสดงรหัสผ่าน
                </label>
                {error && <p className="reset-action-error" role="alert">{error}</p>}
                <button className="reset-action-submit" disabled={busy} type="submit">{busy ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}</button>
              </form>
            </>
          )}
          {pageState === 'invalid' && (
            <>
              <p className="reset-action-copy" role="alert">{error || 'ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง กรุณาขอลิงก์ใหม่'}</p>
              <Link className="reset-action-primary-link" to="/login">ขอลิงก์ใหม่</Link>
            </>
          )}
          {pageState === 'complete' && (
            <>
              <p className="reset-action-copy">รหัสผ่านของคุณถูกเปลี่ยนแล้ว เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย</p>
              <button className="reset-action-submit" onClick={() => navigate('/login', { replace: true })} type="button">ไปหน้าเข้าสู่ระบบ</button>
            </>
          )}
          <Link className="reset-action-back" to="/login"><ArrowLeft aria-hidden="true" size={16} /> กลับไปเข้าสู่ระบบ</Link>
        </section>
      </div>
    </StorefrontShell>
  );
}
