export const FACT_FIELDS = ['description', 'shortDescription', 'highlights', 'ingredients', 'usageInstructions'] as const;
export type FactField = typeof FACT_FIELDS[number];
export type Turn = { role: 'user' | 'assistant'; text: string };
export type CatalogRecord = { id: string; data: Record<string, any> };
export type GuidanceProduct = {
  id: string; name: string; slug: string; imageUrl: string | null;
  facts: Record<FactField, string>;
  options: { id: string | null; name: string; price: number; stock: number }[];
};
export type Evidence = { field: FactField; quote: string };
export type GuidanceCard = {
  productId: string; variantId: string | null; name: string; variantName: string;
  price: number; available: boolean; href: string; imageUrl: string | null; evidence: Evidence[];
};
export type GuidanceResponse = { kind: string; message: string; products: GuidanceCard[]; unavailable: GuidanceCard[] };

export function plainText(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|nbsp|amp|lt|gt|quot|apos);/gi, (entity, code: string) => {
      const named: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
      if (code[0] !== '#') return named[code.toLowerCase()] ?? entity;
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ' ';
    }).replace(/\s+/g, ' ').trim();
}

// Conservative additional filter, not a substitute for medical evaluation.
export function unsafeClaim(text: string): boolean {
  return /รักษา|บำบัด|บรรเทา|หายขาด|ป้องกันโรค|วินิจฉัย|ไม่มีผลข้างเคียง|ปลอดภัย|อาการ|ไมเกรน|ความดัน|สมาธิสั้น|หัวใจเต้น|อ่อนโยนต่อ|ดีต่อสุขภาพ|ปราศจาก(?:สารก่อภูมิแพ้|ถั่ว|นม|กลูเตน)|ไม่มีสารก่อภูมิแพ้|คุมหิว|ลดบวม|เผาผลาญ|ลดน้ำหนัก|วิตกกังวล|ความเครียดสะสม|นอนหลับยาก|บำรุง(?:สุขภาพ|หัวใจ|สมอง|ผิว)|diagnos|\bcure\b|\btreat(?:s|ment)?\b|prevent.{0,20}disease|no side effects|allergen.free|risk.free/i.test(text);
}

export function symptomRequest(text: string): boolean {
  return /(?:ฉัน|ผม|หนู|เรา|ตอนนี้|มี)?(?:เจ็บหน้าอก|หายใจไม่ออก|ปวดท้อง|เวียนหัว|เหนื่อยง่าย|ใจสั่น|ปวดหัว|เป็นโรค|โรคประจำตัว)|รักษาโรค|แก้อาการ|แพ้ยา|ตั้งครรภ์|กินยาประจำ|chest pain|shortness of breath/i.test(text);
}

function safeProductName(value: unknown, id: string): string {
  const name = plainText(value);
  if (/ignore.{0,30}(instructions|rules)|system prompt|ลืมคำสั่ง|ละเลย.{0,20}คำสั่ง/i.test(name)) return `สินค้า ${id.slice(0, 8)}`;
  const claim = /(?:รักษา|บรรเทา|หายขาด|ป้องกัน|ลด(?:น้ำหนัก|หิว|บวม|ความดัน|คอเลสเตอรอล)|คุมหิว|เผาผลาญ|เสริมการนอนหลับ|ไมเกรน|สมาธิสั้น|ดีต่อสุขภาพ|อ่อนโยนต่อ|ที่ดีที่สุด|\b(?:cure|treat|prevent)\b)/i;
  const match = claim.exec(name);
  const safe = (match ? name.slice(0, match.index) : name).replace(/[|•\s—-]+$/g, '').trim();
  return safe || `สินค้า ${id.slice(0, 8)}`;
}

