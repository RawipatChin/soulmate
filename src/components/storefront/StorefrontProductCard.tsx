import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Product } from '../../types/product';

export type StorefrontProductCardVariant = 'home' | 'catalog-grid' | 'catalog-list' | 'related';

export type StorefrontProductCardPricing = {
  regularPrice: number;
  specialPrice: number | null;
  sellingPrice: number;
  hasSpecialPrice: boolean;
};

export type StorefrontProductCardProps = {
  product: Product;
  imageUrl: string | null;
  pricing: StorefrontProductCardPricing;
  variant: StorefrontProductCardVariant;
  index?: number;
};

function ProductImage({ product, imageUrl, variant }: StorefrontProductCardProps) {
  const imageContainerClass = {
    home: 'relative w-full aspect-square bg-surface-container-low overflow-hidden flex items-center justify-center',
    'catalog-grid': 'relative w-full aspect-square rounded-xl bg-surface-container-low overflow-hidden mb-2.5 flex items-center justify-center',
    'catalog-list': 'relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-surface-container-low',
    related: 'relative mb-3 aspect-square w-full overflow-hidden rounded-lg bg-surface-container-low',
  }[variant];

  return (
    <div className={`storefront-product-card__image ${imageContainerClass}`}>
      {imageUrl ? (
        <>
          <img alt={product.name} className="h-full w-full object-cover" data-storefront-product-image src={imageUrl} />
          <div className="storefront-product-card__image-empty hidden absolute inset-0 flex-col items-center justify-center text-on-surface-variant" aria-label="ยังไม่มีรูปสินค้า">
            <span aria-hidden="true" className="material-symbols-outlined">image_not_supported</span>
            {variant === 'home' && <span>ยังไม่มีรูปสินค้า</span>}
          </div>
        </>
      ) : (
        <div className="storefront-product-card__image-empty flex h-full w-full flex-col items-center justify-center text-on-surface-variant" aria-label="ยังไม่มีรูปสินค้า">
          <span aria-hidden="true" className="material-symbols-outlined">image_not_supported</span>
          {variant === 'home' && <span>ยังไม่มีรูปสินค้า</span>}
        </div>
      )}
    </div>
  );
}

function ProductPrice({ pricing, variant }: Pick<StorefrontProductCardProps, 'pricing' | 'variant'>) {
  const regularPrice = `฿${pricing.regularPrice.toLocaleString('th-TH')}`;
  const sellingPrice = `฿${pricing.sellingPrice.toLocaleString('th-TH')}`;

  if (variant === 'related') return null;

  if (variant === 'home') {
    return (
      <div className="min-w-0">
        {pricing.hasSpecialPrice && pricing.specialPrice !== null && (
          <div className="text-[11px] text-on-surface-variant line-through leading-tight">
            ฿{pricing.regularPrice.toLocaleString('th-TH')}
          </div>
        )}
        <div className="text-base font-bold text-tertiary leading-tight mt-0.5">{sellingPrice}</div>
      </div>
    );
  }

  if (variant === 'catalog-grid') {
    return (
      <div className="flex items-baseline gap-1.5 flex-wrap">
        {pricing.hasSpecialPrice && pricing.specialPrice !== null && (
          <span className="text-[12px] text-on-surface-variant line-through">{regularPrice}</span>
        )}
        <span className={`font-headline-sm text-base ${pricing.hasSpecialPrice ? 'text-tertiary' : 'text-primary'} font-bold`}>
          {sellingPrice}
        </span>
      </div>
    );
  }

  return <div className="font-bold text-primary">{sellingPrice}</div>;
}

