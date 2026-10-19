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
    let positionFrame = 0;
    let positionAttempts = 0;
    let widgetObserver: MutationObserver | null = null;
    const widget = document.createElement('chat-widget-embed');
    widget.id = widgetElementId;
    // The storefront is rendered in an iframe. Keep the vendor widget above
    // that frame so its launcher can receive pointer events in the parent page.
    Object.assign(widget.style, {
      position: 'fixed',
      right: '0',
      bottom: '0',
      width: '0',
      height: '0',
      overflow: 'visible',
      zIndex: '1000',
      pointerEvents: 'auto',
    });
    widget.setAttribute('api-key', apiKey);
    widget.setAttribute('initial-message', welcomeMessage);
    document.body.append(widget);

    // The vendor positions its launcher inside an open shadow root, so the
    // host's bottom offset does not move the visible button. Adjust the actual
    // launcher container after the custom element has initialized.
    const applyWidgetPosition = () => {
      const shadow = widget.shadowRoot;
      const container = shadow?.querySelector<HTMLElement>('#chat-widget-container');
      if (!container) return false;
      const mobile = window.matchMedia('(max-width: 768px)').matches;
      container.style.setProperty(
        'bottom',
        mobile ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : '20px',
        'important'
      );
      applyWidgetBranding(shadow!, container);
      return true;
    };
    const positionWidgetWhenReady = () => {
      if (disposed || applyWidgetPosition() || positionAttempts++ >= 120) return;
      positionFrame = window.requestAnimationFrame(positionWidgetWhenReady);
    };
    const scheduleWidgetPosition = () => {
      positionAttempts = 0;
      window.cancelAnimationFrame(positionFrame);
      positionFrame = window.requestAnimationFrame(positionWidgetWhenReady);
      if (!widgetObserver && widget.shadowRoot) {
        widgetObserver = new MutationObserver(() => {
          const container = widget.shadowRoot?.querySelector<HTMLElement>('#chat-widget-container');
          if (container) applyWidgetBranding(widget.shadowRoot!, container);
        });
        widgetObserver.observe(widget.shadowRoot, { childList: true, subtree: true });
      }
    };
    window.addEventListener('resize', applyWidgetPosition);

    let script = document.getElementById(widgetScriptId) as HTMLScriptElement | null;
    const isRegistered = () => Boolean(window.customElements?.get('chat-widget-embed'));
    const showLoadError = () => {
      script?.setAttribute('data-error', 'true');
      if (!disposed) setLoadError('แชตช่วยเลือกสินค้าโหลดไม่สำเร็จ กรุณารีเฟรชหน้า');
    };
    const onScriptLoad = () => {
      script?.setAttribute('data-loaded', 'true');
      if (!isRegistered()) showLoadError();
      else scheduleWidgetPosition();
    };
    const onScriptError = () => showLoadError();

    if (isRegistered()) {
      setLoadError('');
      scheduleWidgetPosition();
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
      window.cancelAnimationFrame(positionFrame);
      window.removeEventListener('resize', applyWidgetPosition);
      widgetObserver?.disconnect();
      script?.removeEventListener('load', onScriptLoad);
      script?.removeEventListener('error', onScriptError);
      widget.remove();
    };
  }, []);

  if (!loadError) return null;
  return <p className="kku-chat-fallback" role="status" aria-live="polite">{loadError}</p>;
}

function applyWidgetBranding(shadow: ShadowRoot, container: HTMLElement) {
  if (!shadow.querySelector('[data-soulmate-chat-theme]')) {
    const theme = document.createElement('style');
    theme.dataset.soulmateChatTheme = 'true';
    theme.textContent = `
      #chat-bubble {
        width: 76px !important;
        height: 76px !important;
        border-radius: 50% !important;
        background: #fffaf1 !important;
        background-image: none !important;
        box-shadow: 0 6px 22px rgb(83 52 25 / 22%) !important;
        border: 1px solid #f1d9a9 !important;
        overflow: visible !important;
      }
      #chat-bubble .widget__icon { display: none !important; }
      #chat-bubble::after {
        content: '•••';
        position: absolute;
        top: -3px;
        right: -5px;
        display: grid;
        place-items: center;
        width: 27px;
        height: 21px;
        border: 2px solid #fffaf1;
        border-radius: 9px 9px 9px 3px;
        background: #c99438;
        box-shadow: 0 2px 6px rgb(83 52 25 / 24%);
        color: #fff;
        font: 700 10px/1 Arial, sans-serif;
        letter-spacing: 1px;
        pointer-events: none;
      }
      #chat-popup {
        border-radius: 20px !important;
        border: 1px solid #f0dfc2 !important;
        box-shadow: 0 16px 48px rgb(61 42 22 / 20%) !important;
        background: #fffdf8 !important;
      }
      #chat-header {
        background: #fffaf1 !important;
        background-image: none !important;
        color: #583c20 !important;
        border-bottom: 1px solid #f0e4d0 !important;
      }
      #chat-header button { color: #583c20 !important; }
      #chat-messages { background: #fffdf9 !important; }
      #chat-input-container { background: #fffaf1 !important; }
      #chat-submit { background: #c99438 !important; }
      .soulmate-heart-mascot {
        width: 68px;
        height: 68px;
        object-fit: contain;
        pointer-events: none;
        filter: drop-shadow(0 3px 4px rgb(93 54 23 / 18%));
      }
      .soulmate-chat-avatar {
        width: 38px;
        height: 38px;
        object-fit: contain;
        margin-right: 6px;
      }
    `;
    shadow.append(theme);
  }

  const bubble = shadow.querySelector<HTMLElement>('#chat-bubble');
  if (bubble && !bubble.querySelector('.soulmate-heart-mascot')) {
    const mascot = document.createElement('img');
    mascot.className = 'soulmate-heart-mascot';
    mascot.src = '/heart-mascot.png';
    mascot.alt = '';
    bubble.append(mascot);
    bubble.setAttribute('role', 'button');
    bubble.setAttribute('tabindex', '0');
    bubble.setAttribute('aria-label', 'คุยกับแชตบอตผู้ช่วย SOULMATE');
    bubble.setAttribute('title', 'คุยกับผู้ช่วย SOULMATE');
    if (bubble.dataset.soulmateKeyboard !== 'true') {
      bubble.dataset.soulmateKeyboard = 'true';
      bubble.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          bubble.click();
        }
      });
    }
  }

  const title = shadow.querySelector<HTMLElement>('#chat-header h5');
  if (title && !title.querySelector('.soulmate-chat-avatar')) {
    const avatar = document.createElement('img');
    avatar.className = 'soulmate-chat-avatar';
    avatar.src = '/heart-mascot.png';
    avatar.alt = '';
    title.prepend(avatar);
    const name = title.querySelector('span');
    if (name) name.textContent = 'ผู้ช่วย SOULMATE';
  }

  const input = shadow.querySelector<HTMLInputElement>('#chat-input');
  if (input && input.placeholder === 'Type your message...') input.placeholder = 'พิมพ์คำถามของคุณ…';
  container.setAttribute('aria-label', 'แชตผู้ช่วย SOULMATE');
}
