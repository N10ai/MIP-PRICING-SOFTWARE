# Roadmap and Current Priorities

## Purpose
This document gives agents enough direction to avoid solving the wrong problem. Keep it concise and update it as priorities change.

## Current product direction
MIP Pricing OS is evolving from a quote-building tool into a connected freight operating system centered on pricing, RFQ communication, workflow automation, operations handoff, warehouse visibility, customer/vendor collaboration, and reporting.

## Current priorities
1. Keep CI, typecheck, and production builds healthy.
2. Stabilize the quote workspace and RFQ conversation workflows.
3. Improve desktop and tablet productivity without degrading mobile usability.
4. Preserve a consistent white, black, and blue visual system.
5. Reduce large monolithic components through careful incremental extraction.
6. Strengthen Supabase typing, RLS, migrations, and auditability.
7. Connect quote data to downstream operations without duplicate entry.

## Near-term capability areas
- RFQ inbox and conversation association
- Vendor response tracking
- Quote creation and revisions
- Charge and rate libraries
- Customer records and portal views
- Quote-to-shipment handoff
- Operational workflow status and ownership
- Reporting and response-time analytics

## Future capability areas
- Expanded warehouse workflows
- Storage billing and pallet-position visibility
- Customer and vendor self-service portals
- Invoice and payment workflows
- AI-assisted document extraction and classification
- Approval and automation engine
- Broader forwarding operations modules

## Known architectural concerns
Agents should inspect the repository before assuming these still apply:
- Some quote workspace components are large and should be decomposed incrementally.
- Similar helper logic may exist in multiple components.
- UI patterns may need consolidation into shared primitives and tokens.
- Database types and business logic should become more centralized as modules grow.

Do not perform a large rewrite solely because technical debt exists. Fix debt when it directly supports the assigned task or when a focused refactor can be proven safe.

## Updating this roadmap
When completing a major feature:
- Move completed priorities out.
- Add newly discovered technical debt only when concrete.
- Keep descriptions outcome-oriented.
- Do not turn this file into a detailed backlog or historical journal.
