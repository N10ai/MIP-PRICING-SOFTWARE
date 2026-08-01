# RFQ experience states

The RFQ workflow intentionally has three separate UI states.

## Request summary

The summary keeps the pricing-decision banner and exposes only two persistent actions:

- Request a vendor rate
- Create or open the quote

Rate comparison remains contextual inside the pricing-decision banner and Rates workspace rather than competing in the sticky footer.

## New vendor RFQ

The first-send workspace exposes only:

- Vendor selection
- Template editor and email preview

Shipment context is used to generate the template but is not presented as a competing navigation destination.

## Vendor conversation

Opening a sent RFQ creates a focused, full-screen chat surface with:

- Compact vendor/RFQ header
- Chronological email thread
- Optional parsed-rate strip
- Follow-up composer
- Conversation/RFQ deletion menu

The underlying request summary and RFQ setup tabs are hidden until the conversation is closed.
