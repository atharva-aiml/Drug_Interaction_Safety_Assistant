# Design System — Drug Interaction Safety Assistant

## 1. Color Tokens

### Neutrals & Surfaces

| Token | Hex | Used for |
|-------|-----|----------|
| `color-bg-page` | `#F8FAFC` | Page background |
| `color-bg-surface` | `#FFFFFF` | Cards, panels, modals |
| `color-bg-surface-sunken` | `#F1F5F9` | Nested/inset sections (e.g., path detail inside a card) |
| `color-bg-overlay` | `rgba(15, 23, 42, 0.5)` | Modal/drawer backdrop |
| `color-border-default` | `#E2E8F0` | Default card/input borders, dividers |
| `color-border-strong` | `#CBD5E1` | Emphasized borders (focused containers, active tabs) |
| `color-text-primary` | `#0F172A` | Body text, headings |
| `color-text-secondary` | `#475569` | Secondary/supporting text, labels |
| `color-text-disabled` | `#94A3B8` | Disabled text, placeholder text |
| `color-text-inverse` | `#FFFFFF` | Text on dark/filled backgrounds (e.g., primary buttons) |

### Brand / Action

| Token | Hex | Used for |
|-------|-----|----------|
| `color-action-default` | `#1D4ED8` | Primary button background, active nav item, links |
| `color-action-hover` | `#1E40AF` | Primary button hover |
| `color-action-active` | `#1E3A8A` | Primary button pressed |
| `color-action-subtle-bg` | `#DBEAFE` | Secondary button / selected-row background |

### Semantic States

| Token | Hex | Used for |
|-------|-----|----------|
| `color-success` | `#16A34A` | Success text/icon (e.g., "Import complete") |
| `color-success-bg` | `#DCFCE7` | Success banner/toast background |
| `color-warning` | `#D97706` | Warning text/icon |
| `color-warning-bg` | `#FEF3C7` | Warning banner/toast background |
| `color-error` | `#DC2626` | Error text/icon, invalid input border |
| `color-error-bg` | `#FEE2E2` | Error banner/toast background |
| `color-info` | `#2563EB` | Informational text/icon |
| `color-info-bg` | `#DBEAFE` | Informational banner/toast background |

### Risk Severity Scale (domain-specific — REQ-003, REQ-015)

A fixed 4-step scale, distinct from the generic semantic colors above so a severity badge is never confused with a form-validation state. Ordered low → high; color alone is never the only signal — every severity badge also carries a text label ("Minor", "Moderate", "Severe", "Contraindicated") so the distinction holds for colorblind users (WCAG 1.4.1).

| Token | Hex | Used for |
|-------|-----|----------|
| `color-severity-minor` | `#65A30D` | Minor-severity badge/edge |
| `color-severity-moderate` | `#D97706` | Moderate-severity badge/edge |
| `color-severity-severe` | `#EA580C` | Severe-severity badge/edge |
| `color-severity-contraindicated` | `#B91C1C` | Contraindicated badge/edge |

### Graph Node Categorical Colors (SCR-004, SCR-006)

Five entity types, chosen for hue separation rather than severity meaning. As with severity, node color is always paired with a shape/label in the legend — never the sole differentiator.

| Token | Hex | Used for |
|-------|-----|----------|
| `color-node-patient` | `#7C3AED` | Patient node fill |
| `color-node-drug` | `#2563EB` | Drug node fill |
| `color-node-disease` | `#DB2777` | Disease/condition node fill |
| `color-node-allergen` | `#CA8A04` | Allergen/ingredient node fill |
| `color-node-side-effect` | `#0D9488` | Side-effect node fill |

## 2. Typography

- **UI text:** Inter (system fallback: `-apple-system, "Segoe UI", Roboto, sans-serif`) — used for all body copy, labels, navigation.
- **Headings/display:** Inter, same family, distinguished by weight (600/700) and size rather than a separate typeface — keeps the clinical UI visually calm and avoids a second font-loading cost.
- **Monospace/data:** `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace` — used for drug IDs, raw relationship-path node lists, and the relational-query comparison panel (SCR-006).

### Type Scale (fixed)

| Token | Size | Line height | Typical use |
|-------|------|-------------|-------------|
| `font-size-xs` | 12px / 0.75rem | 1.4 | Badge text, timestamps, helper text |
| `font-size-sm` | 14px / 0.875rem | 1.5 | Secondary text, table cells, input text |
| `font-size-base` | 16px / 1rem | 1.5 | Body copy, default UI text |
| `font-size-lg` | 18px / 1.125rem | 1.5 | Card titles, emphasized body text |
| `font-size-xl` | 20px / 1.25rem | 1.4 | Section headings |
| `font-size-2xl` | 24px / 1.5rem | 1.3 | Screen titles |
| `font-size-3xl` | 30px / 1.875rem | 1.2 | Dashboard summary numbers |
| `font-size-4xl` | 36px / 2.25rem | 1.15 | Rare — top-level landing emphasis only |

Font weights used: `400` (regular, body), `500` (medium, labels/emphasis), `600` (semibold, headings/card titles), `700` (bold, screen titles only).

## 3. Spacing Scale

Fixed 4px base unit; no off-scale values permitted in component styling.

