import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccessAdmin } from '../utils/accountAccess';

export const AdminProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'admin';
}> = ({ children, requiredRole }) => {
  const { user, customerProfile, loading, profileLoading, profileError, refreshCustomerProfile } = useAuth();
  const location = useLocation();

  if (loading || (user && profileLoading)) {
    return (
      <div className="w-full h-screen bg-[#fcf9f8] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#2d6857]/20 border-t-[#2d6857] rounded-full animate-spin mb-4" />
        <p className="font-body-md text-sm text-gray-700 font-medium tracking-wide">
          กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ...
        </p>
      </div>
    );
  }

  const role = customerProfile?.role || '';
  const isAuthorizedAdmin =
    canAccessAdmin(customerProfile) &&
    (!requiredRole || requiredRole === 'admin' || role === 'super_admin');

  if (!user) {
    return (
      <Navigate
        to="/admin/login"
        state={{
          from: location.pathname,
          reason: 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ',
        }}
        replace
      />
    );
  }

  if (!isAuthorizedAdmin) {
    return <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-[#fcf9f8] text-[#132e27]">
      <h1 className="text-2xl font-bold">ไม่มีสิทธิ์เข้าหลังบ้าน</h1>
      <p>{customerProfile?.status === 'suspended' ? 'บัญชีนี้ถูกระงับการใช้งาน' : profileError || 'บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ'}</p>
      {!customerProfile && <button className="rounded-xl bg-[#2d6857] px-5 py-3 text-white" onClick={() => void refreshCustomerProfile()} type="button">ลองตรวจสิทธิ์อีกครั้ง</button>}
      <a className="font-semibold text-[#2d6857] underline" href="/">กลับหน้าร้าน</a>
    </main>;
  }

  return <>{children}</>;
};
