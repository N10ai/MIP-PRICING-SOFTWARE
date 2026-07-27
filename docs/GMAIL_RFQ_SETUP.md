# Gmail RFQ automation setup

This branch adds Gmail OAuth, automatic RFQ sending, Gmail reply synchronization, attachment capture, and AI rate parsing.

## 1. Google Cloud

Create or select a Google Cloud project.

Enable:

- Gmail API
- Google OAuth consent screen

Create an OAuth 2.0 Web Application client.

Authorized redirect URI:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/gmail-oauth-callback
```

## 2. Supabase secrets

Set these Edge Function secrets:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
OPENAI_API_KEY
APP_URL
```

Optional:

```text
OPENAI_RATE_PARSER_MODEL=gpt-5-mini
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase when functions run.

## 3. Database and storage

Apply:

```text
supabase/migrations/20260727010000_gmail_rfq_automation.sql
```

Create a private Storage bucket named:

```text
rfq-email-attachments
```

## 4. Deploy functions

Deploy:

```text
gmail-oauth-start
gmail-oauth-callback
gmail-connection-status
send-rfq-gmail
sync-gmail-rfq-replies
parse-vendor-response
```

The OAuth callback must be deployed without JWT verification because Google redirects the browser directly to it.

## 5. First use

1. Open a request.
2. Open the RFQ workspace.
3. Click **Connect Gmail**.
4. Approve the requested Gmail permissions.
5. Select vendors and click **Send RFQs through Gmail**.
6. After vendors reply, invoke **sync-gmail-rfq-replies**.
7. Invoke **parse-vendor-response** for each received RFQ.

## Current reply collection behavior

The first release synchronizes Gmail replies on demand. It preserves Gmail thread IDs, stores the original body and attachment metadata, and creates a pending parser run. Google Pub/Sub push notification support can be added after the complete workflow is validated.

## Security note

The migration currently stores OAuth credentials in server-only database columns protected by RLS and accessed with the service role. Before a multi-tenant production launch, encrypt refresh tokens using a managed secret/encryption service or Supabase Vault.
