# RFQ email pipeline

## Audit (before this change)

The React RFQ composer created `vendor_rfqs`, then invoked `send-rfq-resend`. The sender was hard-coded to Resend's onboarding sender, every message was hard-routed to one test Gmail address, and the inbound domain and mode were hard-coded. A Resend acceptance updated the RFQ and inserted a conversation row, but failures were not persisted and retries had no durable queued/failed attempt. The conversation UI polled manually; it had no Realtime subscription.

The inbound function retrieved a received email and matched only an RFQ-looking token. It used a static token committed in source rather than Resend's Svix signature, depended on a unique constraint that did not exist, did not retain unmatched mail, stored unsanitized HTML, and did not update the parent request's activity timestamp. Conversation persistence lacked dedicated Reply-To, CC, RFC thread headers, received-email ID, delivery/failure fields, quote-request index, and reliable uniqueness.

## Completed flow

1. The browser creates draft `vendor_rfqs` and calls the authenticated send function.
2. The function derives `rfq-<normalized-rfq-number>@<RESEND_INBOUND_DOMAIN>`, persists a queued attempt, and calls Resend with an idempotency key.
3. Only a Resend 2xx acceptance marks the attempt and RFQ `sent`; rejection records `failed` and its safe error detail. Failed RFQs remain retryable.
4. Resend signs an `email.received` webhook. The inbound function validates the Svix ID, timestamp, and signature before retrieving the full message from the Receiving API.
5. Matching prefers the exact inbound recipient, then stored RFC `In-Reply-To` metadata, then exact RFQ tokens. Zero or multiple candidates are retained in `rfq_unmatched_inbound_messages`; they are never guessed or discarded.
6. A unique received-email ID makes webhook retries idempotent. The sanitized message and attachment metadata are stored, the RFQ becomes `responded`, the request activity timestamp advances, and an audit event is added.
7. The conversation subscribes to scoped message, RFQ, and activity changes and retains its Refresh fallback.

Delivery events are not configured in this change: `delivered` is represented in the schema/UI and can be populated when a separate Resend delivery-event handler is enabled.

## Configuration

Set these Supabase Edge Function secrets (values must never be placed in browser code): `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_INBOUND_DOMAIN`, `RESEND_WEBHOOK_SECRET`, `RESEND_MODE`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Set `RESEND_TEST_RECIPIENT` only for test mode. Safe placeholders are in `.env.example`.

In Resend, create a webhook subscribed to exactly **`email.received`**. Its endpoint is:

`https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/resend-inbound-webhook`

Copy the webhook signing secret into the Supabase `RESEND_WEBHOOK_SECRET` secret. Configure the verified sender in `RESEND_FROM_EMAIL`, and configure the receiving domain as `whidelaede.resend.app`. Production mode sends to the vendor address; test mode intentionally redirects to `RESEND_TEST_RECIPIENT`.

## Deployment

```bash
supabase db push
supabase functions deploy send-rfq-resend
supabase functions deploy resend-inbound-webhook --no-verify-jwt
supabase functions deploy resend-connection-status
```

The inbound function performs Resend signature authentication, so it must be publicly reachable with Supabase JWT verification disabled. The send and status functions remain JWT-authenticated in their code paths.

## Safe end-to-end test

1. Use a non-production quote request and a vendor mailbox controlled by the tester.
2. Create and send one RFQ; confirm Resend accepted it and the app shows the outbound message as Sent.
3. Confirm the recipient is correct and Reply-To ends in `@whidelaede.resend.app`.
4. Reply from the external mailbox and confirm Resend records `email.received` and the webhook returns `matched: true`.
5. Confirm the full reply and attachment metadata appear once, the RFQ is Responded, the request activity advances, and the vendor-replied event is present.
6. Replay the same signed webhook within its valid timestamp window and confirm `duplicate: true` without a second conversation row or activity.
7. Repeat at desktop, tablet, and mobile widths; verify natural scrolling, focus, Refresh fallback, waiting and failed states.
