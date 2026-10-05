---
name: Modern Botanical Wellness
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#404945'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#707975'
  outline-variant: '#bfc9c3'
  surface-tint: '#2d6857'
  primary: '#2d6857'
  on-primary: '#ffffff'
  primary-container: '#a8e5cf'
  on-primary-container: '#2d6857'
  inverse-primary: '#96d3bd'
  secondary: '#53615d'
  on-secondary: '#ffffff'
  secondary-container: '#d6e6e0'
  on-secondary-container: '#596763'
  tertiary: '#9e3675'
  on-tertiary: '#ffffff'
  tertiary-container: '#ffcae2'
  on-tertiary-container: '#9e3675'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b2efd9'
  primary-fixed-dim: '#96d3bd'
  on-primary-fixed: '#002118'
  on-primary-fixed-variant: '#0f5040'
  secondary-fixed: '#d6e6e0'
  secondary-fixed-dim: '#bacac4'
  on-secondary-fixed: '#101e1b'
  on-secondary-fixed-variant: '#3b4a46'
  tertiary-fixed: '#ffd8e8'
  tertiary-fixed-dim: '#ffafd6'
  on-tertiary-fixed: '#3c0028'
  on-tertiary-fixed-variant: '#811c5c'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-sm: 0.75rem
  margin: 1rem
  margin-md: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style
The design system embodies a calm, luminous, and refined approach to everyday health and beauty supplements. Rooted in the visual clarity of modern holistic wellness, the interface balances clinical efficacy with tactile warmth. 

Visual characteristics prioritize airy compositions, gentle organic curvature, crisp micro-borders, and tactile clarity. The aesthetic fuses Japanese botanical minimalism with modern mobile commerce conventions: soft mint-bathed base surfaces paired with an authoritative, energetic berry accent for high-intent conversion actions. The interface avoids aggressive gradients, skeletal clutter, and dense visual noise, creating an atmosphere that feels restorative, approachable, and premium.

## Colors
The color palette establishes a refreshing, trustworthy visual rhythm optimized for health, beauty, and supplement commerce.

- **Primary Mint Green (`#A8E5CF`):** Serves as the soothing, botanical baseline. Used for high-level brand touchpoints, subtle badge backings, active category pills, and restorative visual accents.
- **Secondary Soft Mint (`#E8F8F2`):** A soft, luminous surface tint. Used as container backdrops, banner canvases, and gentle state shifts that distinguish modules from base white.
- **CTA / Accent Pink (`#CA5A9A`):** The primary conversion anchor. Applied deliberately to high-priority interactive components—Add to Cart triggers, checkout actions, active notification badges, and sale highlights—to guarantee AA compliance and prompt user focus.
- **Neutral Charcoal Black (`#1A1A1A`):** The definitive primary typographic tone, delivering crisp readability for Thai and Latin character sets against both pure white and soft mint surfaces.
- **Secondary Gray (`#71717A`):** Used for supporting metadata, input hints, category taxonomy labels, and inactive navigation states.
- **Border / Divider (`#E4E4E7`):** Fine, low-contrast structural boundaries for input outlines, dividers, and card borders.
- **Pure White Surface (`#FFFFFF`):** The foundation canvas for top navigation, sheet panels, sticky elements, and base viewports.
- **Card / Input Surface (`#F8FAFC`):** A cool, neutral background tint dedicated to embedded form fields, auxiliary tiles, and media placeholders.

## Typography
Typographic pairings unite the geometric, friendly warmth of **Plus Jakarta Sans** for headlines and brand titles with the neutral, systematic legibility of **Inter** for descriptions, microcopy, prices, and navigation labels. 

For Thai language integration, the system aligns seamlessly with humanist and sans-serif Thai fallbacks (`Prompt`, `Kanit`, and `Sarabun`). Line heights for Thai copy must maintain a 1.5x minimum multiplier across all body sizes to avoid vertical clipping of tonal accents, vowels, and diacritics. Headlines use deliberate negative tracking on Latin glyphs, while labels and metadata preserve neutral-to-slightly-open tracking to optimize legibility on small handheld screens.

## Layout & Spacing
The layout architecture is mobile-first, prioritizing one-handed thumb interaction within standard handheld bounds (375px to 428px viewports).

- **Grid Model:** Mobile viewports operate on a 4-column fluid layout with an outer canvas margin of `margin` (16px) and an inner gutter of `gutter-sm` (12px) for tight 2-column e-commerce product grids.
- **Tablet & Desktop Scaling:** At tablet breakpoints (768px), outer canvas margins expand to `margin-md` (24px) using an 8-column layout. Desktop viewports (1024px+) constrain the primary shopping interface to a centered container max-width of 1200px across 12 fluid columns with 24px gutters.
- **Spacing Rhythm:** Vertical spacing adheres strictly to an 8px modular baseline scale: micro-gaps within button icons and labels use `space-xs` (4px), form label margins use `space-sm` (8px), block padding uses `space-md` (16px), and major content section dividers use `space-lg` (24px) or `space-xl` (40px).
- **Navigation Insets:** Mobile screens allocate an unobstructed bottom safe area padding of 64px to accommodate the sticky 4-item bottom navigation bar without obscuring footer content.

## Elevation & Depth
Depth is articulated primarily through **tonal layering** and **crisp, low-contrast structural outlines**, intentionally avoiding murky drop shadows or heavy blur diffusion.

