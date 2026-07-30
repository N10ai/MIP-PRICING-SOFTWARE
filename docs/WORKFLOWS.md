# Workflow Design Guide

## Purpose
MIP Pricing OS is differentiated by connected workflows, not isolated screens. Every major feature should make ownership, status, next action, exceptions, and history visible.

## Standard workflow model
Use this model when applicable:

1. Trigger
2. Validate
3. Enrich or calculate
4. Suggest or automate
5. Approve when needed
6. Execute
7. Notify
8. Record an audit event
9. Measure the result

Not every workflow requires every step, but omissions should be deliberate.

## Workflow record requirements
Important workflow records should expose:
- Stable identifier
- Current status
- Assigned owner
- Created and updated timestamps
- Next action or blocking condition
- Related customer, vendor, quote, shipment, or warehouse record
- Automation state
- Error or exception state
- Audit history where material

## Status design
- Keep statuses mutually understandable and operationally useful.
- Separate lifecycle status from payment, delivery, approval, or communication state when they represent different dimensions.
- Define allowed transitions.
- Reject invalid transitions at a reliable boundary.
- Record who or what initiated consequential transitions.

## Automation principles
- Automate repetitive, deterministic work.
- Make automated actions visible.
- Preserve the input and reason behind important automated decisions.
- Use confidence or review states for uncertain AI-derived values.
- Allow safe correction and reprocessing.
- Avoid irreversible automation without confirmation.

## Approval principles
Require explicit approval when an action may materially affect:
- Customer pricing
- Vendor commitments
- Financial records
- Regulatory or compliance status
- Shipment execution
- Data deletion
- User access or permissions

Approval should record actor, timestamp, decision, and relevant version.

## Notifications
Notifications should be actionable and limited to meaningful events.

Include:
- What changed
- Which record is affected
- Whether action is required
- A direct route to the relevant workspace

Avoid duplicate notifications across channels unless requested by business rules.

## Exceptions
A workflow should distinguish normal progress from exceptions such as:
- Missing required data
- Validation failure
- Delivery failure
- Vendor nonresponse
- Expired rate
- Approval required
- Conflicting information
- Integration outage

Exceptions should include an owner, recommended action, and recovery path.

## Idempotency and retries
For integrations and automation:
- Prevent duplicate execution where retries are possible.
- Store external identifiers when available.
- Make retry behavior explicit.
- Distinguish temporary failure from permanent rejection.
- Avoid creating duplicate messages, charges, records, or notifications.

## Auditability
Record material actions with enough context to reconstruct what happened. Important examples include:
- Quote sent or revised
- Rate selected or overridden
- Approval granted or rejected
- RFQ sent or reply associated
- Shipment or warehouse status changed
- Invoice issued or adjusted
- Automation executed or failed

## Workflow metrics
Where relevant capture:
- Time to first action
- Time in each status
- Total cycle time
- Number of manual touches
- Rework or correction count
- Approval delay
- Error rate
- Response and conversion rate

Metrics should come from reliable workflow events rather than estimates embedded in the UI.

## UI representation
- Make the current state and next action obvious.
- Keep primary action placement consistent.
- Show blockers close to the affected record.
- Preserve context while users inspect messages, rates, charges, and documents.
- Use timeline, stepper, status chips, or task panels only when they improve comprehension.

## Workflow change checklist
Before completion verify:
- Trigger and completion conditions are defined.
- Allowed status transitions are clear.
- Ownership and next action are visible.
- Automation is idempotent where required.
- Failure and retry paths exist.
- Consequential actions are auditable.
- Notifications are not duplicated.
- Useful timestamps and metrics are captured.
