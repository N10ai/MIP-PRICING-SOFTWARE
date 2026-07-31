-- Complete, auditable Resend send/receive persistence without changing existing RLS boundaries.
alter table public.rfq_conversation_messages
  add column if not exists quote_request_id uuid references public.quote_requests(id) on delete cascade,
  add column if not exists reply_to_email text,
  add column if not exists cc_emails text[] not null default '{}',
  add column if not exists message_id text,
  add column if not exists in_reply_to text,
  add column if not exists message_references text[] not null default '{}',
  add column if not exists resend_received_email_id text,
  add column if not exists failure_details text,
  add column if not exists delivered_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

update public.rfq_conversation_messages m
set quote_request_id = r.quote_request_id
from public.vendor_rfqs r
where m.vendor_rfq_id = r.id and m.quote_request_id is null;

create unique index if not exists rfq_messages_provider_id_unique
  on public.rfq_conversation_messages(provider_message_id)
  where provider_message_id is not null;
create unique index if not exists rfq_messages_received_id_unique
  on public.rfq_conversation_messages(resend_received_email_id)
  where resend_received_email_id is not null;
create unique index if not exists rfq_messages_one_active_send_unique
  on public.rfq_conversation_messages(vendor_rfq_id)
  where direction = 'outbound' and status in ('queued', 'sent', 'delivered');
create index if not exists rfq_messages_quote_request_idx
  on public.rfq_conversation_messages(quote_request_id, created_at desc);
create index if not exists rfq_messages_created_idx
  on public.rfq_conversation_messages(created_at desc);

create table if not exists public.rfq_unmatched_inbound_messages (
  id uuid primary key default gen_random_uuid(),
  resend_received_email_id text not null unique,
  webhook_event_id text unique,
  sender_email text,
  recipient_emails text[] not null default '{}',
  cc_emails text[] not null default '{}',
  reply_to_email text,
  subject text,
  body_text text,
  body_html text,
  message_id text,
  in_reply_to text,
  message_references text[] not null default '{}',
  received_at timestamptz,
  attachments jsonb not null default '[]'::jsonb,
  match_candidates jsonb not null default '[]'::jsonb,
  unmatched_reason text not null,
  raw_metadata jsonb not null default '{}'::jsonb,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists rfq_unmatched_created_idx
  on public.rfq_unmatched_inbound_messages(created_at desc);
alter table public.rfq_unmatched_inbound_messages enable row level security;

-- Existing installations have no tenant/role column that can safely authorize an admin UI.
-- Service-role Edge Functions retain access; no browser policy or grant is added.

alter table public.rfq_conversation_messages replica identity full;
alter table public.vendor_rfqs replica identity full;
alter table public.commercial_activities replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.rfq_conversation_messages;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.vendor_rfqs;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.commercial_activities;
exception when duplicate_object then null;
end $$;
