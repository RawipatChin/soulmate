import React from 'react';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main
      id="not-found-container"
      className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fcf9f8] text-[#1c1b1b] p-6 text-center"
    >
      <div
        id="not-found-icon-badge"
        className="w-16 h-16 rounded-full bg-[#a8e5cf]/40 flex items-center justify-center text-[#2d6857] mb-4 shadow-sm"
      >
        <span className="material-symbols-outlined text-[32px]">search_off</span>
      </div>
      <h1
        id="not-found-heading"
        className="text-xl font-bold text-[#1c1b1b] mb-2 font-['Plus_Jakarta_Sans',sans-serif]"
      >
        ไม่พบหน้าที่คุณต้องการ
      </h1>
      <p
        id="not-found-description"
        className="text-sm text-[#53615d] mb-6 max-w-xs font-['Inter',sans-serif] leading-relaxed"
      >
        หน้าที่คุณกำลังค้นหาอาจถูกย้าย หรือไม่มีอยู่ในระบบ SOULMATE
      </p>
      <button
        id="not-found-home-btn"
        type="button"
        onClick={() => navigate('/')}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2d6857] text-white font-medium text-sm hover:opacity-95 active:scale-95 transition-all shadow-sm"
      >
        <span className="material-symbols-outlined text-[18px]">home</span>
        <span>กลับหน้าแรก</span>
      </button>
    </main>
  );
};
