# Resend test mode setup

This release replaces Gmail sending in the RFQ composer with Resend test mode.

## Supabase secrets

Required:

```text
RESEND_API_KEY
```

Recommended for explicit behavior:

```text
RESEND_MODE=test
RESEND_FROM_EMAIL=MIP Pricing OS <onboarding@resend.dev>
RESEND_TEST_RECIPIENT=your-resend-account-email@example.com
```

If `RESEND_TEST_RECIPIENT` is omitted, the Edge Function uses the authenticated app user's email.

## Deploy Edge Functions

```text
resend-connection-status
send-rfq-resend
```

Both functions should keep JWT verification enabled.

## Test-mode behavior

- The selected vendor address remains stored on the RFQ.
- No message is sent to the vendor.
- Every test RFQ is delivered only to `RESEND_TEST_RECIPIENT`.
- The subject starts with `[TEST for vendor@example.com]`.
- The body states which vendor would have received the production message.
- The Resend email ID is stored in the existing outbound message tracking fields.

## Production transition

After verifying a domain in Resend, change the secrets to:

```text
RESEND_MODE=production
RESEND_FROM_EMAIL=MIP Pricing OS <quotes@yourdomain.com>
RESEND_REPLY_TO=quotes@yourdomain.com
```

No RFQ composer code change is required.

## Current scope

This change handles outbound RFQ delivery only. Inbound vendor replies still require a verified inbound domain/webhook implementation and are intentionally deferred while using Resend test mode.
