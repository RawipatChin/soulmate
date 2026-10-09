import { askProductGuidance, type GuidanceResponse, type GuidanceTurn } from '../../services/guidanceService';
import styles from './guidance-panel.css?raw';

type Message = GuidanceTurn & { products?: GuidanceResponse['products']; unavailable?: GuidanceResponse['unavailable'] };
// This state is deliberately not serialized to storage or sent to analytics.
const conversation: Message[] = [];
const fieldNames: Record<string, string> = {
  description: 'รายละเอียด', shortDescription: 'คำอธิบาย', highlights: 'จุดเด่น', ingredients: 'ส่วนผสม', usageInstructions: 'วิธีใช้',
};

export function mountGuidancePanel(panel: HTMLElement, send = askProductGuidance): () => void {
  const doc = panel.ownerDocument;
  if (!doc.getElementById('guidance-interaction-styles')) {
    const style = doc.createElement('style');
    style.id = 'guidance-interaction-styles'; style.textContent = styles; doc.head.append(style);
  }
  panel.innerHTML = `
    <h2 id="soulmate-guidance-heading">ให้ SOULMATE ช่วยเลือกสินค้า</h2>
    <p class="guidance-intro">ถามและเปรียบเทียบสินค้าจากข้อมูลที่ร้านระบุไว้</p>
    <div class="guidance-transcript" role="log" aria-label="บทสนทนาเกี่ยวกับสินค้า" tabindex="0"></div>
    <form class="guidance-form">
      <label for="soulmate-guidance-question">อยากให้ช่วยเลือกอะไร?</label>
      <textarea id="soulmate-guidance-question" maxlength="2000" rows="3" placeholder="เช่น อยากเพิ่มโปรตีน งบไม่เกิน 800 บาท" required></textarea>
      <div class="guidance-actions"><button type="submit">ส่งคำถาม</button><button class="guidance-reset" type="button">เริ่มใหม่</button></div>
    </form>
    <div class="guidance-status" role="status" aria-live="polite"></div>
    <button class="guidance-retry" type="button" hidden>ลองส่งอีกครั้ง</button>
    <small>ผู้ช่วยนี้ใช้ AI อ้างอิงข้อมูลสินค้า ไม่วินิจฉัยหรือแนะนำการรักษาอาการ</small>`;
  const transcript = panel.querySelector<HTMLElement>('.guidance-transcript')!;
  const form = panel.querySelector<HTMLFormElement>('form')!;
  const input = panel.querySelector<HTMLTextAreaElement>('textarea')!;
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]')!;
  const reset = panel.querySelector<HTMLButtonElement>('.guidance-reset')!;
  const retry = panel.querySelector<HTMLButtonElement>('.guidance-retry')!;
  const status = panel.querySelector<HTMLElement>('.guidance-status')!;
  let pending = '', busy = false, version = 0, disposed = false;
  const node = (tag: string, text: string, className = '') => {
    const element = doc.createElement(tag); element.textContent = text; element.className = className; return element;
  };
  function render() {
    transcript.replaceChildren();
    const messages = pending ? [...conversation, { role: 'user' as const, text: pending }] : conversation;
    for (const item of messages) {
      const row = node('div', '', 'guidance-message');
      row.append(node('strong', item.role === 'user' ? 'คุณ' : 'SOULMATE'), node('div', item.text, 'guidance-message-text'));
      function renderProduct(product: NonNullable<Message['products']>[number]) {
        const card = node('article', '', 'guidance-product');
        if (product.imageUrl && /^https:\/\//i.test(product.imageUrl)) {
          const image = doc.createElement('img'); image.src = product.imageUrl; image.alt = product.name; image.loading = 'lazy';
          image.addEventListener('error', () => image.remove(), { once: true }); card.append(image);
        }
        const details = node('div', '', 'guidance-product-details');
        details.append(node('h3', product.name));
        if (product.variantName) details.append(node('div', product.variantName));
        details.append(node('div', `฿${product.price.toLocaleString('th-TH')} · มีสินค้า`, 'guidance-price'));
        for (const source of product.evidence) {
          details.append(node('div', `${fieldNames[source.field] ?? 'ข้อมูลสินค้า'}: ${source.quote}`, 'guidance-evidence'));
        }
        const link = doc.createElement('a');
        if (/^\/products\/[^/?#]+$/.test(product.href)) {
          link.href = product.href; link.dataset.route = product.href;
          link.textContent = 'ดูรายละเอียดสินค้า'; details.append(link);
        }
        card.append(details); row.append(card);
      }
      if ('products' in item) {
        for (const product of item.products ?? []) renderProduct(product);
        if (item.unavailable?.length) {
          row.append(node('h3', 'ตัวเลือกที่ใกล้เคียงแต่หมดสต็อก', 'guidance-unavailable-heading'));
          for (const product of item.unavailable) {
            const card = node('article', '', 'guidance-product guidance-product-unavailable');
            card.append(node('h3', product.name));
            card.append(node('div', 'สินค้าหมด — สำหรับเปรียบเทียบเท่านั้น', 'guidance-price'));
            for (const source of product.evidence) card.append(node('div', `${fieldNames[source.field] ?? 'ข้อมูลสินค้า'}: ${source.quote}`, 'guidance-evidence'));
            const link = doc.createElement('a');
            if (/^\/products\/[^/?#]+$/.test(product.href)) { link.href = product.href; link.dataset.route = product.href; link.textContent = 'ดูรายละเอียดสินค้า'; card.append(link); }
            row.append(card);
          }
        }
      }
      transcript.append(row);
    }
    transcript.hidden = !messages.length;
    transcript.scrollTop = transcript.scrollHeight;
  }
  async function ask(question: string) {
    if (busy || !question.trim() || question.length > 2000) return;
    const current = ++version;
    busy = true; pending = question.trim(); submit.disabled = true; input.disabled = true;
    retry.hidden = true; status.textContent = 'กำลังอ่านข้อมูลสินค้าและเตรียมคำตอบ…'; panel.setAttribute('aria-busy', 'true'); render();
    try {
      // Include visible evidence and product names for follow-up comparisons.
      const history = conversation.slice(-10).map(m => ({ role: m.role, text: [m.text, ...(m.products ?? []), ...(m.unavailable ?? [])].map(p => typeof p === 'string' ? p : `${p.name} ${p.variantName}: ${p.evidence.map(e => e.quote).join(' / ')}`).join('\n').slice(0, 2000) }));
      const answer = await send(pending, history);
      if (disposed || current !== version) return;
      conversation.push({ role: 'user', text: pending }, { role: 'assistant', text: answer.message, products: answer.products, unavailable: answer.unavailable });
      if (conversation.length > 20) conversation.splice(0, conversation.length - 20);
      pending = ''; input.value = ''; status.textContent = ''; render();
    } catch (error) {
      if (disposed || current !== version) return;
      status.textContent = error instanceof Error ? error.message : 'ส่งคำถามไม่ได้ กรุณาลองใหม่'; retry.hidden = false;
    } finally {
      if (!disposed && current === version) { busy = false; submit.disabled = false; input.disabled = false; panel.setAttribute('aria-busy', 'false'); }
    }
  }
  const onSubmit = (event: Event) => { event.preventDefault(); void ask(input.value); };
  const onRetry = () => { void ask(pending); };
  const onReset = () => {
    version++; busy = false; pending = ''; conversation.length = 0; input.value = ''; input.disabled = false; submit.disabled = false;
    retry.hidden = true; status.textContent = ''; panel.setAttribute('aria-busy', 'false'); render(); input.focus();
  };
  form.addEventListener('submit', onSubmit); retry.addEventListener('click', onRetry); reset.addEventListener('click', onReset);
  render();
  return () => { disposed = true; version++; form.removeEventListener('submit', onSubmit); retry.removeEventListener('click', onRetry); reset.removeEventListener('click', onReset); };
}
