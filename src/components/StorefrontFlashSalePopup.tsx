import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCurrentFlashSale, type FlashSale } from '../services/flashSaleService';
import './admin-flash-sales.css';

export function StorefrontFlashSalePopup({ pathname }: { pathname: string }) {
  const [sale, setSale] = useState<FlashSale | null>(null);
  const [ready, setReady] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dismissed = useRef(false);

  useEffect(() => {
    if (pathname !== '/') { setReady(false); setSale(null); return; }
    let alive = true;
    void (async () => {
      try {
        const current = await getCurrentFlashSale();
        if (!alive || !current) return;
        try { if (localStorage.getItem(`soulmate-flash-sale-seen:${current.id}`)) return; } catch { /* Continue if storage is unavailable. */ }
        setSale(current);
      } catch (cause) { console.warn('[Flash Sale] Could not load current campaign', cause); }
      finally { if (alive) setReady(true); }
    })();
    return () => { alive = false; };
  }, [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (ready && sale && !dismissed.current && dialog && !dialog.open) dialog.showModal();
  }, [ready, sale]);

  const markSeen = () => {
    if (!sale) return;
    try { localStorage.setItem(`soulmate-flash-sale-seen:${sale.id}`, '1'); } catch { /* Keep dismissed for the current mount. */ }
    dismissed.current = true;
  };
  const close = () => { markSeen(); dialogRef.current?.close(); };
  if (!sale || !ready) return null;

  return <dialog ref={dialogRef} className="store-flash-dialog" aria-labelledby="store-flash-title" onClose={markSeen} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
    <button className="store-flash-close" type="button" aria-label="ปิดโปรโมชัน" onClick={close}><X size={20} /></button>
    <img className="store-flash-image" src={sale.imageUrl} alt="" />
    <div className="store-flash-content"><span className="store-flash-label">FLASH SALE</span><h2 id="store-flash-title">{sale.title}</h2>{sale.message && <p>{sale.message}</p>}<Link className="store-flash-cta" to={sale.linkUrl} onClick={markSeen}>เลือกซื้อเลย</Link></div>
  </dialog>;
}
