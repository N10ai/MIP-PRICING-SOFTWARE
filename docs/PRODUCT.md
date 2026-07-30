# Product Direction

## Product definition
MIP Pricing OS is a workflow-first freight pricing and operations platform for freight forwarders, warehouse operators, and their customers.

It is not merely a quote generator. It should connect requests, pricing, vendor communication, approvals, shipments, warehouse activity, invoicing, and reporting into a coherent operating system.

## Primary users
- Pricing agents
- Freight forwarding operations teams
- Warehouse teams
- Managers and owners
- Vendors and carriers
- Customers using portal access

## Product outcomes
Every feature should contribute to at least one of these outcomes:
- Faster response and quote turnaround
- Fewer data-entry mistakes
- Better operational visibility
- Less repetitive communication
- Easier handoff between pricing and operations
- Stronger audit trail
- Better customer experience
- More consistent margins and billing

## Product principles
1. **Workflow first.** Organize around the job users are trying to complete, not around isolated database entities.
2. **Speed with control.** Automate routine decisions while preserving human review for financial, compliance, and customer-impacting actions.
3. **One source of truth.** Reuse shared customer, facility, route, shipment, vendor, and charge data.
4. **Progressive disclosure.** Show the most relevant information first; reveal complexity when needed.
5. **Operational continuity.** Information created during pricing should flow into execution without re-entry.
6. **Visible automation.** Users should understand what the system did and be able to review or correct it.
7. **Calm interfaces.** High information density must remain structured and readable.
8. **Power without clutter.** Support shortcuts, bulk actions, filters, and advanced tools without overwhelming new users.
9. **Measurability.** Important workflows should produce timestamps, ownership, status, and performance data.
10. **Reliability over novelty.** A stable workflow is more valuable than an impressive feature that cannot be trusted.

## Interaction standards
- Minimize unnecessary clicks and repeated typing.
- Prefer search and autocomplete over long dropdowns.
- Preserve drafts where appropriate.
- Make status, ownership, and next action visible.
- Provide meaningful empty, loading, success, and error states.
- Prevent destructive actions from occurring accidentally.
- Make desktop workflows efficient and keyboard-friendly.
- Ensure tablet and mobile layouts preserve core task completion.

## Competitive differentiation
MIP Pricing OS should be differentiated by the quality of its connected workflows:
- RFQ intake and vendor conversations
- Fast quote construction
- Reusable pricing logic and charge libraries
- Conversion from quote to execution
- Warehouse and storage visibility
- Customer and vendor portals
- Automation with approvals and audit trails
- Operational analytics based on real workflow events

## Product decision test
Before implementing a feature, answer:
1. Which user problem does this solve?
2. Which workflow becomes faster or safer?
3. What existing data should it reuse?
4. What is the smallest complete version?
5. How will users know what happened?
6. How will this be measured?
7. What existing behavior could regress?
