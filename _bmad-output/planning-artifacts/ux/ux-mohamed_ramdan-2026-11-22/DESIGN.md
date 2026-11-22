---
title: "Visual Design System (DESIGN.md): Cloud Accounting & Operational ERP System"
status: final
created: "2026-11-22"
updated: "2026-11-22"
project_name: "mohamed_ramdan"
version: "1.0"
design_tokens:
  colors:
    primary:
      default: "#0F766E" # Deep Emerald / Teal enterprise
      hover: "#115E59"
      active: "#134E4A"
      surface: "#F0FDFA"
      border: "#99F6E4"
    secondary:
      default: "#1E293B" # Dark Slate
      hover: "#334155"
      surface: "#F8FAFC"
      border: "#CBD5E1"
    danger:
      default: "#DC2626" # Crimson
      hover: "#B91C1C"
      surface: "#FEF2F2"
      border: "#FECACA"
    warning:
      default: "#D97706" # Amber
      hover: "#B45309"
      surface: "#FFFBEB"
      border: "#FDE68A"
    success:
      default: "#16A34A" # Forest Green
      hover: "#15803D"
      surface: "#F0FDF4"
      border: "#BBF7D0"
    neutral:
      background: "#F8FAFC"
      surface: "#FFFFFF"
      border: "#E2E8F0"
      text_primary: "#0F172A"
      text_secondary: "#475569"
      text_muted: "#94A3B8"
  typography:
    font_family_arabic: "'Cairo', 'Tajawal', sans-serif"
    font_family_english: "'Inter', system-ui, -apple-system, sans-serif"
    font_sizes:
      xs: "0.75rem"   # 12px
      sm: "0.875rem"  # 14px
      base: "1.0rem"   # 16px
      lg: "1.125rem"  # 18px
      xl: "1.25rem"   # 20px
      "2xl": "1.5rem" # 24px
      "3xl": "1.875rem" # 30px
  spacing:
    unit: "4px"
    xs: "4px"
    sm: "8px"
    md: "16px"
    lg: "24px"
    xl: "32px"
    "2xl": "48px"
  rounded:
    sm: "4px"
    md: "8px"
    lg: "12px"
    full: "9999px"
---

# Visual Design System (DESIGN.md)
## Cloud Accounting & Operational ERP System (Mohamed Ramadan Group)

### 1. Brand & Style Principles
- **Executive & Authoritative**: Clean, trustworthy, high-density enterprise accounting look with deep teal (`#0F766E`) and slate blue accents.
- **RTL-Native First**: Built from the ground up for Arabic Right-to-Left (RTL) reading flow, mirrored margins, and natural typographical hierarchy.
- **High Data Density & Scannability**: Financial tables, tree views, and vouchers are optimized for rapid scanning, balanced contrast, and clear visual state distinctions.
- **Zero Ambiguity**: Clear color-coded indicators for financial balances (Debit vs. Credit), Maker-Checker approval statuses, and period locking badges.

---

### 2. Color Palette & Functional Mapping

| Token Name | Hex Code | Visual Swatch | Semantic Usage in ERP |
| :--- | :--- | :--- | :--- |
| `color.primary.default` | `#0F766E` | Emerald Teal | Primary CTAs, active navigation items, brand headers |
| `color.primary.surface` | `#F0FDFA` | Light Mint | Selected row highlight, active tab background |
| `color.secondary.default` | `#1E293B` | Dark Slate | Sidebar background, secondary action buttons |
| `color.neutral.background` | `#F8FAFC` | Off-white Gray | Main workspace background |
| `color.neutral.surface` | `#FFFFFF` | Pure White | Cards, modal sheets, data tables |
| `color.neutral.border` | `#E2E8F0` | Border Gray | Table cell borders, input field outlines |
| `color.danger.default` | `#DC2626` | Deep Red | Rejection badges, unbalanced alert, freeze company, delete |
| `color.warning.default` | `#D97706` | Amber Gold | Draft status badge, pending approval, overdue rent warning |
| `color.success.default` | `#16A34A` | Forest Green | Approved status badge, balanced indicator, active company |

---