| Token | Value |
|-------|-------|
| `space-0` | 0px |
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-12` | 48px |
| `space-16` | 64px |
| `space-24` | 96px |

## 4. Core Components

### Button — Primary

- **Default:** bg `color-action-default`, text `color-text-inverse`, no border, `space-2` `space-4` padding, `font-size-sm` / weight 500, corner radius 6px.
- **Hover:** bg `color-action-hover`.
- **Focus:** 2px outline in `color-action-default` offset 2px (visible over the hover/default bg), no bg change beyond hover if also hovered.
- **Active/pressed:** bg `color-action-active`.
- **Disabled:** bg `color-border-default`, text `color-text-disabled`, cursor not-allowed, no hover/focus effect.
- **Error (rare — e.g., "Retry failed import"):** bg `color-error`, text `color-text-inverse`, hover darkens 10%.

### Button — Secondary

- **Default:** bg `color-bg-surface`, text `color-action-default`, 1px border `color-border-strong`.
- **Hover:** bg `color-action-subtle-bg`.
- **Focus:** 2px outline `color-action-default` offset 2px.
- **Disabled:** text `color-text-disabled`, border `color-border-default`, bg unchanged.

### Form Input (text field, select, autocomplete — used heavily in SCR-005)

- **Default:** bg `color-bg-surface`, border 1px `color-border-default`, text `color-text-primary`, `space-2` `space-3` padding, radius 6px.
- **Hover:** border `color-border-strong`.
- **Focus:** border `color-action-default`, 2px outer glow `color-action-subtle-bg`.
- **Disabled:** bg `color-bg-surface-sunken`, text `color-text-disabled`, border `color-border-default`, no hover effect.
- **Error** (e.g., "drug not found in graph" — business rule violation): border `color-error`, helper text below in `color-error` at `font-size-xs`, icon (⚠) inline at field end.
- **Valid/confirmed** (autocomplete match found): border briefly flashes `color-success`, then returns to default border on blur.

### Card (risk card, patient card, dataset preview row)

- **Default:** bg `color-bg-surface`, border 1px `color-border-default`, radius 8px, padding `space-4`, shadow: `0 1px 2px rgba(15,23,42,0.06)`.
- **Hover** (when clickable, e.g., a risk row leading to SCR-003): border `color-border-strong`, shadow `0 2px 8px rgba(15,23,42,0.08)`.
- **Focus** (keyboard nav onto a clickable card): 2px outline `color-action-default` offset 2px.
- **Disabled** (e.g., a risk card during a background recheck): opacity 0.6, no hover/focus effect, cursor default.
- **Error variant** (e.g., a card reporting a failed sub-query): left border 4px `color-error`, bg tint `color-error-bg` at 30% opacity over `color-bg-surface`.

### Badge (severity, status)

- **Shape:** pill, `space-1` `space-2` padding, `font-size-xs` weight 500, radius 999px.
- **Severity variants:** bg = severity token at 15% opacity tint, text = full-opacity severity token (e.g., moderate badge: bg `#D97706` at 15%, text `#D97706`). Always paired with the severity word as the badge label, never color/icon alone.
- **Status variants** (e.g., query log "success"/"failed"): use `color-success`/`color-error` with the same tint pattern.
- **Disabled/pending** (e.g., "checking…" badge while a recheck runs): bg `color-bg-surface-sunken`, text `color-text-secondary`, no tint.

### Navigation (top-level nav bar)

- **Default item:** text `color-text-secondary`, `font-size-sm` weight 500, no background.
- **Hover:** text `color-text-primary`, bg `color-bg-surface-sunken`.
- **Active/current screen:** text `color-action-default`, bg `color-action-subtle-bg`, weight 600, left/bottom indicator bar 2px `color-action-default`.
- **Focus (keyboard):** 2px outline `color-action-default` offset 2px, same as interactive elements elsewhere.
- **Disabled** (e.g., Data Import hidden/disabled for non-admin roles): not rendered at all rather than shown disabled — role-gated nav items are omitted, not grayed out, per REQ-scope (no partial-access confusion in a demo tool).

## 5. CSS Custom Properties

```css
:root {
  /* Color — neutrals & surfaces */
  --color-bg-page: #F8FAFC;
  --color-bg-surface: #FFFFFF;
  --color-bg-surface-sunken: #F1F5F9;
  --color-bg-overlay: rgba(15, 23, 42, 0.5);
  --color-border-default: #E2E8F0;
  --color-border-strong: #CBD5E1;
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-disabled: #94A3B8;
  --color-text-inverse: #FFFFFF;

  /* Color — brand / action */
  --color-action-default: #1D4ED8;
  --color-action-hover: #1E40AF;
  --color-action-active: #1E3A8A;
  --color-action-subtle-bg: #DBEAFE;

  /* Color — semantic states */
  --color-success: #16A34A;
  --color-success-bg: #DCFCE7;
  --color-warning: #D97706;
  --color-warning-bg: #FEF3C7;
  --color-error: #DC2626;
  --color-error-bg: #FEE2E2;
  --color-info: #2563EB;
  --color-info-bg: #DBEAFE;

  /* Color — risk severity scale */
  --color-severity-minor: #65A30D;
  --color-severity-moderate: #D97706;
  --color-severity-severe: #EA580C;
  --color-severity-contraindicated: #B91C1C;

  /* Color — graph node categories */
  --color-node-patient: #7C3AED;
  --color-node-drug: #2563EB;
  --color-node-disease: #DB2777;
  --color-node-allergen: #CA8A04;
  --color-node-side-effect: #0D9488;

  /* Typography */
  --font-family-ui: Inter, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-family-heading: Inter, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-family-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;

  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;

  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.6;

  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Spacing */
  --space-0: 0px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;

  /* Component — radius & shadow */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-pill: 999px;
  --shadow-card: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-card-hover: 0 2px 8px rgba(15, 23, 42, 0.08);
  --focus-ring: 0 0 0 2px var(--color-action-default);
}
```
