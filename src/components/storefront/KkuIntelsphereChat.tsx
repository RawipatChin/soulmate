import { useEffect, useState } from 'react';
import './kku-intelsphere-chat.css';

const widgetScriptUrl = 'https://gen.ai.kku.ac.th/widget/chat-widget.es.js';
const widgetScriptId = 'kku-intelsphere-chat-widget-script';
const widgetElementId = 'kku-intelsphere-chat-widget';
const welcomeMessage = 'สวัสดีค่ะ อยากสอบถามหรือให้ช่วยเลือกสินค้า SOULMATE ด้านไหนคะ?';

export function KkuIntelsphereChat() {
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const apiKey = import.meta.env.VITE_KKU_INTELSPHERE_API_KEY?.trim();
    if (!apiKey) {
      setLoadError('แชตช่วยเลือกสินค้ายังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง');
      return;
    }

    let disposed = false;
    const widget = document.createElement('chat-widget-embed');
    widget.id = widgetElementId;
    // The storefront is rendered in an iframe. Keep the vendor widget above
    // that frame so its launcher can receive pointer events in the parent page.
    Object.assign(widget.style, {
      position: 'fixed',
      right: '0',
      // Clear the fixed bottom navigation on phones and anchor the launcher
      // close to the viewport edge on desktop.
      bottom: window.matchMedia('(max-width: 768px)').matches ? '72px' : '24px',
      width: '0',
      height: '0',
      overflow: 'visible',
      zIndex: '1000',
      pointerEvents: 'auto',
    });
    widget.setAttribute('api-key', apiKey);
    widget.setAttribute('initial-message', welcomeMessage);
    document.body.append(widget);

    let script = document.getElementById(widgetScriptId) as HTMLScriptElement | null;
    const isRegistered = () => Boolean(window.customElements?.get('chat-widget-embed'));
    const showLoadError = () => {
      script?.setAttribute('data-error', 'true');
      if (!disposed) setLoadError('แชตช่วยเลือกสินค้าโหลดไม่สำเร็จ กรุณารีเฟรชหน้า');
    };
    const onScriptLoad = () => {
      script?.setAttribute('data-loaded', 'true');
      if (!isRegistered()) showLoadError();
    };
    const onScriptError = () => showLoadError();

    if (isRegistered()) {
      setLoadError('');
    } else if (!script) {
      script = document.createElement('script');
      script.id = widgetScriptId;
      script.type = 'module';
      script.src = widgetScriptUrl;
      script.defer = true;
      script.addEventListener('load', onScriptLoad, { once: true });
      script.addEventListener('error', onScriptError, { once: true });
      document.head.append(script);
    } else if (script.dataset.error === 'true' || script.dataset.loaded === 'true') {
      showLoadError();
    } else {
      script.addEventListener('load', onScriptLoad, { once: true });
      script.addEventListener('error', onScriptError, { once: true });
    }

    return () => {
      disposed = true;
      script?.removeEventListener('load', onScriptLoad);
      script?.removeEventListener('error', onScriptError);
      widget.remove();
    };
  }, []);

  if (!loadError) return null;
  return <p className="kku-chat-fallback" role="status" aria-live="polite">{loadError}</p>;
}
