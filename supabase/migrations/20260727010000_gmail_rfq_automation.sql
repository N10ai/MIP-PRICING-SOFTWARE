create extension if not exists pgcrypto;

create table if not exists public.gmail_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email_address text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  history_id text,
  watch_expiration timestamptz,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists public.rfq_email_messages (
  id uuid primary key default gen_random_uuid(),
  vendor_rfq_id uuid references public.vendor_rfqs(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text,
  direction text not null check (direction in ('outbound','inbound')),
  from_email text,
  to_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  subject text,
  body_text text,
  body_html text,
  raw_headers jsonb not null default '{}'::jsonb,
  received_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(gmail_message_id)
);

create table if not exists public.rfq_email_attachments (
  id uuid primary key default gen_random_uuid(),
  email_message_id uuid not null references public.rfq_email_messages(id) on delete cascade,
  gmail_attachment_id text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  storage_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_response_parse_runs (
  id uuid primary key default gen_random_uuid(),
  vendor_rfq_id uuid not null references public.vendor_rfqs(id) on delete cascade,
  email_message_id uuid references public.rfq_email_messages(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','needs_review')),
  parser_version text,
  source_text text,
  result jsonb,
  confidence numeric,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.vendor_rfqs
  add column if not exists gmail_message_id text,
  add column if not exists gmail_thread_id text,
  add column if not exists sent_at timestamptz,
  add column if not exists response_received_at timestamptz,
  add column if not exists parse_status text,
  add column if not exists parse_confidence numeric;

alter table public.gmail_connections enable row level security;
alter table public.rfq_email_messages enable row level security;
alter table public.rfq_email_attachments enable row level security;
alter table public.vendor_response_parse_runs enable row level security;

create policy if not exists "Users manage own Gmail connection"
on public.gmail_connections
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy if not exists "Authenticated users read RFQ email messages"
on public.rfq_email_messages
for select
to authenticated
using (true);

create policy if not exists "Authenticated users read RFQ attachments"
on public.rfq_email_attachments
for select
to authenticated
using (true);

create policy if not exists "Authenticated users read parse runs"
on public.vendor_response_parse_runs
for select
to authenticated
using (true);

create index if not exists idx_rfq_email_messages_vendor_rfq on public.rfq_email_messages(vendor_rfq_id);
create index if not exists idx_rfq_email_messages_thread on public.rfq_email_messages(gmail_thread_id);
create index if not exists idx_vendor_parse_runs_rfq on public.vendor_response_parse_runs(vendor_rfq_id);