### 3. Typography & Directional Layout
- **Arabic Typography**: Primary font `'Cairo', sans-serif` (Google Fonts). Display headers use 600 SemiBold and 700 Bold; body copy uses 400 Regular and 500 Medium.
- **English Typography**: Secondary font `'Inter', sans-serif` for LTR toggle.
- **Number Formatting**: Formatted with standard accounting thousands-separators (`1,250,000.00`) and clear currency denomination (SAR / ر.س).
- **RTL / LTR Transformation**:
  - The document root sets `dir="rtl"` by default; toggling language flips the DOM to `dir="ltr"`.
  - Margin, padding, and positioning utilize logical CSS properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`).

---

### 4. Layout, Grid & Elevation

- **8-Point Spacing Grid**: All margins, paddings, and card gaps align with multiples of 8px (`8px`, `16px`, `24px`, `32px`).
- **Elevation Layers**:
  - `elevation.base` (Tables & Cards): `box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05);`
  - `elevation.dropdown` (Menus & Popovers): `box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);`
  - `elevation.modal` (Dialogs & Confirmation Prompts): `box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.15);`

---

### 5. Reusable Component Specifications

#### 5.1 Buttons
- **Primary CTA (`.btn-primary`)**: Solid emerald fill (`#0F766E`), white text, `border-radius: 8px`, `height: 40px`, padding `0 20px`. Hover: `#115E59`.
- **Secondary Action (`.btn-secondary`)**: Slate border (`#CBD5E1`), dark text, pure white fill. Hover: `#F8FAFC`.
- **Destructive Action (`.btn-danger`)**: Solid crimson (`#DC2626`) for irreversible actions (Freeze Company, Delete, Close Fiscal Year).
- **Export Actions (`.btn-export-pdf`, `.btn-export-excel`)**:
  - PDF: Red accent icon, border button, text: *"طباعة PDF"*.
  - Excel: Green accent icon, border button, text: *"تصدير Excel (.xlsx)"*.

#### 5.2 Input Fields & Selects
- **Height**: 40px. Border: 1px solid `#CBD5E1`. Rounded: 8px.
- **Focus State**: `border-color: #0F766E; box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15); outline: none;`.
- **Error State**: `border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.15);`.
- **Inline Validation Error**: Red text `#DC2626`, font size 12px, placed directly below input with an alert icon.

#### 5.3 Badges (Status Pills)
- `Draft (مسودة)`: Background `#FFFBEB`, Text `#B45309`, Border `#FDE68A`.
- `Approved / Posted (معتمد / مرحّل)`: Background `#F0FDF4`, Text `#15803D`, Border `#BBF7D0`.
- `Rejected (مرفوض)`: Background `#FEF2F2`, Text `#B91C1C`, Border `#FECACA`.
- `Active (ساري / نشطة)`: Background `#F0FDF4`, Text `#15803D`.
- `Overdue (متأخر)`: Background `#FEF2F2`, Text `#DC2626`.
- `Pending Cancellation (طلب إلغاء معلق)`: Background `#FFFBEB`, Text `#D97706`.

#### 5.4 Data Tables
- **Header**: `#F1F5F9`, font weight 600, uppercase/prominent, text `#334155`, bottom border 2px solid `#CBD5E1`.
- **Rows**: Alternating subtle zebra striping (`#FFFFFF` and `#F8FAFC`). Hover highlight `#F0FDFA`.
- **Financial Alignment**: Numeric amounts strictly aligned to the right (in RTL) or right (in LTR) for columnar decimal alignment.

#### 5.5 Confirmation & Rejection Modals
- Backdrop overlay: `rgba(15, 23, 42, 0.5)` with backdrop-filter blur.
- Centered modal container, 480px width, rounded 12px, elevation high.
- Rejection modal includes required Text Area (`min-height: 90px`) with real-time character counter showing progress toward the mandatory 10-character minimum.

---

### 6. Do's and Don'ts

| Do | Don't |
| :--- | :--- |
| **Do** use right-aligned amounts and table cells for Arabic financial statements. | **Don't** center or left-align decimal currency figures in financial tables. |
| **Do** show explicit balance verification difference ($\text{Debit} - \text{Credit} = 0$) in green. | **Don't** enable the "Save & Post" button if the balance difference is non-zero. |
| **Do** force confirmation dialogs for all destructive/irreversible actions. | **Don't** execute Company Freeze or Fiscal Year Close on a single click without confirmation. |
| **Do** keep error messages strictly identical to SRS specifications. | **Don't** use generic English errors like "Server Error" in Arabic interfaces. |