function AddToCartButton({ product, imageUrl, pricing, variant, index }: StorefrontProductCardProps) {
  if (variant === 'related') return null;

  if (variant === 'home') {
    return (
      <button
        aria-label={`เพิ่ม ${product.name} ลงตะกร้า`}
        className="real-home-add-cart w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center flex-shrink-0"
        data-product-index={index}
        type="button"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-[20px]">add</span>
      </button>
    );
  }

  return (
    <button
      className={variant === 'catalog-list'
        ? 'rounded-full bg-primary-container p-2 text-on-primary-container'
        : 'w-9 h-9 rounded-full bg-primary-container text-on-primary-container hover:bg-primary hover:text-on-primary flex items-center justify-center transition-colors active:scale-90'}
      data-action="add-to-cart"
      data-product-id={product.id}
      data-product-img={imageUrl || ''}
      data-product-name={product.name}
      data-product-price={pricing.sellingPrice}
      title="เพิ่มลงตะกร้า"
      type="button"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
    </button>
  );
}

export function StorefrontProductCard({
  product,
  imageUrl,
  pricing,
  variant,
  index,
}: StorefrontProductCardProps) {
  const slug = product.slug || product.id;
  const cardBaseClass = 'storefront-product-card border border-outline-variant/40';

  if (variant === 'related') {
    return (
      <a className={`${cardBaseClass} storefront-product-card--related block rounded-xl bg-surface-container-lowest p-3 transition-colors hover:border-primary/40`} href={`/products/${encodeURIComponent(slug)}`}>
        <ProductImage imageUrl={imageUrl} pricing={pricing} product={product} variant={variant} />
        <span className="line-clamp-2 font-semibold">{product.name}</span>
      </a>
    );
  }

  if (variant === 'catalog-list') {
    return (
      <article className={`${cardBaseClass} storefront-product-card--catalog-list flex items-center gap-3 rounded-xl bg-surface-container-lowest p-3 shadow-xs`}>
        <div className="storefront-product-card__list-link flex min-w-0 flex-1 cursor-pointer items-center gap-3" data-action="view-product" data-slug={slug}>
          <ProductImage imageUrl={imageUrl} pricing={pricing} product={product} variant={variant} />
          <div className="min-w-0">
            <h3 className="font-semibold text-on-surface line-clamp-2">{product.name}</h3>
            <p className="font-bold text-primary">฿{pricing.sellingPrice.toLocaleString('th-TH')}</p>
          </div>
        </div>
        <AddToCartButton imageUrl={imageUrl} pricing={pricing} product={product} variant={variant} />
      </article>
    );
  }

  if (variant === 'home') {
    return (
      <article
        aria-label={`ดูรายละเอียด ${product.name}`}
        className={`${cardBaseClass} storefront-product-card--home real-home-product-card group bg-white rounded-2xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.99] transition-transform`}
        data-product-id={product.id}
        data-product-index={index}
        role="button"
        tabIndex={0}
      >
        <ProductImage imageUrl={imageUrl} pricing={pricing} product={product} variant={variant} />
        <div className="p-3">
          <h3 className="text-sm font-semibold text-on-surface leading-snug line-clamp-2 min-h-[40px]">{product.name}</h3>
          <div className="mt-2 flex items-end justify-between gap-2">
            <ProductPrice pricing={pricing} variant={variant} />
            <AddToCartButton imageUrl={imageUrl} pricing={pricing} product={product} variant={variant} index={index} />
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`${cardBaseClass} storefront-product-card--catalog-grid bg-surface-container-lowest rounded-2xl p-3 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all`} data-product-slug={slug}>
      <div className="cursor-pointer group" data-action="view-product" data-slug={slug}>
        <ProductImage imageUrl={imageUrl} pricing={pricing} product={product} variant={variant} />
        <span className="font-label-sm text-[11px] text-primary font-semibold uppercase tracking-wider">SOULMATE</span>
        <h3 className="font-headline-sm text-sm text-on-surface font-semibold line-clamp-2 mt-0.5 leading-snug">{product.name}</h3>
      </div>
      <div className="mt-2.5 pt-2 border-t border-surface-container-low flex items-center justify-between">
        <ProductPrice pricing={pricing} variant={variant} />
        <AddToCartButton imageUrl={imageUrl} pricing={pricing} product={product} variant={variant} />
      </div>
    </article>
  );
}

export function renderStorefrontProductCard(props: StorefrontProductCardProps): string {
  return renderToStaticMarkup(<StorefrontProductCard {...props} />);
}
