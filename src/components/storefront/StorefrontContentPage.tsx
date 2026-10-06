import React from 'react';
import { Link } from 'react-router-dom';
import { useParams } from 'react-router-dom';
import { StorefrontShell } from './StorefrontShell';

export type StorefrontContentPageProps = {
  title: string;
  lead: string;
  stateTitle: string;
  stateMessage: string;
  sections?: Array<{ title: string; message: string }>;
  links?: Array<{ label: string; to: string }>;
  showAccountNavigation?: boolean;
};

export function StorefrontContentPage({
  title,
  lead,
  stateTitle,
  stateMessage,
  sections = [],
  links = [],
  showAccountNavigation = false,
}: StorefrontContentPageProps) {
  return (
    <StorefrontShell>
      <article className="storefront-page">
        <h1>{title}</h1>
        <p className="storefront-page-lead">{lead}</p>
        {showAccountNavigation && (
          <nav aria-label="เมนูบัญชี" className="storefront-account-links">
            <Link to="/account">ภาพรวมบัญชี</Link>
            <Link to="/account/profile">โปรไฟล์</Link>
            <Link to="/account/orders">คำสั่งซื้อ</Link>
            <Link to="/account/addresses">ที่อยู่</Link>
            <Link to="/account/wishlist">รายการที่ชื่นชอบ</Link>
          </nav>
        )}
        {sections.length > 0 ? (
          <div className="storefront-section-grid">
            {sections.map((section) => (
              <section className="storefront-state-panel" key={section.title}>
                <h2>{section.title}</h2>
                <p>{section.message}</p>
              </section>
            ))}
          </div>
        ) : (
          <section aria-labelledby="storefront-page-state-title" className="storefront-state-panel">
            <h2 id="storefront-page-state-title">{stateTitle}</h2>
            <p>{stateMessage}</p>
          </section>
        )}
        {links.length > 0 && (
          <nav aria-label="ไปต่อ" className="storefront-page-links">
            {links.map((link) => (
              <Link className="storefront-page-link" key={`${link.to}:${link.label}`} to={link.to}>
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </article>
    </StorefrontShell>
  );
}

export const userFacingPages = {
  about: {
    title: 'เกี่ยวกับเรา',
    lead: 'ทำความรู้จักกับ SOULMATE Health & Beauty',
    stateTitle: 'กำลังเตรียมข้อมูลเกี่ยวกับแบรนด์',
    stateMessage: 'ข้อมูลเรื่องราว วิสัยทัศน์ พันธกิจ และทีมงานจะเผยแพร่เมื่อได้รับการยืนยันจากร้าน',
    sections: [
      { title: 'เรื่องราวของเรา', message: 'กำลังเตรียมเรื่องราวแบรนด์ที่ได้รับการยืนยันจาก SOULMATE' },
      { title: 'วิสัยทัศน์และพันธกิจ', message: 'ข้อมูลจะเผยแพร่เมื่อร้านยืนยันเนื้อหาแล้ว' },
      { title: 'ทีมงาน', message: 'รายชื่อและข้อมูลทีมงานยังไม่มีเอกสารยืนยันสำหรับเผยแพร่' },
    ],
    links: [{ label: 'เลือกดูสินค้า', to: '/products' }, { label: 'ติดต่อเรา', to: '/contact' }],
  },
  articles: {
    title: 'บทความ',
    lead: 'รวมบทความและเนื้อหาจาก SOULMATE',
    stateTitle: 'ยังไม่มีบทความ',
    stateMessage: 'บทความจะแสดงที่นี่เมื่อมีเนื้อหาที่ตรวจสอบแล้ว',
    links: [{ label: 'กลับหน้าแรก', to: '/' }, { label: 'เลือกดูสินค้า', to: '/products' }],
  },
  community: {
    title: 'ชุมชน',
    lead: 'พื้นที่พูดคุย แบ่งปันประสบการณ์ และติดตามกิจกรรม',
    stateTitle: 'ชุมชนยังไม่เปิดให้ใช้งาน',
    stateMessage: 'กระทู้ การแบ่งปันประสบการณ์ กิจกรรม และกฎชุมชนจะแสดงเมื่อระบบพร้อม',
    sections: [
      { title: 'กระทู้และพูดคุย', message: 'พื้นที่กระทู้จะเปิดเมื่อระบบชุมชนพร้อมใช้งาน' },
      { title: 'แบ่งปันประสบการณ์', message: 'การแบ่งปันประสบการณ์ยังไม่เปิดให้ส่งข้อมูล' },
      { title: 'กิจกรรมและอีเวนต์', message: 'กิจกรรมจะแสดงเมื่อมีรายการที่ยืนยันแล้ว' },
      { title: 'กฎชุมชน', message: 'กฎชุมชนจะแสดงก่อนเปิดให้สมาชิกมีส่วนร่วม' },
    ],
    links: [{ label: 'อ่านบทความ', to: '/articles' }, { label: 'ติดต่อเรา', to: '/contact' }],
  },
  contact: {
    title: 'ติดต่อเรา',
    lead: 'เลือกช่องทางติดต่อ SOULMATE',
    stateTitle: 'กำลังเตรียมช่องทางติดต่อ',
    stateMessage: 'ช่องทางติดต่อ ที่อยู่ คำถามที่พบบ่อย และแบบฟอร์มจะแสดงเมื่อร้านยืนยันข้อมูลและปลายทางรับเรื่องแล้ว',
    sections: [
      { title: 'ช่องทางติดต่อ', message: 'ร้านยังไม่ได้ยืนยันช่องทางติดต่อสำหรับหน้านี้' },
      { title: 'ที่อยู่บริษัท', message: 'ที่อยู่จะแสดงเมื่อร้านยืนยันข้อมูลแล้ว' },
      { title: 'คำถามที่พบบ่อย', message: 'FAQ จะแสดงเมื่อมีคำตอบที่ตรวจสอบแล้ว' },
      { title: 'แบบฟอร์มติดต่อ', message: 'แบบฟอร์มจะเปิดเมื่อมีบริการรับเรื่องและจัดเก็บข้อมูลพร้อมใช้งาน' },
    ],
    links: [{ label: 'กลับหน้าแรก', to: '/' }],
  },
  addresses: {
    title: 'ที่อยู่ของฉัน',
    showAccountNavigation: true,
    lead: 'จัดการที่อยู่สำหรับการจัดส่งสินค้า',
    stateTitle: 'ยังไม่มีข้อมูลที่อยู่',
    stateMessage: 'ระบบจัดการที่อยู่ยังไม่พร้อมใช้งาน ข้อมูลที่อยู่จะปรากฏเมื่อเชื่อมต่อบริการแล้ว',
    links: [{ label: 'กลับไปบัญชีของฉัน', to: '/account' }],
  },
  wishlist: {
    title: 'รายการที่ชื่นชอบ',
    showAccountNavigation: true,
    lead: 'กลับมาดูสินค้าที่บันทึกไว้',
    stateTitle: 'รายการที่ชื่นชอบยังไม่พร้อม',
    stateMessage: 'ระบบบันทึกรายการที่ชื่นชอบยังไม่พร้อมใช้งาน จึงยังไม่มีสินค้าแสดงในรายการนี้',
    links: [{ label: 'เลือกดูสินค้า', to: '/products' }, { label: 'กลับไปบัญชีของฉัน', to: '/account' }],
  },
  privacy: {
    title: 'นโยบายความเป็นส่วนตัว',
    lead: 'ข้อมูลเกี่ยวกับการจัดเก็บและใช้ข้อมูลส่วนบุคคล',
    stateTitle: 'กำลังเตรียมนโยบาย',
    stateMessage: 'นโยบายจะแสดงที่นี่เมื่อมีเอกสารฉบับที่ร้านอนุมัติแล้ว',
    links: [{ label: 'ข้อกำหนดการใช้งาน', to: '/terms' }, { label: 'กลับหน้าแรก', to: '/' }],
  },
  terms: {
    title: 'ข้อกำหนดการใช้งาน',
    lead: 'ข้อกำหนดสำหรับการใช้เว็บไซต์ SOULMATE',
    stateTitle: 'กำลังเตรียมข้อกำหนด',
    stateMessage: 'ข้อกำหนดจะแสดงที่นี่เมื่อมีเอกสารฉบับที่ร้านอนุมัติแล้ว',
    links: [{ label: 'นโยบายความเป็นส่วนตัว', to: '/privacy' }, { label: 'กลับหน้าแรก', to: '/' }],
  },
  comingSoon: {
    title: 'หน้านี้กำลังพัฒนา',
    lead: 'เรากำลังเตรียมหน้านี้ให้พร้อมใช้งาน',
    stateTitle: 'ยังไม่มีเนื้อหาสำหรับแสดง',
    stateMessage: 'โปรดกลับมาดูอีกครั้งภายหลัง หรือเลือกไปยังส่วนอื่นของร้าน',
    links: [{ label: 'กลับหน้าแรก', to: '/' }, { label: 'เลือกดูสินค้า', to: '/products' }],
  },
  maintenance: {
    title: 'กำลังปรับปรุงระบบ',
    lead: 'หน้านี้ยังไม่พร้อมให้บริการในขณะนี้',
    stateTitle: 'โปรดลองอีกครั้งภายหลัง',
    stateMessage: 'คุณยังสามารถกลับไปหน้าแรกหรือเลือกดูสินค้าได้',
    links: [{ label: 'กลับหน้าแรก', to: '/' }, { label: 'เลือกดูสินค้า', to: '/products' }],
  },
  notFound: {
    title: 'ไม่พบหน้าที่ต้องการ',
    lead: 'ลิงก์นี้อาจไม่ถูกต้องหรือหน้านี้อาจถูกย้ายแล้ว',
    stateTitle: 'ไปต่อได้จากที่นี่',
    stateMessage: 'กลับไปหน้าแรกหรือค้นหาสินค้าที่ต้องการ',
    links: [{ label: 'กลับหน้าแรก', to: '/' }, { label: 'ค้นหาสินค้า', to: '/products' }],
  },
} satisfies Record<string, StorefrontContentPageProps>;

export function StorefrontArticlePage() {
  const { articleId } = useParams();
  const page = userFacingPages.articles;
  return (
    <StorefrontContentPage
      {...page}
      title={articleId ? 'ไม่พบบทความ' : page.title}
      stateTitle={articleId ? 'ยังไม่มีบทความนี้' : page.stateTitle}
      stateMessage={articleId
        ? 'บทความนี้ไม่มีในรายการที่เผยแพร่แล้ว หรือยังไม่ได้เผยแพร่'
        : page.stateMessage}
      links={articleId
        ? [{ label: 'กลับไปหน้าบทความ', to: '/articles' }]
        : page.links}
    />
  );
}
