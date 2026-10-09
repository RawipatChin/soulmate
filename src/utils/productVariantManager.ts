import type {
  OptionGroup,
  OptionValue,
  ProductVariant,
  VariantOptionRef,
} from '../types/product';
import {
  uploadVariantImage,
  validateVariantImage,
} from '../services/productImageService';

export function generateOptionGroupId(): string {
  return `og_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateOptionValueId(): string {
  return `ov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function generateVariantId(): string {
  return `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Computes Cartesian product combinations of all valid option groups.
 * Preserves price, stock, SKU, imageURL, active from existing variants.
 */
export function computeCartesianCombinations(
  optionGroups: OptionGroup[],
  existingVariants: ProductVariant[] = [],
  defaultPrice = 0,
  defaultStock = 0,
  baseSku = ''
): ProductVariant[] {
  // Only include groups with at least one non-empty value
  const validGroups = optionGroups
    .map((g, idx) => ({
      ...g,
      name: g.name.trim() || `ตัวเลือก ${idx + 1}`,
      values: g.values.filter((v) => v.name.trim().length > 0),
    }))
    .filter((g) => g.values.length > 0);

  if (validGroups.length === 0) {
    return [];
  }

  // Cartesian product
  let tuples: { groupId: string; groupName: string; valueId: string; valueName: string }[][] = [[]];

  for (const group of validGroups) {
    const nextTuples: typeof tuples = [];
    for (const currentTuple of tuples) {
      for (const val of group.values) {
        nextTuples.push([
          ...currentTuple,
          {
            groupId: group.id,
            groupName: group.name,
            valueId: val.id,
            valueName: val.name.trim(),
          },
        ]);
      }
    }
    tuples = nextTuples;
  }

  // A saved product can contain duplicate variant IDs. Each rendered row must
  // have its own ID because the editor uses it to route input events.
  const usedIds = new Set<string>();
  const uniqueVariantId = (preferred?: string): string => {
    let id = preferred?.trim() || generateVariantId();
    while (usedIds.has(id)) id = generateVariantId();
    usedIds.add(id);
    return id;
  };

  // Map to ProductVariant objects, matching existing variants to preserve entered data
  const result: ProductVariant[] = tuples.map((opts, index) => {
    const displayName = opts.map((o) => o.valueName).join(' / ');

    // Match by exact option value IDs
    const idKey = opts.map((o) => `${o.groupId}:${o.valueId}`).join('|');
    // Fallback match by lowercased group & value names
    const nameKey = opts.map((o) => `${o.groupName.toLowerCase()}:${o.valueName.toLowerCase()}`).join('|');

    const matched =
      existingVariants.find((ev) => {
        if (!Array.isArray(ev.options) || ev.options.length !== opts.length) return false;
        const evIdKey = ev.options.map((o) => `${o.groupId}:${o.valueId}`).join('|');
        return evIdKey === idKey;
      }) ||
      existingVariants.find((ev) => {
        if (!Array.isArray(ev.options) || ev.options.length !== opts.length) return false;
        const evNameKey = ev.options.map((o) => `${o.groupName?.toLowerCase()}:${o.valueName?.toLowerCase()}`).join('|');
        return evNameKey === nameKey;
      });

    if (matched) {
      return {
        id: uniqueVariantId(matched.id),
        options: opts,
        displayName,
        price: typeof matched.price === 'number' && !isNaN(matched.price) ? matched.price : defaultPrice,
        stock: typeof matched.stock === 'number' && !isNaN(matched.stock) ? matched.stock : defaultStock,
        sku: matched.sku ? matched.sku : generateSku(baseSku, index + 1),
        imageURL: matched.imageURL || null,
        active: matched.active !== false,
      };
    }

    return {
      id: uniqueVariantId(),
      options: opts,
      displayName,
      price: defaultPrice,
      stock: defaultStock,
      sku: generateSku(baseSku, index + 1),
      imageURL: null,
      active: true,
    };
  });

  return result;
}

function generateSku(baseSku: string, index: number): string {
  const cleanBase = baseSku.trim().toUpperCase();
  if (cleanBase) {
    return `${cleanBase}-${String(index).padStart(2, '0')}`;
  }
  return `SKU-V${String(index).padStart(2, '0')}`;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateVariantsConfig(
  hasVariants: boolean,
  optionGroups: OptionGroup[],
  variants: ProductVariant[]
): ValidationResult {
  if (!hasVariants) {
    return { isValid: true, errors: [] };
  }

  const errors: string[] = [];

  if (!optionGroups || optionGroups.length === 0) {
    errors.push('กรุณาเพิ่มกลุ่มตัวเลือกสินค้าอย่างน้อย 1 กลุ่ม');
    return { isValid: false, errors };
  }

  const groupNames = new Set<string>();

  optionGroups.forEach((group, gIdx) => {
    const gName = group.name.trim();
    if (!gName) {
      errors.push(`กลุ่มตัวเลือกที่ ${gIdx + 1}: กรุณาระบุชื่อกลุ่มตัวเลือก (เช่น รสชาติ, ขนาด)`);
    } else {
      const lower = gName.toLowerCase();
      if (groupNames.has(lower)) {
        errors.push(`ชื่อกลุ่มตัวเลือก "${gName}" ซ้ำกับกลุ่มอื่น (ชื่อกลุ่มตัวเลือกต้องไม่ซ้ำกัน)`);
      } else {
        groupNames.add(lower);
      }
    }

    const validValues = group.values.filter((v) => v.name.trim().length > 0);
    if (validValues.length === 0) {
      errors.push(`กลุ่มตัวเลือก "${gName || `กลุ่มที่ ${gIdx + 1}`}": ต้องมีค่าตัวเลือกอย่างน้อย 1 ค่า`);
    } else {
      const valNames = new Set<string>();
      validValues.forEach((val) => {
        const vName = val.name.trim().toLowerCase();
        if (valNames.has(vName)) {
          errors.push(`กลุ่มตัวเลือก "${gName}": มีค่าตัวเลือก "${val.name.trim()}" ซ้ำกัน`);
        } else {
          valNames.add(vName);
        }
      });
    }
  });

  if (variants.length === 0) {
    errors.push('ไม่พบรายการตัวเลือกสินค้าที่สร้างขึ้น กรุณาระบุกลุ่มและค่าตัวเลือกให้ครบถ้วน');
    return { isValid: false, errors };
  }

  const skuSet = new Set<string>();

  variants.forEach((v) => {
    if (typeof v.price !== 'number' || isNaN(v.price) || v.price < 0) {
      errors.push(`ตัวเลือก "${v.displayName}": กรุณาระบุราคาที่ถูกต้อง (ต้องมากกว่าหรือเท่ากับ 0)`);
    }

    if (typeof v.stock !== 'number' || isNaN(v.stock) || v.stock < 0) {
      errors.push(`ตัวเลือก "${v.displayName}": กรุณาระบุจำนวนสต็อกที่ถูกต้อง (ต้องมากกว่าหรือเท่ากับ 0)`);
    }

    const skuClean = (v.sku || '').trim().toUpperCase();
    if (!skuClean) {
      errors.push(`ตัวเลือก "${v.displayName}": กรุณาระบุรหัสสินค้า (SKU)`);
    } else {
      if (skuSet.has(skuClean)) {
        errors.push(`รหัส SKU "${skuClean}" ซ้ำกันในตัวเลือก "${v.displayName}" (SKU ของแต่ละตัวเลือกต้องไม่ซ้ำกัน)`);
      } else {
        skuSet.add(skuClean);
      }
    }
  });

  return { isValid: errors.length === 0, errors };
}

export interface MountVariantManagerOptions {
  doc: Document;
  win: any;
  productId: string;
  initialHasVariants: boolean;
  initialOptionGroups?: OptionGroup[];
  initialVariants?: ProductVariant[];
  getDefaultPrice: () => number;
  getDefaultStock: () => number;
  getBaseSku: () => string;
  onTotalStockChange?: (totalStock: number, hasVariants?: boolean) => void;
}

export interface VariantManagerHandle {
  getState: () => {
    hasVariants: boolean;
    optionGroups: OptionGroup[];
    variants: ProductVariant[];
    totalStock: number;
  };
  validate: () => ValidationResult;
  setVariantsData: (
    hasVariants: boolean,
    groups: OptionGroup[],
    vars: ProductVariant[]
  ) => void;
  destroy: () => void;
}

/**
 * Mounts full interactive variant editor into the DOM of admin add/edit product pages.
 */
export function mountVariantManager(options: MountVariantManagerOptions): VariantManagerHandle {
  const {
    doc,
    win,
    productId,
    initialHasVariants,
    initialOptionGroups = [],
    initialVariants = [],
    getDefaultPrice,
    getDefaultStock,
    getBaseSku,
    onTotalStockChange,
  } = options;

  // Clean up any previously attached manager on this doc
  const docAny = doc as any;
  if (typeof docAny.__destroyVariantManager === 'function') {
    docAny.__destroyVariantManager();
  }

  let hasVariants = initialHasVariants;
  let optionGroups: OptionGroup[] =
    initialOptionGroups.length > 0
      ? initialOptionGroups.map((g) => ({
          id: g.id,
          name: g.name || '',
          values: (g.values || []).map((v) => ({
            id: v.id,
            name: v.name || '',
          })),
        }))
      : [];
  let variants: ProductVariant[] =
    initialVariants.length > 0
      ? JSON.parse(JSON.stringify(initialVariants))
      : [];

  const toggle = doc.getElementById('variantToggle') as HTMLInputElement | null;
  const panel = doc.getElementById('variantConfigPanel');
  const groupsContainer = doc.getElementById('optionGroupsContainer');
  const btnAddGroup = doc.getElementById('btnAddOptionGroup');
  const tableContainer = doc.getElementById('variantTableContainer');
  const countBadge = doc.getElementById('variantCountBadge');
  const alertBox = doc.getElementById('variantValidationAlert');
  const alertList = doc.getElementById('variantValidationList');

  // Bulk update elements
  const bulkPriceInput = doc.getElementById('bulkPriceInput') as HTMLInputElement | null;
  const bulkStockInput = doc.getElementById('bulkStockInput') as HTMLInputElement | null;
  const bulkSkuPrefixInput = doc.getElementById('bulkSkuPrefixInput') as HTMLInputElement | null;
  const btnApplyBulk = doc.getElementById('btnApplyBulkUpdate');

  const calculateTotalStock = (): number => {
    if (!hasVariants || variants.length === 0) return getDefaultStock();
    return variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  };

  const notifyStockUpdate = () => {
    const total = calculateTotalStock();
    if (onTotalStockChange) {
      onTotalStockChange(total, hasVariants);
    }
  };

  const syncMainStockField = (active: boolean) => {
    const stockInput = doc.getElementById('stockQty') as HTMLInputElement | null;
    if (!stockInput) return;

    let noticeEl = doc.getElementById('stockVariantNotice');

    if (active) {
      stockInput.readOnly = true;
      stockInput.classList.add('bg-surface-container-high', 'cursor-not-allowed', 'opacity-85');
      stockInput.title = 'คำนวณจากสต็อกของตัวเลือกสินค้า';

      const total = calculateTotalStock();
      stockInput.value = `${total}`;

      if (!noticeEl) {
        noticeEl = doc.createElement('div');
        noticeEl.id = 'stockVariantNotice';
        noticeEl.className = 'mt-1.5 text-xs text-tertiary font-semibold flex items-center gap-1.5';
        noticeEl.innerHTML = `
          <span class="material-symbols-outlined text-[16px]">info</span>
          <span>คำนวณจากสต็อกของตัวเลือกสินค้า (ผลรวมของตัวเลือกทั้งหมด)</span>
        `;
        const parentContainer = stockInput.closest('div.space-y-space-xs') || stockInput.parentElement?.parentElement || stockInput.parentElement;
        parentContainer?.appendChild(noticeEl);
      } else {
        noticeEl.classList.remove('hidden');
      }
    } else {
      stockInput.readOnly = false;
      stockInput.classList.remove('bg-surface-container-high', 'cursor-not-allowed', 'opacity-85');
      stockInput.removeAttribute('title');
      if (noticeEl) {
        noticeEl.classList.add('hidden');
      }
    }
  };

  const recompute = () => {
    variants = computeCartesianCombinations(
      optionGroups,
      variants,
      getDefaultPrice(),
      getDefaultStock(),
      getBaseSku()
    );
    renderTable();
    syncMainStockField(hasVariants);
    notifyStockUpdate();
  };

  const renderOptionGroups = () => {
    if (!groupsContainer) return;

    if (optionGroups.length === 0) {
      groupsContainer.innerHTML = `
        <div class="p-6 rounded-2xl border border-dashed border-outline/30 text-center text-secondary font-body-sm text-body-sm bg-surface-container-low/30 space-y-1">
          <p class="font-semibold text-on-surface">ยังไม่มีกลุ่มตัวเลือกสินค้า</p>
          <p class="text-xs text-outline">คลิกปุ่ม <strong>"+ เพิ่มตัวเลือกสินค้า"</strong> ด้านล่างเพื่อเริ่มสร้างตัวเลือก เช่น รสชาติ หรือ ขนาด</p>
        </div>
      `;
      return;
    }

    let html = '';
    optionGroups.forEach((group, gIdx) => {
      html += `
        <div class="p-space-md sm:p-space-lg rounded-2xl bg-surface-container-low border border-surface-container-high/60 space-y-space-md relative" data-group-id="${group.id}">
          <!-- Group Header -->
          <div class="flex items-center justify-between pb-1 border-b border-surface-container-high/40">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">${gIdx + 1}</span>
              <h4 class="font-headline-sm text-sm text-on-surface font-semibold">ตัวเลือกสินค้า ${gIdx + 1}</h4>
            </div>
            <button
              type="button"
              data-delete-group="${group.id}"
              class="px-2.5 py-1 rounded-lg text-error hover:bg-error-container/30 transition-colors font-label-sm text-xs flex items-center gap-1 cursor-pointer"
              title="ลบกลุ่มตัวเลือกนี้"
            >
              <span class="material-symbols-outlined text-[16px]">delete</span>
              <span>ลบ</span>
            </button>
          </div>

          <!-- Group Name Input -->
          <div class="space-y-1">
            <label class="block font-label-md text-label-md text-on-surface font-semibold">ชื่อตัวเลือกสินค้า <span class="text-error">*</span></label>
            <input
              type="text"
              data-group-name-input="${group.id}"
              value="${escapeHtml(group.name)}"
              placeholder="เช่น รสชาติ, ขนาด, สี"
              class="w-full h-11 px-space-md rounded-xl bg-surface-container-lowest text-on-surface font-body-md text-body-md border border-outline/20 focus:outline-none focus:ring-2 focus:ring-tertiary/40 transition-shadow"
            />
          </div>

          <!-- Option Values List -->
          <div class="space-y-space-xs pt-1">
            <label class="block font-label-md text-label-md text-on-surface font-semibold">ตัวเลือก</label>
            <div class="space-y-2" data-values-container="${group.id}">
      `;

      group.values.forEach((val) => {
        html += `
              <div class="flex items-center gap-2 bg-surface-container-lowest p-2 rounded-xl border border-surface-container-high/60" data-value-id="${val.id}">
                <div class="flex-1">
                  <input
                    type="text"
                    data-val-name-input="${group.id}:${val.id}"
                    value="${escapeHtml(val.name)}"
                    placeholder="ชื่อตัวเลือก เช่น ช็อกโกแลต หรือ 400g"
                    class="w-full h-10 px-space-sm rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-tertiary/40"
                  />
                </div>
                <button
                  type="button"
                  data-delete-value="${group.id}:${val.id}"
                  class="w-9 h-9 rounded-lg text-secondary hover:text-error hover:bg-error-container/20 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="ลบตัวเลือกนี้"
                  ${group.values.length <= 1 ? 'disabled style="opacity: 0.3; cursor: not-allowed;"' : ''}
                >
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
        `;
      });

      html += `
            </div>
            <div class="pt-2">
              <button
                type="button"
                data-add-value="${group.id}"
                class="px-3.5 py-2 rounded-xl bg-surface-container-highest/60 hover:bg-primary-container/30 text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span class="material-symbols-outlined text-[16px]">add</span>
                <span>+ เพิ่มตัวเลือก</span>
              </button>
            </div>
          </div>
        </div>
      `;
    });

    groupsContainer.innerHTML = html;
  };

  const renderTable = () => {
    if (countBadge) {
      countBadge.textContent = `${variants.length} ตัวเลือก`;
    }

    if (!tableContainer) return;

    if (variants.length === 0) {
      tableContainer.innerHTML = `
        <div class="p-8 rounded-2xl bg-surface-container-low/40 border border-dashed border-outline/30 text-center space-y-2">
          <span class="material-symbols-outlined text-outline text-[36px]">style</span>
          <p class="font-body-md text-body-md text-secondary font-medium">ยังไม่มีรายการตัวเลือกสินค้า</p>
          <p class="font-label-sm text-label-sm text-outline">กรุณาระบุชื่อกลุ่มและค่าตัวเลือกลงในช่องด้านบน ระบบจะคำนวณและสร้างชุดตัวเลือกอัตโนมัติ</p>
        </div>
      `;
      return;
    }

    // Render desktop table + mobile cards
    let html = `
      <!-- Desktop Table (visible sm and up) -->
      <div class="hidden sm:block overflow-x-auto rounded-2xl border border-surface-container-high bg-surface-container-lowest shadow-xs">
        <table class="w-full text-left font-body-sm text-body-sm border-collapse">
          <thead>
            <tr class="bg-surface-container-low/80 text-secondary font-label-sm text-label-sm uppercase tracking-wider border-b border-surface-container-high">
              <th class="py-3 px-space-md w-16 text-center">รูป</th>
              <th class="py-3 px-space-md">ตัวเลือก</th>
              <th class="py-3 px-space-md w-36">ราคา (฿) <span class="text-error">*</span></th>
              <th class="py-3 px-space-md w-32">คลัง (ชิ้น) <span class="text-error">*</span></th>
              <th class="py-3 px-space-md w-44">เลขสินค้า (SKU) <span class="text-error">*</span></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container-high/60">
    `;

    variants.forEach((v) => {
      html += `
        <tr class="hover:bg-surface-container-low/40 transition-colors" data-variant-row="${v.id}">
          <!-- Image Control -->
          <td class="py-3 px-space-md text-center align-middle">
            <div class="relative w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center overflow-hidden mx-auto border border-outline/20 group/vimg">
              ${
                v.imageURL
                  ? `<img src="${v.imageURL}" alt="${escapeHtml(v.displayName)}" class="w-full h-full object-cover" />
                     <div class="absolute inset-0 bg-inverse-surface/60 opacity-0 group-hover/vimg:opacity-100 transition-opacity flex items-center justify-center gap-1">
                       <button type="button" data-upload-variant-img="${v.id}" class="w-5 h-5 rounded-full bg-white text-on-surface hover:text-primary flex items-center justify-center cursor-pointer shadow-xs" title="เปลี่ยนรูป">
                         <span class="material-symbols-outlined text-[12px]">edit</span>
                       </button>
                       <button type="button" data-delete-variant-img="${v.id}" class="w-5 h-5 rounded-full bg-white text-error hover:bg-error-container flex items-center justify-center cursor-pointer shadow-xs" title="ลบรูป">
                         <span class="material-symbols-outlined text-[12px]">close</span>
                       </button>
                     </div>`
                  : `<button type="button" data-upload-variant-img="${v.id}" class="w-full h-full flex flex-col items-center justify-center text-outline hover:text-primary hover:bg-primary-container/20 transition-colors cursor-pointer" title="อัปโหลดรูปตัวเลือก">
                       <span class="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                     </button>`
              }
              <div id="variantSpinner_${v.id}" class="hidden absolute inset-0 bg-surface-container-lowest/80 flex items-center justify-center">
                <span class="material-symbols-outlined text-primary text-[18px] animate-spin">progress_activity</span>
              </div>
            </div>
          </td>

          <!-- Display Name -->
          <td class="py-3 px-space-md align-middle">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container font-label-md text-label-md text-on-surface font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              ${escapeHtml(v.displayName)}
            </span>
          </td>

          <!-- Price Input -->
          <td class="py-3 px-space-md align-middle">
            <div class="relative flex items-center">
              <span class="absolute left-2.5 font-headline-sm text-headline-sm text-secondary font-semibold text-xs">฿</span>
              <input
                type="number"
                min="0"
                step="0.01"
                data-var-price="${v.id}"
                value="${v.price !== undefined ? v.price : ''}"
                placeholder="0.00"
                class="w-full h-10 pl-7 pr-space-sm rounded-xl bg-surface-container-low text-on-surface font-semibold text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-tertiary/40 border border-outline/20"
              />
            </div>
          </td>

          <!-- Stock Input -->
          <td class="py-3 px-space-md align-middle">
            <div class="relative flex items-center">
              <input
                type="number"
                min="0"
                step="1"
                data-var-stock="${v.id}"
                value="${v.stock !== undefined ? v.stock : ''}"
                placeholder="0"
                class="w-full h-10 px-space-sm rounded-xl bg-surface-container-low text-on-surface font-semibold text-sm focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-tertiary/40 border border-outline/20"
              />
            </div>
          </td>

          <!-- SKU Input -->
          <td class="py-3 px-space-md align-middle">
            <input
              type="text"
              data-var-sku="${v.id}"
              value="${escapeHtml(v.sku || '')}"
              placeholder="SKU-001"
              class="w-full h-10 px-space-sm rounded-xl bg-surface-container-low text-on-surface font-mono text-xs uppercase focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-tertiary/40 border border-outline/20"
            />
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards (visible below sm) -->
      <div class="sm:hidden space-y-3">
    `;

    variants.forEach((v) => {
      html += `
        <div class="p-space-md rounded-2xl bg-surface-container-lowest border border-surface-container-high shadow-xs space-y-space-sm" data-variant-card="${v.id}">
          <div class="flex items-center gap-space-sm">
            <div class="relative w-14 h-14 rounded-xl bg-surface-container-low flex items-center justify-center overflow-hidden border border-outline/20 shrink-0">
              ${
                v.imageURL
                  ? `<img src="${v.imageURL}" alt="${escapeHtml(v.displayName)}" class="w-full h-full object-cover" />
                     <div class="absolute inset-0 bg-inverse-surface/60 opacity-90 flex items-center justify-center gap-1">
                       <button type="button" data-upload-variant-img="${v.id}" class="w-6 h-6 rounded-full bg-white text-on-surface hover:text-primary flex items-center justify-center cursor-pointer shadow-xs" title="เปลี่ยนรูป">
                         <span class="material-symbols-outlined text-[14px]">edit</span>
                       </button>
                       <button type="button" data-delete-variant-img="${v.id}" class="w-6 h-6 rounded-full bg-white text-error flex items-center justify-center cursor-pointer shadow-xs" title="ลบรูป">
                         <span class="material-symbols-outlined text-[14px]">close</span>
                       </button>
                     </div>`
                  : `<button type="button" data-upload-variant-img="${v.id}" class="w-full h-full flex flex-col items-center justify-center text-outline hover:text-primary transition-colors cursor-pointer" title="อัปโหลดรูปตัวเลือก">
                       <span class="material-symbols-outlined text-[22px]">add_photo_alternate</span>
                     </button>`
              }
              <div id="variantSpinner_m_${v.id}" class="hidden absolute inset-0 bg-surface-container-lowest/80 flex items-center justify-center">
                <span class="material-symbols-outlined text-primary text-[18px] animate-spin">progress_activity</span>
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <span class="font-headline-sm text-sm text-on-surface font-bold line-clamp-1">${escapeHtml(v.displayName)}</span>
              <p class="font-label-sm text-label-sm text-secondary mt-0.5">ระบุราคา สต็อก และ SKU ด้านล่าง</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label class="block font-label-sm text-label-sm text-secondary mb-1">ราคา (฿) <span class="text-error">*</span></label>
              <input
                type="number"
                min="0"
                step="0.01"
                data-var-price="${v.id}"
                value="${v.price !== undefined ? v.price : ''}"
                placeholder="0.00"
                class="w-full h-10 px-space-sm rounded-xl bg-surface-container-low text-on-surface font-semibold text-sm border border-outline/20"
              />
            </div>
            <div>
              <label class="block font-label-sm text-label-sm text-secondary mb-1">คลัง (ชิ้น) <span class="text-error">*</span></label>
              <input
                type="number"
                min="0"
                step="1"
                data-var-stock="${v.id}"
                value="${v.stock !== undefined ? v.stock : ''}"
                placeholder="0"
                class="w-full h-10 px-space-sm rounded-xl bg-surface-container-low text-on-surface font-semibold text-sm border border-outline/20"
              />
            </div>
          </div>

          <div>
            <label class="block font-label-sm text-label-sm text-secondary mb-1">เลขสินค้า (SKU) <span class="text-error">*</span></label>
            <input
              type="text"
              data-var-sku="${v.id}"
              value="${escapeHtml(v.sku || '')}"
              placeholder="SKU-001"
              class="w-full h-10 px-space-sm rounded-xl bg-surface-container-low text-on-surface font-mono text-xs uppercase border border-outline/20"
            />
          </div>
        </div>
      `;
    });

    html += `
      </div>
    `;

    tableContainer.innerHTML = html;
  };

  // Helper to trigger hidden file picker for single variant image
  const triggerVariantImageUpload = (variantId: string) => {
    let fileInput = doc.getElementById(`variantFileInput_${variantId}`) as HTMLInputElement | null;
    if (!fileInput) {
      fileInput = doc.createElement('input');
      fileInput.type = 'file';
      fileInput.id = `variantFileInput_${variantId}`;
      fileInput.accept = 'image/jpeg,image/png,image/webp';
      fileInput.className = 'hidden';
      fileInput.style.display = 'none';
      doc.body.appendChild(fileInput);
    }

    fileInput.onchange = async () => {
      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const validation = validateVariantImage(file);
        if (!validation.valid) {
          win.alert(validation.error || 'ไฟล์รูปภาพไม่ถูกต้อง');
          return;
        }

        // Show immediate local preview
        const tempPreviewUrl = URL.createObjectURL(file);
        const targetVariant = variants.find((v) => v.id === variantId);
        if (targetVariant) {
          targetVariant.imageURL = tempPreviewUrl;
          renderTable();
        }

        const spinner1 = doc.getElementById(`variantSpinner_${variantId}`);
        const spinner2 = doc.getElementById(`variantSpinner_m_${variantId}`);
        spinner1?.classList.remove('hidden');
        spinner2?.classList.remove('hidden');

        try {
          const downloadUrl = await uploadVariantImage(productId, variantId, file);
          if (targetVariant) {
            targetVariant.imageURL = downloadUrl;
          }
          renderTable();
        } catch (err: any) {
          console.error('[Variant Image Upload] Error:', err);
          // Keep local preview if offline/mock or warn
        } finally {
          spinner1?.classList.add('hidden');
          spinner2?.classList.add('hidden');
          fileInput.value = '';
        }
      }
    };

    fileInput.click();
  };

  // --- Toggle synchronization function ---
  const syncVariantPanel = () => {
    if (!toggle) return;
    hasVariants = toggle.checked;

    if (panel) {
      panel.classList.toggle('hidden', !hasVariants);
    }

    // When toggle is ON, if optionGroups is empty, show at least ONE option group card by default
    if (hasVariants && optionGroups.length === 0) {
      optionGroups.push({
        id: generateOptionGroupId(),
        name: '',
        values: [
          { id: generateOptionValueId(), name: '' },
          { id: generateOptionValueId(), name: '' },
        ],
      });
      renderOptionGroups();
      recompute();
    }

    // Hide any previous validation alert when toggling
    if (alertBox) {
      alertBox.classList.add('hidden');
    }

    syncMainStockField(hasVariants);
    notifyStockUpdate();
  };

  // Event handlers to attach and clean up
  const handleToggleChange = () => {
    syncVariantPanel();
  };

  const handleToggleLabelClick = () => {
    setTimeout(() => {
      syncVariantPanel();
    }, 10);
  };

  const handleAddGroupClick = (e: Event) => {
    e.preventDefault();
    optionGroups.push({
      id: generateOptionGroupId(),
      name: '',
      values: [
        { id: generateOptionValueId(), name: '' },
        { id: generateOptionValueId(), name: '' },
      ],
    });
    renderOptionGroups();
    recompute();
  };

  const handleApplyBulkClick = (e: Event) => {
    e.preventDefault();
    const rawPrice = bulkPriceInput?.value.trim() || '';
    const rawStock = bulkStockInput?.value.trim() || '';
    const rawSkuPrefix = bulkSkuPrefixInput?.value.trim() || '';

    if (!rawPrice && !rawStock && !rawSkuPrefix) {
      win.alert('กรุณากรอกราคา, คลัง หรือรหัส SKU เริ่มต้น อย่างน้อย 1 ค่าเพื่ออัปเดตทั้งหมด');
      return;
    }

    const newPrice = rawPrice !== '' ? parseFloat(rawPrice) : null;
    const newStock = rawStock !== '' ? parseInt(rawStock, 10) : null;

    variants.forEach((v, idx) => {
      if (newPrice !== null && !isNaN(newPrice)) {
        v.price = newPrice;
      }
      if (newStock !== null && !isNaN(newStock)) {
        v.stock = newStock;
      }
      if (rawSkuPrefix) {
        v.sku = `${rawSkuPrefix.toUpperCase()}-${String(idx + 1).padStart(2, '0')}`;
      }
    });

    renderTable();
    syncMainStockField(hasVariants);
    notifyStockUpdate();

    if (bulkPriceInput) bulkPriceInput.value = '';
    if (bulkStockInput) bulkStockInput.value = '';
    if (bulkSkuPrefixInput) bulkSkuPrefixInput.value = '';
  };

  const handleGroupsContainerClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Delete group
    const delGroupBtn = target.closest('[data-delete-group]') as HTMLElement | null;
    if (delGroupBtn) {
      e.preventDefault();
      const gId = delGroupBtn.getAttribute('data-delete-group');
      if (gId) {
        optionGroups = optionGroups.filter((g) => g.id !== gId);
        renderOptionGroups();
        recompute();
      }
      return;
    }

    // Add value
    const addValBtn = target.closest('[data-add-value]') as HTMLElement | null;
    if (addValBtn) {
      e.preventDefault();
      const gId = addValBtn.getAttribute('data-add-value');
      const targetGroup = optionGroups.find((g) => g.id === gId);
      if (targetGroup) {
        targetGroup.values.push({
          id: generateOptionValueId(),
          name: '',
        });
        renderOptionGroups();
        recompute();
      }
      return;
    }

    // Delete value
    const delValBtn = target.closest('[data-delete-value]') as HTMLElement | null;
    if (delValBtn) {
      e.preventDefault();
      const attr = delValBtn.getAttribute('data-delete-value') || '';
      const [gId, vId] = attr.split(':');
      const targetGroup = optionGroups.find((g) => g.id === gId);
      if (targetGroup && targetGroup.values.length > 1) {
        targetGroup.values = targetGroup.values.filter((v) => v.id !== vId);
        renderOptionGroups();
        recompute();
      }
      return;
    }
  };

  const handleGroupsContainerInput = (e: Event) => {
    const target = e.target as HTMLInputElement | null;
    if (!target) return;

    // Group name input
    const gId = target.getAttribute('data-group-name-input');
    if (gId) {
      const group = optionGroups.find((g) => g.id === gId);
      if (group) {
        group.name = target.value;
        recompute();
      }
      return;
    }

    // Value name input
    const valNameAttr = target.getAttribute('data-val-name-input');
    if (valNameAttr) {
      const [groupId, valId] = valNameAttr.split(':');
      const group = optionGroups.find((g) => g.id === groupId);
      const val = group?.values.find((v) => v.id === valId);
      if (val) {
        val.name = target.value;
        recompute();
      }
      return;
    }
  };

  const handleTableContainerClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Upload variant image
    const upImgBtn = target.closest('[data-upload-variant-img]') as HTMLElement | null;
    if (upImgBtn) {
      e.preventDefault();
      const varId = upImgBtn.getAttribute('data-upload-variant-img');
      if (varId) {
        triggerVariantImageUpload(varId);
      }
      return;
    }

    // Delete variant image
    const delImgBtn = target.closest('[data-delete-variant-img]') as HTMLElement | null;
    if (delImgBtn) {
      e.preventDefault();
      const varId = delImgBtn.getAttribute('data-delete-variant-img');
      const targetVariant = variants.find((v) => v.id === varId);
      if (targetVariant) {
        targetVariant.imageURL = null;
        renderTable();
      }
      return;
    }
  };

  const handleTableContainerInput = (e: Event) => {
    const target = e.target as HTMLInputElement | null;
    if (!target) return;

    // Variant price
    const varPriceId = target.getAttribute('data-var-price');
    if (varPriceId) {
      const v = variants.find((item) => item.id === varPriceId);
      if (v) {
        v.price = parseFloat(target.value) || 0;
        tableContainer?.querySelectorAll(`[data-var-price="${varPriceId}"]`).forEach((inp) => {
          if (inp !== target) (inp as HTMLInputElement).value = target.value;
        });
      }
      return;
    }

    // Variant stock
    const varStockId = target.getAttribute('data-var-stock');
    if (varStockId) {
      const v = variants.find((item) => item.id === varStockId);
      if (v) {
        v.stock = parseInt(target.value, 10) || 0;
        tableContainer?.querySelectorAll(`[data-var-stock="${varStockId}"]`).forEach((inp) => {
          if (inp !== target) (inp as HTMLInputElement).value = target.value;
        });
        syncMainStockField(hasVariants);
        notifyStockUpdate();
      }
      return;
    }

    // Variant SKU
    const varSkuId = target.getAttribute('data-var-sku');
    if (varSkuId) {
      const v = variants.find((item) => item.id === varSkuId);
      if (v) {
        v.sku = target.value.trim().toUpperCase();
        tableContainer?.querySelectorAll(`[data-var-sku="${varSkuId}"]`).forEach((inp) => {
          if (inp !== target) (inp as HTMLInputElement).value = target.value;
        });
      }
      return;
    }
  };

  // Wire up listeners directly
  if (toggle) {
    toggle.checked = hasVariants;
    toggle.addEventListener('change', handleToggleChange);
  }

  const toggleLabel = toggle?.closest('label') || doc.querySelector('#productVariantsSection label');
  if (toggleLabel) {
    toggleLabel.addEventListener('click', handleToggleLabelClick);
  }

  if (btnAddGroup) {
    btnAddGroup.addEventListener('click', handleAddGroupClick);
  }

  if (btnApplyBulk) {
    btnApplyBulk.addEventListener('click', handleApplyBulkClick);
  }

  if (groupsContainer) {
    groupsContainer.addEventListener('click', handleGroupsContainerClick as any);
    groupsContainer.addEventListener('input', handleGroupsContainerInput);
  }

  if (tableContainer) {
    tableContainer.addEventListener('click', handleTableContainerClick as any);
    tableContainer.addEventListener('input', handleTableContainerInput);
  }

  // Destroy / cleanup function
  const destroy = () => {
    if (toggle) {
      toggle.removeEventListener('change', handleToggleChange);
    }
    if (toggleLabel) {
      toggleLabel.removeEventListener('click', handleToggleLabelClick);
    }
    if (btnAddGroup) {
      btnAddGroup.removeEventListener('click', handleAddGroupClick);
    }
    if (btnApplyBulk) {
      btnApplyBulk.removeEventListener('click', handleApplyBulkClick);
    }
    if (groupsContainer) {
      groupsContainer.removeEventListener('click', handleGroupsContainerClick as any);
      groupsContainer.removeEventListener('input', handleGroupsContainerInput);
    }
    if (tableContainer) {
      tableContainer.removeEventListener('click', handleTableContainerClick as any);
      tableContainer.removeEventListener('input', handleTableContainerInput);
    }
  };

  docAny.__destroyVariantManager = destroy;

  // Initial synchronization
  syncVariantPanel();
  renderOptionGroups();
  recompute();

  return {
    getState: () => ({
      hasVariants,
      optionGroups: optionGroups.map((g) => ({
        id: g.id,
        name: (g.name || '').trim(),
        values: (g.values || []).map((v) => ({ id: v.id, name: (v.name || '').trim() })),
      })),
      variants,
      totalStock: calculateTotalStock(),
    }),
    validate: () => {
      const result = validateVariantsConfig(hasVariants, optionGroups, variants);
      if (alertBox && alertList) {
        if (!result.isValid) {
          alertList.innerHTML = result.errors.map((e) => `<li>• ${escapeHtml(e)}</li>`).join('');
          alertBox.classList.remove('hidden');
          alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          alertBox.classList.add('hidden');
        }
      }
      return result;
    },
    setVariantsData: (newHasVariants, newGroups, newVariants) => {
      hasVariants = newHasVariants;
      optionGroups = (newGroups || []).map((g) => ({
        id: g.id,
        name: g.name || '',
        values: (g.values || []).map((v) => ({
          id: v.id,
          name: v.name || '',
        })),
      }));
      variants = JSON.parse(JSON.stringify(newVariants || []));
      if (toggle) toggle.checked = hasVariants;
      if (panel) panel.classList.toggle('hidden', !hasVariants);
      renderOptionGroups();
      recompute();
      syncMainStockField(hasVariants);
    },
    destroy,
  };
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
