# MIP Design System

## Brand
Use the existing MIP Cargo Express logo. Product name: **MIP Pricing OS**. Descriptor: **Commercial Operations**.

## Visual character
- Bright layered background
- Frosted, translucent work surfaces
- Strong hierarchy and generous spacing
- Rounded geometry with restrained shadows
- Subtle, purposeful motion
- Operational status colors used consistently

## Color roles
- Primary action: deep slate / MIP blue
- Information and links: blue
- Vendor and RFQ workflows: violet
- Success and accepted: green
- Waiting and attention: amber
- Error and rejected: red
- Neutral content: slate

## Typography
Use Inter with system-font fallbacks. Headings use tight letter spacing. Body copy must remain readable at mobile sizes. Labels and eyebrow text use uppercase sparingly.

## Spacing
Use a 4px base scale. Common spacing values: 8, 12, 16, 20, 24, 32, 40, 48.

## Radius
- Small controls: 12–14px
- Buttons and inputs: 14–16px
- Cards: 22–28px
- Floating navigation and major panels: 24–32px

## Components
Every module should reuse shared primitives:
- Button: primary, secondary, ghost, danger
- GlassCard
- StatusBadge
- SearchField
- EmptyState
- Skeleton
- Drawer
- Modal / bottom sheet
- FloatingActionBar
- AppShell

## Interaction rules
- Primary action remains visible when practical.
- Mobile controls must be thumb-friendly, generally at least 44px tall.
- Hover is supplemental; no workflow may depend on hover.
- Buttons visibly compress on press.
- Drawers slide; content fades or shifts subtly.
- Loading uses skeletons instead of blank screens.
- Archive and destructive actions require confirmation or undo.

## Tables and lists
Lists should be scannable, responsive, and open details without losing context. Use cards on narrow screens and structured rows on desktop.

## Status language
Use the same labels and colors across requests, RFQs, and quotes. Do not invent new colors per page.

## Accessibility
- Maintain keyboard focus visibility.
- Use semantic buttons and links.
- Preserve sufficient contrast on translucent surfaces.
- Do not communicate status by color alone.
- Respect reduced-motion preferences.

## Rule
No production page may introduce a new visual primitive when an existing shared component can perform the same role.