export function safeMessage(kind: string, question = 'goal'): GuidanceResponse {
  const questions: Record<string, string> = {
    goal: 'ต้องการเลือกสินค้าประเภทไหน หรือมีเป้าหมายในการเลือกสินค้าอย่างไรครับ?',
    budget: 'มีงบประมาณสำหรับสินค้าประมาณเท่าไรครับ?',
    preference: 'มีส่วนผสม รสชาติ หรือขนาดที่ต้องการหรืออยากหลีกเลี่ยงไหมครับ?',
    product: 'ต้องการเปรียบเทียบสินค้าตัวไหนบ้างครับ?',
  };
  const messages: Record<string, string> = {
    recommend: 'ลองเปรียบเทียบสินค้าต่อไปนี้จากข้อมูลที่ร้านระบุไว้ครับ',
    clarify: questions[question] ?? questions.goal,
    no_match: 'ไม่พบสินค้าที่ตรงกับเงื่อนไขทั้งหมดในข้อมูลที่มีครับ ต้องการปรับงบประมาณหรือเงื่อนไขข้อไหนไหมครับ?',
    insufficient_data: 'ข้อมูลสินค้าที่ร้านระบุไว้ยังไม่เพียงพอสำหรับคำถามนี้ จึงยังยืนยันหรือเปรียบเทียบในประเด็นนี้ไม่ได้ครับ',
    symptom: 'ยังเลือกสินค้าเพื่อรักษาหรือบรรเทาอาการจากข้อความนี้ไม่ได้ครับ ควรปรึกษาแพทย์หรือเภสัชกรเกี่ยวกับอาการ หากต้องการเปรียบเทียบข้อมูลสินค้าทั่วไป ระบุชื่อสินค้าหรือเป้าหมายที่ต้องการได้ครับ',
    out_of_scope: 'ผู้ช่วยนี้ตอบจากข้อมูลสินค้าในร้านครับ ยังไม่มีข้อมูลยืนยันสำหรับเรื่องที่ถาม',
    changed: 'ข้อมูลสินค้าหรือความพร้อมขายเปลี่ยนระหว่างตอบ กรุณาส่งคำถามอีกครั้งเพื่อดูข้อมูลล่าสุดครับ',
  };
  const selected = kind in messages ? kind : 'insufficient_data';
  return { kind: selected, message: messages[selected], products: [], unavailable: [] };
}

function price(regularValue: unknown, specialValue: unknown): number | null {
  if (regularValue === null || regularValue === undefined || regularValue === '') return null;
  const regular = Number(regularValue), special = Number(specialValue);
  if (!Number.isFinite(regular) || regular <= 0) return null;
  return special > 0 && special < regular ? special : regular;
}

