---
title: "Visual Design Specifications: Cloud Accounting & Operational ERP System"
project: "Mohamed Ramadan Group"
version: "1.0"
status: "final"
created: "2026-11-22"
updated: "2026-11-22"
tokens:
  colors:
    primary: "#0F172A"       # Deep Slate Navy
    primary_hover: "#1E293B"
    secondary: "#1E293B"     # Dark Slate
    accent: "#D97706"        # Saudi Gold
    accent_hover: "#B45309"
    success: "#059669"       # Saudi Emerald Green
    warning: "#D97706"       # Amber
    danger: "#DC2626"        # Crimson Red
    background: "#F8FAFC"    # Crisp Cool Gray
    surface: "#FFFFFF"       # Pure White
    text_primary: "#0F172A"
    text_secondary: "#64748B"
    border: "#E2E8F0"
  typography:
    font_family_arabic: "'Cairo', 'Tajawal', sans-serif"
    font_family_english: "Inter, system-ui, sans-serif"
    font_size_xs: "0.75rem"
    font_size_sm: "0.875rem"
    font_size_base: "1.0rem"
    font_size_lg: "1.125rem"
    font_size_xl: "1.25rem"
    font_size_2xl: "1.5rem"
    font_size_3xl: "1.875rem"
  spacing:
    container_padding: "1.5rem"
    card_gap: "1.0rem"
    form_group_gap: "1.25rem"
  rounded:
    sm: "0.25rem"
    md: "0.5rem"
    lg: "0.75rem"
    full: "9999px"
---

# Visual Design Specification (DESIGN.md)
## Cloud Accounting & Operational ERP System (Mohamed Ramadan Group)

### 1. Brand & Visual Identity
- **Personality**: Authoritative, Trustworthy, Modern Saudi Enterprise, Disciplined.
- **Palette Inspiration**: Corporate Financial Navy (`#0F172A`) paired with Saudi Heritage Gold (`#D97706`) and Compliance Emerald (`#059669`).
- **Surface Elevation**: Subtle cards with soft borders (`#E2E8F0`) and discrete elevation shadows (`shadow-sm` to `shadow-md`), eliminating visual clutter for accounting precision.

### 2. Typography & RTL Dynamics
- **Arabic Typography**: Primary typography driven by Google Fonts Cairo/Tajawal with complete Arabic ligature rendering, optical numbers, and optimized tabular figures (`font-variant-numeric: tabular-nums`).
- **English Typography**: Inter / system-ui for crisp alphanumeric display on transaction codes and balance grids.
- **Directional Switching**: Seamless switching between `<html dir="rtl" lang="ar">` and `<html dir="ltr" lang="en">` with logical CSS attributes (`padding-inline`, `margin-inline`, `start`, `end`).

### 3. Component Visual Library
- **Status Badges**:
  - `active` / `approved` / `paid` / `rented`: Emerald background (`#ECFDF5`), Emerald text (`#059669`).
  - `draft` / `pending`: Amber background (`#FEF3C7`), Amber text (`#D97706`).
  - `frozen` / `rejected` / `overdue`: Crimson background (`#FEE2E2`), Crimson text (`#DC2626`).
  - `maintenance` / `partially_paid`: Slate background (`#F1F5F9`), Slate text (`#475569`).
- **Data Tables**:
  - Dense accounting rows (`py-2.5 px-4`), alternating zebra rows for readability, sticky header with slate background (`#F8FAFC`).
  - Right-aligned monetary figures in RTL (`text-left` in LTR) with fixed two-decimal precision (`0.00`).
- **Buttons & Call-to-Actions**:
  - Primary Action (Approve / Save): Deep Navy (`#0F172A`) with white text and gold hover ring.
  - Secondary Action (Cancel / Back): Light Slate outline.
  - Destructive Action (Reject / Freeze): Crimson red (`#DC2626`).

