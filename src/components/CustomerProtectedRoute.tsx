import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasActiveAccount } from '../utils/accountAccess';

export const CustomerProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, customerProfile, loading, profileLoading, profileError, refreshCustomerProfile } = useAuth();
  const location = useLocation();

  if (loading || (user && profileLoading)) {
    return (
      <div className="w-full min-h-screen bg-[#fcf9f8] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#ca5a9a]/20 border-t-[#ca5a9a] rounded-full animate-spin mb-4" />
        <p className="font-body-md text-sm text-gray-600 font-medium tracking-wide">
          กำลังตรวจสอบสถานะการเข้าสู่ระบบ...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!hasActiveAccount(customerProfile)) {
    return <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-[#fcf9f8] text-[#132e27]">
      <h1 className="text-2xl font-bold">ไม่สามารถเปิดข้อมูลบัญชีได้</h1>
      <p>{customerProfile?.status === 'suspended' ? 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อร้าน' : profileError || 'ไม่พบข้อมูลบัญชี กรุณาลองโหลดใหม่'}</p>
      <button className="rounded-xl bg-[#2d6857] px-5 py-3 text-white" onClick={() => void refreshCustomerProfile()} type="button">ลองอีกครั้ง</button>
    </main>;
  }

  return <>{children}</>;
};
