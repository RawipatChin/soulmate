import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Image as ImageIcon, LoaderCircle, Pencil, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { AdminOrderShell } from './OrderPages';
import {
  createBanner,
  deleteBanner,
  deleteBannerImage,
  getAdminBanners,
  getBannerById,
  MAX_BANNER_IMAGE_SIZE,
  updateBanner,
  uploadBannerImage,
  type BannerInput,
  type StoreBanner,
} from '../services/bannerService';
import './admin-banners.css';

const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

function bannerDateLabel(banner: StoreBanner) {
  const value = banner.updatedAt as { toDate?: () => Date } | undefined;
  const date = value?.toDate?.();
  return date ? date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
}

function useObjectUrl(file: File | null) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (!file) {
      setUrl('');
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);
  return url;
}

function BannerArtwork({ src, label, compact = false }: { src: string; label: string; compact?: boolean }) {
  return src
    ? <img className={compact ? 'banner-artwork banner-artwork--compact' : 'banner-artwork'} src={src} alt={`${label} preview`} />
    : <span className={compact ? 'banner-artwork-placeholder banner-artwork-placeholder--compact' : 'banner-artwork-placeholder'} aria-label={`ไม่มีภาพ${label}`}><ImageIcon aria-hidden="true" /></span>;
}

export function AdminBannersPage() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<StoreBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setBanners(await getAdminBanners());
    } catch (cause) {
      console.error('[Admin Banners] Load failed', cause);
      setError('โหลดแบนเนอร์ไม่สำเร็จ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleActive = async (banner: StoreBanner) => {
      if (!banner.active && !(banner.mobileImageUrl || banner.desktopImageUrl)) {
      setError('เพิ่มภาพมือถือก่อนเปิดใช้งาน');
      return;
    }
    setBusyId(banner.id);
    setError('');
    try {
      await updateBanner(banner.id, { active: !banner.active });
      await load(true);
    } catch (cause) {
      console.error('[Admin Banners] Status update failed', cause);
      setError('บันทึกสถานะไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  };

  const moveBanner = async (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= banners.length) return;
    setBusyId(banners[index].id);
    setError('');
    const reordered = [...banners];
    const [moving] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moving);
    try {
      await Promise.all(reordered.map((banner, position) => updateBanner(banner.id, { displayOrder: position + 1 })));
      await load(true);
    } catch (cause) {
      console.error('[Admin Banners] Reorder failed', cause);
      setError('จัดลำดับไม่สำเร็จ');
      await load(true);
    } finally {
      setBusyId('');
    }
  };

  const remove = async (banner: StoreBanner) => {
    if (!window.confirm(`ลบแบนเนอร์ “${banner.name}” หรือไม่?`)) return;
    setBusyId(banner.id);
    setError('');
    try {
      await deleteBanner(banner);
      setBanners((current) => current.filter((item) => item.id !== banner.id));
    } catch (cause) {
      console.error('[Admin Banners] Delete failed', cause);
      setError('ลบแบนเนอร์ไม่สำเร็จ');
    } finally {
      setBusyId('');
    }
  };

  return <AdminOrderShell title="แบนเนอร์">
    <main className="banner-admin-page">
      <div className="banner-page-heading">
        <h2>แบนเนอร์หน้าแรก</h2>
        <div className="banner-page-actions">
          <button className="banner-icon-button" type="button" aria-label="รีเฟรช" onClick={() => void load(true)} disabled={loading || refreshing}>
            <RefreshCw size={17} className={refreshing ? 'is-spinning' : ''} />
          </button>
          {banners.length > 0 && <button className="banner-primary-button" type="button" onClick={() => navigate('/admin/banners/new')}><Plus size={17} />เพิ่มแบนเนอร์</button>}
        </div>
      </div>

      {error && <p className="banner-inline-error" role="alert">{error}</p>}

      {loading ? <div className="banner-list-loading" role="status"><LoaderCircle className="is-spinning" size={20} />กำลังโหลด</div>
        : banners.length === 0 ? <div className="banner-empty-state"><ImageIcon size={24} /><p>ยังไม่มีแบนเนอร์</p><button className="banner-primary-button" type="button" onClick={() => navigate('/admin/banners/new')}><Plus size={17} />เพิ่มแบนเนอร์</button></div>
          : <div className="banner-list" aria-label="รายการแบนเนอร์">
            {banners.map((banner, index) => <article className="banner-list-row" key={banner.id}>
              <BannerArtwork src={banner.mobileImageUrl || banner.desktopImageUrl} label="แบนเนอร์" />
              <div className="banner-list-main">
                <div className="banner-list-title-line"><h3>{banner.name}</h3><span className={`banner-status${banner.active ? ' is-active' : ''}`}>{banner.active ? 'กำลังแสดง' : 'ปิดอยู่'}</span></div>
                <div className="banner-list-meta"><span>ลำดับ {banner.displayOrder}</span>{bannerDateLabel(banner) && <span>{bannerDateLabel(banner)}</span>}</div>
              </div>
              <div className="banner-row-actions">
                <div className="banner-order-actions" aria-label={`จัดลำดับ ${banner.name}`}>
                  <button className="banner-icon-button" type="button" aria-label="เลื่อนขึ้น" onClick={() => void moveBanner(index, -1)} disabled={index === 0 || busyId === banner.id}><ArrowUp size={16} /></button>
                  <button className="banner-icon-button" type="button" aria-label="เลื่อนลง" onClick={() => void moveBanner(index, 1)} disabled={index === banners.length - 1 || busyId === banner.id}><ArrowDown size={16} /></button>
                </div>
                <button className={`banner-toggle${banner.active ? ' is-active' : ''}`} type="button" role="switch" aria-checked={banner.active} aria-label={`${banner.active ? 'ปิด' : 'เปิด'} ${banner.name}`} onClick={() => void toggleActive(banner)} disabled={busyId === banner.id}><span /></button>
                <button className="banner-icon-button" type="button" aria-label={`แก้ไข ${banner.name}`} onClick={() => navigate(`/admin/banners/${banner.id}/edit`)}><Pencil size={16} /></button>
                <button className="banner-icon-button banner-danger-button" type="button" aria-label={`ลบ ${banner.name}`} onClick={() => void remove(banner)} disabled={busyId === banner.id}><Trash2 size={16} /></button>
              </div>
            </article>)}
          </div>}
    </main>
  </AdminOrderShell>;
}

function BannerImageInput({
  label, src, file, required, onFile, onRemove, onError,
}: {
  label: string;
  src: string;
  file: File | null;
  required?: boolean;
  onFile: (file: File | null) => void;
  onRemove: () => void;
  onError: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = useObjectUrl(file) || src;
  const changeFile = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';
    if (!nextFile) return;
    if (!supportedImageTypes.includes(nextFile.type)) {
      onError('รองรับไฟล์ JPG, PNG หรือ WEBP');
      return;
    }
    if (nextFile.size <= 0 || nextFile.size > MAX_BANNER_IMAGE_SIZE) {
      onError('ขนาดไฟล์ต้องไม่เกิน 5 MB');
      return;
    }
    onError('');
    onFile(nextFile);
  };

  return <section className="banner-image-field">
    <div className="banner-image-title"><h3>{label}</h3>{required && <span>จำเป็น</span>}</div>
    <div className="banner-image-preview"><BannerArtwork src={preview} label={label} /></div>
    <input ref={inputRef} className="banner-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={changeFile} aria-label={`เลือกรูป${label}`} />
    <div className="banner-image-actions">
      <button className="banner-secondary-button" type="button" onClick={() => inputRef.current?.click()}><Upload size={16} />{preview ? 'เปลี่ยนรูป' : 'เลือกรูป'}</button>
      {preview && <button className="banner-icon-button" type="button" aria-label={`นำรูป${label}ออก`} onClick={onRemove}><X size={17} /></button>}
    </div>
    <p className="banner-image-hint">JPG, PNG, WEBP · ไม่เกิน 5 MB</p>
  </section>;
}

export function AdminBannerFormPage() {
  const navigate = useNavigate();
  const { bannerId } = useParams();
  const editing = Boolean(bannerId);
  const [banner, setBanner] = useState<StoreBanner | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState('');
  const [displayOrder, setDisplayOrder] = useState('1');
  const [active, setActive] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bannerId) return;
    let alive = true;
    getBannerById(bannerId).then((result) => {
      if (!alive) return;
      if (!result) setError('ไม่พบแบนเนอร์นี้');
      else {
        setBanner(result);
        setName(result.name);
        setDisplayOrder(String(result.displayOrder));
        setActive(result.active);
      }
    }).catch((cause) => {
      console.error('[Admin Banner] Load failed', cause);
      if (alive) setError('โหลดแบนเนอร์ไม่สำเร็จ');
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [bannerId]);

  const imagePreview = useMemo(() => removeImage ? '' : banner?.mobileImageUrl || banner?.desktopImageUrl || '', [banner?.mobileImageUrl, banner?.desktopImageUrl, removeImage]);
  const setImage = (file: File | null) => { setImageFile(file); if (file) setRemoveImage(false); };
  const clearImage = () => { setImageFile(null); setRemoveImage(true); };

  const useCurrentHomepageBanner = async () => {
    setError('');
    try {
      const response = await fetch('/home-banner-sm25.webp');
      if (!response.ok) throw new Error('โหลดภาพหน้าเว็บไม่สำเร็จ');
      const image = await response.blob();
      const file = new File([image], 'home-banner-sm25.webp', { type: image.type || 'image/webp' });
      setName('โปรโมชัน SM25%');
      setImageFile(file);
      setRemoveImage(false);
      setActive(true);
    } catch (cause) {
      console.error('[Admin Banner] Current homepage image load failed', cause);
      setError(cause instanceof Error ? cause.message : 'โหลดภาพหน้าเว็บไม่สำเร็จ');
    }
  };

  const removeCurrentBanner = async () => {
    if (!banner || !window.confirm(`ลบแบนเนอร์ “${banner.name}” หรือไม่?`)) return;
    setDeleting(true);
    setError('');
    try {
      await deleteBanner(banner);
      navigate('/admin/banners', { replace: true });
    } catch (cause) {
      console.error('[Admin Banner] Delete failed', cause);
      setError('ลบแบนเนอร์ไม่สำเร็จ');
      setDeleting(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    const trimmedName = name.trim();
    const numericOrder = Number(displayOrder);
    if (!trimmedName) { setError('กรอกชื่อแบนเนอร์'); return; }
    if (!Number.isFinite(numericOrder) || numericOrder < 1 || numericOrder > 99) { setError('ลำดับต้องอยู่ระหว่าง 1–99'); return; }
    const hasImage = imageFile || (!removeImage && (banner?.mobileImageUrl || banner?.desktopImageUrl));
    if (!hasImage) { setError('เลือกรูปแบนเนอร์'); return; }

    setSaving(true);
    let target = bannerId || '';
    let createdId = '';
    const uploadedPaths: string[] = [];
    try {
      if (!editing) {
        const draft: BannerInput = { name: trimmedName, displayOrder: numericOrder, active: false, mobileImageUrl: '', mobileImagePath: '', desktopImageUrl: '', desktopImagePath: '' };
        target = await createBanner(draft);
        createdId = target;
      }

      const changes: Partial<BannerInput> = { name: trimmedName, displayOrder: numericOrder, active };
      if (imageFile) {
        const image = await uploadBannerImage(target, 'shared', imageFile);
        uploadedPaths.push(image.path);
        changes.mobileImageUrl = image.url;
        changes.mobileImagePath = image.path;
        changes.desktopImageUrl = image.url;
        changes.desktopImagePath = image.path;
      } else if (removeImage) {
        changes.mobileImageUrl = '';
        changes.mobileImagePath = '';
        changes.desktopImageUrl = '';
        changes.desktopImagePath = '';
      }

      await updateBanner(target, changes);
      if (banner) {
        const replacedImages = [
          (imageFile || removeImage) ? banner.mobileImagePath : '',
          (imageFile || removeImage) ? banner.desktopImagePath : '',
        ].filter(Boolean);
        await Promise.all(replacedImages.map((path) => deleteBannerImage(path).catch((cause) => console.warn('[Admin Banner] Image cleanup failed', cause))));
      }
      navigate('/admin/banners', { replace: true });
    } catch (cause) {
      console.error('[Admin Banner] Save failed', cause);
      await Promise.all(uploadedPaths.map((path) => deleteBannerImage(path).catch((cleanupError) => console.warn('[Admin Banner] Upload cleanup failed', cleanupError))));
      if (createdId) {
        const draft = await getBannerById(createdId).catch(() => null);
        if (draft) await deleteBanner(draft).catch((cleanupError) => console.warn('[Admin Banner] Draft cleanup failed', cleanupError));
      }
      setError(cause instanceof Error ? cause.message : 'บันทึกแบนเนอร์ไม่สำเร็จ');
      setSaving(false);
    }
  };

  return <AdminOrderShell title={editing ? 'แก้ไขแบนเนอร์' : 'เพิ่มแบนเนอร์'}>
    <main className="banner-admin-page banner-form-page">
      <div className="banner-form-heading">
        <button className="banner-back-button" type="button" onClick={() => navigate('/admin/banners')}><ArrowLeft size={17} />แบนเนอร์</button>
        <div className="banner-page-heading"><h2>{editing ? name || 'แก้ไขแบนเนอร์' : 'แบนเนอร์ใหม่'}</h2>{editing && banner && <span className={`banner-status${banner.active ? ' is-active' : ''}`}>{banner.active ? 'กำลังแสดง' : 'ปิดอยู่'}</span>}</div>
      </div>

      {loading ? <div className="banner-list-loading" role="status"><LoaderCircle className="is-spinning" size={20} />กำลังโหลด</div>
        : error && !banner && editing ? <div className="banner-inline-error" role="alert">{error}</div>
          : <form className="banner-form" onSubmit={save}>
            <section className="banner-form-section">
              <label className="banner-field"><span>ชื่อแบนเนอร์</span><input maxLength={120} value={name} onChange={(event) => setName(event.currentTarget.value)} placeholder="เช่น โปรโมชันประจำเดือน" /></label>
              <label className="banner-field banner-order-field"><span>ลำดับ</span><input type="number" min="1" max="99" value={displayOrder} onChange={(event) => setDisplayOrder(event.currentTarget.value)} /></label>
              <label className="banner-active-field"><span><strong>แสดงบนหน้าแรก</strong><small>{active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</small></span><button type="button" role="switch" aria-checked={active} aria-label="แสดงบนหน้าแรก" className={`banner-toggle${active ? ' is-active' : ''}`} onClick={() => setActive((value) => !value)}><span /></button></label>
            </section>

            {!editing && <button className="banner-secondary-button banner-current-image-button" type="button" onClick={() => void useCurrentHomepageBanner()}><ImageIcon size={16} />ใช้ภาพที่แสดงบนหน้าเว็บ</button>}
            <section className="banner-artwork-section banner-artwork-section--single">
              <BannerImageInput label="รูปแบนเนอร์" src={imagePreview} file={imageFile} required onFile={setImage} onRemove={clearImage} onError={setError} />
              <p className="banner-image-hint">ใช้รูปเดียวกันทั้งมือถือและคอมพิวเตอร์</p>
            </section>

            {error && <p className="banner-inline-error" role="alert">{error}</p>}
            <div className="banner-form-footer">
              {editing && <button className="banner-danger-text-button" type="button" onClick={() => void removeCurrentBanner()} disabled={saving || deleting}><Trash2 size={16} />ลบแบนเนอร์</button>}
              <div className="banner-form-actions"><button className="banner-secondary-button" type="button" onClick={() => navigate('/admin/banners')} disabled={saving || deleting}>ยกเลิก</button><button className="banner-primary-button" type="submit" disabled={saving || deleting}>{saving ? <LoaderCircle className="is-spinning" size={16} /> : null}บันทึก</button></div>
            </div>
          </form>}
    </main>
  </AdminOrderShell>;
}
