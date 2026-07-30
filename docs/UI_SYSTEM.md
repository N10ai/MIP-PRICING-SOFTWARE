# UI System

## Design character
MIP Pricing OS should feel premium, calm, precise, and operationally efficient. The visual language may take inspiration from modern Apple-style restraint, but it must remain practical for dense freight workflows.

The interface should communicate:
- Clarity
- Control
- Speed
- Trust
- Professionalism

## Permanent color identity
The core identity is **white, black, and blue**.

### Base colors
- Primary background: `#FFFFFF`
- Secondary background: `#F7F8FA`
- Elevated surface: `#FFFFFF`
- Primary text: `#0B0D10`
- Secondary text: `#5F6670`
- Muted text: `#8A929D`
- Border: `#E5E8EC`
- Strong border: `#D3D8DE`

### Blue accents
- Primary action blue: `#2563EB`
- Hover blue: `#1D4ED8`
- Active blue: `#1E40AF`
- Light blue surface: `#EFF6FF`
- Blue border: `#BFDBFE`
- Blue focus ring: `rgba(37, 99, 235, 0.28)`

### Semantic colors
Use semantic colors only for meaning:
- Success: green
- Warning or pending attention: amber
- Error or destructive action: red
- Neutral/inactive: gray

Do not use semantic colors decoratively. Do not add unrelated purple, teal, pink, or multicolor accents without an explicit product decision.

## Color usage rules
- White remains the dominant background and surface color.
- Black or near-black anchors typography, icons, headers, and structure.
- Blue indicates primary actions, links, selected navigation, focus, active controls, and AI-assisted guidance.
- Use no more than one visually dominant primary action per section.
- Selected states should use restrained blue surfaces or borders rather than large saturated blocks when possible.
- Dark mode must preserve the same black/white/blue identity rather than inventing a separate palette.

## Typography
Prefer the existing application font stack. Use hierarchy through size, weight, spacing, and contrast rather than many typefaces.

Recommended hierarchy:
- Page title: 28–32px, 650–700 weight
- Section title: 18–22px, 600–700 weight
- Card title: 15–17px, 600 weight
- Body: 14–16px, 400–500 weight
- Supporting text: 12–14px, 400–500 weight
- Table density may use 12–14px when readability remains strong

Avoid excessive uppercase. Use tabular numerals for rates, weights, dimensions, totals, and financial values where supported.

## Spacing and layout
Use a consistent spacing scale based on 4px increments:
`4, 8, 12, 16, 20, 24, 32, 40, 48`.

- Keep related fields visually grouped.
- Prefer generous page-level whitespace with compact operational controls.
- Avoid oversized cards that waste desktop space.
- Use responsive grids rather than fixed pixel layouts.
- On desktop, optimize for scanning and side-by-side work.
- On tablet and mobile, preserve workflow order and primary actions.

## Surfaces and containers
- Use white surfaces with subtle borders and restrained shadows.
- Typical radius: 10–16px.
- Use larger radii only for major panels, sheets, and prominent cards.
- Avoid heavy gradients, glowing elements, and excessive glass effects.
- Glass or backdrop blur may be used sparingly for floating navigation or overlays where readability remains excellent.

## Buttons
### Primary
- Blue background
- White text
- Used for the main action

### Secondary
- White or light neutral background
- Dark text
- Subtle border

### Tertiary
- Text or icon button
- Minimal surface treatment

### Destructive
- Red only for destructive intent
- Require confirmation when consequences are material

Button rules:
- Keep labels action-oriented.
- Maintain adequate touch targets.
- Include loading and disabled states.
- Do not use multiple equally prominent primary buttons in the same action group.

## Forms
- Group fields by user decision, not by database table.
- Prefer autocomplete and search for large option sets.
- Show validation close to the field.
- Preserve entered values after recoverable errors.
- Use progressive disclosure for advanced freight details.
- Use sensible defaults but never hide consequential assumptions.
- Autosave drafts where data loss would be costly; visibly show save status.

## Tables and operational lists
Freight workflows require information density. Tables should be compact but readable.

Where relevant, support:
- Sticky headers
- Sorting
- Filtering
- Search
- Column visibility
- Resizable columns
- Pagination or virtualization
- Inline editing when safe
- Bulk actions
- Export
- Keyboard navigation

Rules:
- Keep row actions predictable.
- Align numbers consistently.
- Make status and exceptions easy to scan.
- Avoid horizontal overflow on primary desktop widths; use responsive fallback strategies.
- Do not hide essential record identity when scrolling.

## Navigation
- Keep top-level modules stable.
- Indicate the active location with black structure and blue accent.
- Avoid deeply nested navigation when a workspace or contextual panel is clearer.
- Preserve user context when moving between related records.

## Feedback states
Every asynchronous action needs:
- Loading feedback
- Success confirmation where useful
- Actionable error feedback
- Retry or recovery path when possible

Use skeletons for content areas and compact spinners for localized actions. Avoid blocking the entire application for small updates.

## Empty states
An empty state should explain:
- What belongs here
- Why it is useful
- The most relevant next action

Do not use decorative emptiness that consumes excessive space.

## Motion
- Motion should clarify relationships and state changes.
- Typical duration: 120–220ms.
- Use easing that feels responsive, not playful.
- Respect reduced-motion preferences.
- Avoid animation that delays task completion.

## Accessibility
- Meet WCAG AA contrast for essential text and controls.
- Provide visible keyboard focus using the blue focus ring.
- Use semantic HTML and descriptive labels.
- Do not encode meaning through color alone.
- Ensure interactive targets are usable on touch devices.
- Preserve logical focus when modals, sheets, or panels open and close.

## Responsive behavior
### Desktop
- Optimize for speed, comparison, keyboard use, tables, and multi-panel workspaces.

### Tablet
- Preserve two-panel workflows when space allows.
- Collapse secondary information into drawers or tabs when necessary.

### Mobile
- Prioritize the current task, record identity, and primary action.
- Convert wide workspaces into ordered screens, tabs, or sheets.
- Avoid simply shrinking desktop layouts.

## Agent checklist for UI changes
Before completion verify:
- White/black/blue identity is preserved.
- No random accent color was introduced.
- Desktop, tablet, and mobile states remain usable.
- Loading, empty, error, disabled, and focus states exist where needed.
- Existing design tokens or shared components were reused.
- The interface reduces rather than adds workflow friction.
