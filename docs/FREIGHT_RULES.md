# Freight Domain Rules

## Purpose
This document prevents agents from inventing freight behavior. It defines safe domain conventions and identifies where business rules require confirmation.

## General rule
Do not assume a freight calculation, status, charge, document requirement, or operational transition when the repository and documentation do not define it.

When a task depends on company-specific rates, free time, minimums, rounding, accessorials, or compliance requirements, preserve existing logic or request clarification.

## Modes
The platform may support:
- Air
- Ocean
- Ground
- Domestic
- International
- Import
- Export

Mode-specific fields and calculations should appear only when relevant.

## Core entities
Common entities include:
- Customer or consignee
- Shipper
- Vendor, carrier, airline, steamship line, or agent
- Origin and destination
- Port of loading and port of discharge
- Incoterm
- Commodity
- Cargo lines
- Packages, pieces, pallets, dimensions, weight, and volume
- Rates and charges
- RFQs and vendor responses
- Quotes and revisions
- Shipments
- Warehouse Receipts and Cargo Releases
- Invoices and payments

Reuse canonical entities rather than duplicating names into isolated records unless a historical snapshot is intentionally required.

## Air freight calculations
Typical air chargeable weight compares gross weight with volumetric weight. The divisor and units may vary by service and carrier.

Agent rules:
- Reuse the repository's existing formula and unit conversions.
- Keep gross, volumetric, and chargeable weight distinct.
- Display units explicitly.
- Do not hardcode a divisor without confirming the established business rule.
- Preserve rounding and minimum-charge behavior.

## Ocean freight calculations
Typical ocean pricing may depend on:
- CBM
- Weight
- W/M rules
- Container type
- Minimum charges
- Origin and destination charges
- Documentation and accessorial charges

Agent rules:
- Keep LCL and FCL logic distinct.
- Do not infer container capacity, free time, or carrier-specific rules.
- Preserve POL, POD, carrier, equipment, and sailing details where available.

## Ground freight
Ground pricing may depend on:
- Distance
- Equipment
- Pallet count
- Weight
- Dimensions
- Freight class
- Accessorials
- Waiting time
- Pickup and delivery constraints

Do not invent rates, classes, or accessorial applicability.

## Cargo data
Cargo lines should preserve:
- Quantity or pieces
- Package type
- Length, width, and height
- Dimension unit
- Gross weight
- Weight unit
- Stackability
- Oversized status
- Dangerous-goods status
- Temperature-control requirements
- Commodity description

Calculations must normalize units consistently and avoid hidden conversions.

## Charges
A charge should generally preserve:
- Charge code or name
- Description
- Basis, such as flat, per shipment, per kilogram, per CBM, per pallet, per day, or percentage
- Quantity
- Unit rate
- Minimum and maximum when applicable
- Currency
- Vendor cost
- Customer sell rate
- Margin or markup
- Tax applicability when relevant

Do not collapse cost and sell values into one field.

## Quotes
Quotes should support:
- Stable quote number
- Version or revision history when applicable
- Customer reference
- Mode and movement type
- Route
- Cargo summary
- Charges
- Currency
- Validity date
- Status
- Created by and timestamps
- Terms and assumptions

Changes after sending should remain traceable when they affect price or scope.

## RFQ conversations
RFQ messages should remain associated with:
- Vendor or recipient
- Quote or pricing request
- Shipment context when applicable
- Direction: inbound or outbound
- Sender and recipients
- Timestamp
- Subject and message body
- Attachments
- Delivery or processing status

Do not rely only on email subject text to associate replies when stable identifiers are available.

## Warehouse records
Warehouse workflows may include:
- Warehouse Receipt
- Cargo Release
- Receiving date
- Customer or consignee
- Location
- Pieces and package type
- Pallet positions
- Photos
- Dimensions and weight
- Storage start date
- Release or shipment date

Company-specific billing rules must be explicit.

## Storage billing
Storage may be based on pallet position, location, piece, weight, volume, day, week, month, or minimum period.

Agent rules:
- Preserve the original receiving date.
- Do not assume a calendar-month or rolling-30-day model.
- Do not double count a location shared by multiple pieces or records.
- Distinguish current occupancy from historical billed usage.
- Keep free days, minimums, billing cutoffs, and partial-period rules configurable or documented.

## Status and compliance
Do not fabricate document requirements for customs, FTZ, TSA, dangerous goods, export filing, or carrier acceptance.

Where compliance is involved:
- Preserve evidence and timestamps.
- Require explicit confirmation for consequential decisions.
- Surface missing information clearly.
- Avoid presenting automated suggestions as legal or regulatory approval.

## Domain implementation checklist
Before completing freight-related work verify:
- Units are explicit and conversions are tested.
- Existing formulas and rounding are preserved.
- Cost, sell, margin, and currency remain distinct.
- Mode-specific fields do not leak into unrelated modes.
- Historical quotes or invoices are not silently recalculated.
- Company-specific rules were not guessed.
- Important state changes are auditable.
