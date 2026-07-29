create table if not exists public.rfq_conversation_messages (
  id uuid primary key default gen_random_uuid(),
  vendor_rfq_id uuid not null references public.vendor_rfqs(id) on delete cascade,
  direction text not null check (direction in ('outbound','inbound')),
  sender_email text,
  recipient_email text,
  subject text,
  body_text text,
  body_html text,
  provider_message_id text,
  provider_thread_id text,
  status text not null default 'received' check (status in ('draft','queued','sent','delivered','received','failed')),
  attachments jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists rfq_conversation_messages_rfq_created_idx
  on public.rfq_conversation_messages(vendor_rfq_id, created_at);

alter table public.rfq_conversation_messages enable row level security;

drop policy if exists "authenticated users can read rfq messages" on public.rfq_conversation_messages;
create policy "authenticated users can read rfq messages"
  on public.rfq_conversation_messages for select to authenticated using (true);

drop policy if exists "authenticated users can insert rfq messages" on public.rfq_conversation_messages;
create policy "authenticated users can insert rfq messages"
  on public.rfq_conversation_messages for insert to authenticated with check (true);

drop policy if exists "authenticated users can update rfq messages" on public.rfq_conversation_messages;
create policy "authenticated users can update rfq messages"
  on public.rfq_conversation_messages for update to authenticated using (true) with check (true);

insert into public.rfq_conversation_messages (
  vendor_rfq_id,
  direction,
  sender_email,
  recipient_email,
  subject,
  body_text,
  provider_message_id,
  provider_thread_id,
  status,
  sent_at,
  created_at,
  metadata
)
select
  vr.id,
  'outbound',
  'MIP Pricing OS',
  coalesce(vr.response_data->>'delivered_to', vr.sent_to),
  vr.subject,
  vr.message_body,
  nullif(vr.response_data->>'resend_email_id',''),
  vr.thread_reference,
  case when vr.sent_at is null then 'draft' else 'sent' end,
  vr.sent_at,
  coalesce(vr.sent_at, vr.created_at),
  jsonb_build_object(
    'intended_recipient', vr.sent_to,
    'resend_mode', vr.response_data->>'resend_mode',
    'source', 'vendor_rfqs_backfill'
  )
from public.vendor_rfqs vr
where not exists (
  select 1
  from public.rfq_conversation_messages m
  where m.vendor_rfq_id = vr.id
    and m.direction = 'outbound'
);