export function makeCatalog(records: CatalogRecord[]): GuidanceProduct[] {
  return records.flatMap(({ id, data: d }) => {
    if (d.status !== 'active') return [];
    const facts = Object.fromEntries(FACT_FIELDS.map(field => {
      const text = plainText(d[field]);
      // Do not use a medical claim in the catalog as recommendation evidence.
      const placeholder = /^(รายละเอียด|ส่วนประกอบ|จุดเด่น|วิธีทาน|วิธีใช้|test|description)\s*\d*$/i.test(text);
      const instruction = /ignore.{0,30}(instructions|rules)|system prompt|ลืมคำสั่ง|ละเลย.{0,20}คำสั่ง/i.test(text);
      return [field, unsafeClaim(text) || placeholder || instruction ? '' : text];
    })) as Record<FactField, string>;
    const options = (d.hasVariants ? (Array.isArray(d.variants) ? d.variants : []).filter((v: any) => v.active === true) : [null])
      .flatMap((v: any) => {
        const regular = v ? v.price : d.price;
        const special = v ? (v.compareAtPrice ?? (Number(v.price) === Number(d.price) ? d.compareAtPrice : null)) : d.compareAtPrice;
        const selling = price(regular, special);
        const stock = Number(v ? v.stock : d.stock);
        if (selling === null || !Number.isInteger(stock) || stock < 0 || (v && typeof v.id !== 'string')) return [];
        return [{ id: v ? v.id : null, name: v ? safeProductName(v.displayName, v.id) : '', price: selling, stock }];
      });
    const name = safeProductName(d.name, id);
    if (!name || !options.length) return [];
    const image = d.primaryImageURL || d.images?.find((i: any) => i.isPrimary)?.url || d.images?.[0]?.url;
    return [{ id, name, slug: typeof d.slug === 'string' && d.slug ? d.slug : id,
      imageUrl: typeof image === 'string' && /^https:\/\//i.test(image) ? image : null, facts, options }];
  });
}

export function parseRequest(raw: unknown): { message: string; history: Turn[] } {
  const value = raw as Record<string, unknown> | null;
  if (!value || typeof value.message !== 'string' || !value.message.trim() || value.message.length > 2000) throw new Error('invalid-input');
  const input = value.history ?? [];
  if (!Array.isArray(input) || input.length > 10) throw new Error('invalid-input');
  const history = input.map((t: any): Turn => {
    if (!t || !['user', 'assistant'].includes(t.role) || typeof t.text !== 'string' || t.text.length > 2000) throw new Error('invalid-input');
    return { role: t.role, text: t.text };
  });
  return { message: value.message.trim(), history };
}

export function explicitBudget(message: string): number | null {
  const match = message.match(/(?:งบ(?:ประมาณ)?(?:ไม่เกิน)?|ไม่เกิน|under|budget)\s*([\d,]+(?:\.\d+)?)/i);
  return match ? Number(match[1].replace(/,/g, '')) : null;
}

function wholeExcerpt(source: string, quote: string) {
  if (source === quote) return true;
  let index = source.indexOf(quote);
  while (index >= 0) {
    const before = source.slice(0, index).trimEnd(), after = source.slice(index + quote.length).trimStart();
    if ((!before || /[.!?;。]$/.test(before)) && (!after || /^[.!?;。]/.test(after) || /[.!?;。]$/.test(quote))) return true;
    index = source.indexOf(quote, index + 1);
  }
  return false;
}

export function validateAnswer(raw: any, original: GuidanceProduct[], current: GuidanceProduct[], budget: number | null): GuidanceResponse {
  if (!raw || typeof raw.kind !== 'string') return safeMessage('insufficient_data');
  if (raw.kind !== 'recommend') return safeMessage(raw.kind, raw.question);
  if (!Array.isArray(raw.products) || !raw.products.length || raw.products.length > 3) return safeMessage('insufficient_data');
  const cards: GuidanceCard[] = [];
  const seen = new Set<string>();
  for (const candidate of raw.products) {
    const before = original.find(p => p.id === candidate?.productId);
    const now = current.find(p => p.id === candidate?.productId);
    if (!before || !now || seen.has(now.id)) return safeMessage('changed');
    const variantId = candidate.variantId ?? null;
    const option = now.options.find(o => o.id === variantId);
    const oldOption = before.options.find(o => o.id === variantId);
    if (!option || !oldOption || (oldOption.stock > 0 && option.stock <= 0)) return safeMessage('changed');
    if (budget !== null && option.price > budget) return safeMessage('changed');
    if (!Array.isArray(candidate.evidence) || !candidate.evidence.length || candidate.evidence.length > 3) return safeMessage('insufficient_data');
    const evidence: Evidence[] = [];
    for (const item of candidate.evidence) {
      if (!item || !FACT_FIELDS.includes(item.field) || typeof item.quote !== 'string') return safeMessage('insufficient_data');
      const field = item.field as FactField, quote = plainText(item.quote);
      if (quote.length < 4 || quote.length > 2000 || unsafeClaim(quote) || !wholeExcerpt(before.facts[field], quote) || !wholeExcerpt(now.facts[field], quote)) return safeMessage('insufficient_data');
      evidence.push({ field, quote });
    }
    cards.push({ productId: now.id, variantId, name: now.name, variantName: option.name, price: option.price,
      available: option.stock > 0, href: '/products/' + encodeURIComponent(now.slug), imageUrl: now.imageUrl, evidence });
    seen.add(now.id);
  }
  const available = cards.filter(card => card.available);
  const unavailable = cards.filter(card => !card.available);
  return { ...safeMessage(available.length ? 'recommend' : 'no_match'), products: available, unavailable };
}