- **Flat Tonal Hierarchy:** Base backgrounds exist on `#FFFFFF`. Secondary container modules, informational cards, and promotional containers adopt `#F8FAFC` or `#E8F8F2`.
- **Low-Contrast Outlines:** Visual separation relies on 1px solid borders rendered in `#E4E4E7`. Cards, floating inputs, and sticky headers use these clean outlines to define spatial edges.
- **Ambient Micro-Elevation:** When components physically elevate—such as the sticky bottom navigation bar or floating action drawers—they use an ultra-diffused, tinted shadow: `0px 8px 24px rgba(26, 26, 26, 0.04), 0px 1px 2px rgba(26, 26, 26, 0.02)`.
- **Modals & Overlays:** Backdrop dimming uses a tranquil translucent veil: `rgba(26, 26, 26, 0.35)` with an optional subtle blur (`backdrop-filter: blur(4px)`) to keep user focus pinned on the top sheet or navigation drawer.

## Shapes
The design system adopts a **Rounded (Level 2)** shape vocabulary, reinforcing a welcoming, gentle, and ergonomic tactile profile.

- **Inputs, Buttons, and Search Bars:** Standard inputs, search fields, chips, and primary buttons use fully rounded pill contours (9999px / full radius) or high radii (12px - 16px) to maximize touchability.
- **Product Cards and Surfaces:** Core e-commerce cards, promotional banners, and modal dialogs adopt an outer corner radius of `16px` (`rounded-lg`), with nested interactive inner elements respecting an `8px` or `12px` curve.
- **Indicator Badges & Avatars:** Badges, notification counters, and icon enclosures maintain absolute circle geometry (50% border radius).

## Components

### App Header & Navigation
- **Mobile App Header:** Fixed 56px height, `#FFFFFF` surface with a bottom border in `#E4E4E7`. Composed of:
  - Left: 24px icon button (hamburger menu trigger).
  - Center: Wordmark logo set in `Plus Jakarta Sans` bold, uppercase, tracked, `#1A1A1A`.
  - Right: Account profile icon button paired beside a cart icon button featuring a floating circular badge in `#CA5A9A` (`label-sm`, white text) initialized to `0`.
- **Search Bar:** Pill-shaped (`rounded-full`), height 44px. Background `#F8FAFC`, border 1px solid `#E4E4E7`. Left-aligned magnifying icon in `#71717A`, Thai placeholder text reading `"ค้นหาสินค้า..."` rendered in `body-md` `#71717A`.
- **Sticky Bottom Navigation:** Fixed 60px mobile tab bar anchored to the bottom edge, background `#FFFFFF` with top border `#E4E4E7`. 4 equidistant tab items: **Home (หน้าแรก)**, **Shop (สินค้า)**, **Cart (ตะกร้า)**, **Account (บัญชี)**. Active tab features `#CA5A9A` icon and label; inactive tabs display `#71717A`.
- **Drawer Menu (Slide-out Navigation):** 280px to 320px width sliding panel from the left. Contains user greeting header, category list with chevron indicators, language toggle (TH/EN), and store information links.

### Buttons & Conversion Elements
- **Primary CTA Button:** Solid `#CA5A9A` background, white text (`label-lg`), minimum touch target height 48px, rounded 12px or full pill. Active and pressed states shift to a deeper berry (`#B34985`).
- **Secondary / Soft Button:** Solid `#E8F8F2` background, `#1A1A1A` text with subtle `#A8E5CF` border, 48px height.
- **Outline / Ghost Button:** Transparent background, 1px solid `#E4E4E7`, `#1A1A1A` text.

### Product Grid & Cards
- **2-Column Product Grid:** 2-column mobile layout with 12px horizontal and 16px vertical gap.
- **Product Card:** Surface `#FFFFFF`, 1px solid `#E4E4E7`, rounded 16px, overflow hidden.
  - Media Area: 1:1 square ratio container filled with `#F8FAFC` for supplement photography or clean placeholder imagery.
  - Content Area: 12px padding containing brand/category tag (`label-sm`, `#71717A`), title (`headline-sm`, 2-line clamp, `#1A1A1A`), price (`headline-sm`, `#1A1A1A`), and a quick Add-to-Cart pill button (`#E8F8F2` background with `#CA5A9A` icon or text).

### Promotional Hero Banner
- **Hero Module:** Responsive container with soft corner radius (`rounded-lg`), background styled in `#E8F8F2` with organic mint `#A8E5CF` geometric flourishes. Includes headline, supporting Thai wellness value proposition, and an accent CTA button.

### Form Inputs & Selection Controls
- **Input Fields:** 48px height, background `#F8FAFC`, border 1px solid `#E4E4E7`, rounded 12px, font `body-md` in `#1A1A1A`. Focus state replaces border with `#CA5A9A` at 1.5px thickness.
- **Selection Controls:** Checkboxes and radio buttons use `#CA5A9A` as the active fill color with crisp white checkmark glyphs, outlined by `#E4E4E7` when unselected.

### Zero-Data & Empty States
- **Graceful Empty State Container:** Centered vertical layout with 40px top and bottom padding. Features an outline botanical or shopping bag icon in `#71717A`, followed by primary message `"ยังไม่มีสินค้า"` (`headline-md`, `#1A1A1A`) and reassuring secondary caption `"สินค้าจะถูกเพิ่มเร็ว ๆ นี้"` (`body-md`, `#71717A`). Includes a soft button directing users back to the home view.