import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * AdminProtectedRoute
 *
 * STEP 20 Architecture:
 * - Prepares the authorization gate for administrative routes.
 * - Enforces authentication and leaves a clear hook for Firestore Role verification.
 * - STEP 21 INTEGRATION POINT:
 *   Query Firestore `users/{uid}` or `admins/{uid}` to verify `role === 'admin' || role === 'super_admin'`.
 * - For now, normal authenticated customers are NOT authorized as administrators.
 */
export const AdminProtectedRoute: React.FC<{
  children: React.ReactNode;
  requiredRole?: 'super_admin' | 'admin';
}> = ({ children, requiredRole }) => {
  const { user, customerProfile, loading, profileLoading } = useAuth();
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
    !!user &&
    (role === 'admin' || role === 'super_admin') &&
    (!requiredRole || requiredRole === 'admin' || role === 'super_admin');

  if (!isAuthorizedAdmin) {
    return (
      <Navigate
        to="/admin/login"
        state={{
          from: location.pathname,
          reason: !user
            ? 'กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ'
            : 'บัญชีนี้ไม่มีสิทธิ์เข้าถึงส่วนงานผู้ดูแลระบบ',
        }}
        replace
      />
    );
  }

  return <>{children}</>;
};
