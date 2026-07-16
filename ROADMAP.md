# MIP Pricing OS Roadmap

## v0.1 — Commercial foundation
- React/Vite application shell
- Supabase connection and authentication
- Customer request portal
- Internal request queue
- Request-to-quote handoff
- Shared design system

## v0.2 — Vendor buying and RFQs
- Vendor CRM and contacts
- Vendor lane and service coverage
- RFQ generation and tracking
- Vendor response entry
- Rate-option comparison
- Selected cost transferred into quote

## v0.3 — Quote workspace
- Complete pricing editor
- Vendor cost versus selling price
- Margin and markup simulator
- Quote versions and revisions
- PDF and email delivery
- Activity and communication timeline

## v0.4 — Customer experience
- Customer login and portal
- Request status tracking
- Quote viewing and acceptance
- Revision requests
- Document uploads and notifications

## v0.5 — Intelligence
- AI request autofill
- Airport, port, and city autocomplete
- Missing-information detection
- Vendor-reply extraction
- Similar shipment matching
- Pricing and margin suggestions

## v1.0 — Production release
- Role-based security
- Audit history
- Reliable outbound and inbound email integration
- Reporting and commercial analytics
- Production quality assurance
- Onboarding documentation

## Current sprint
### Premium Request Workspace
Acceptance criteria:
- A request opens without losing queue context.
- Cargo, route, services, timeline, RFQs, and quote state are visible.
- Primary actions remain visible on desktop and mobile.
- All UI uses shared components and design tokens.
- The deployed GitHub Pages preview remains functional after every commit.