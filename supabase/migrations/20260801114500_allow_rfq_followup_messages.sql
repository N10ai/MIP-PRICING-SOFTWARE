-- Allow an RFQ conversation to contain multiple successfully sent outbound emails.
-- Only one outbound message may be actively queued at a time.

drop index if exists public.rfq_messages_one_active_send_unique;

create unique index if not exists rfq_messages_one_queued_send_unique
  on public.rfq_conversation_messages (vendor_rfq_id)
  where direction = 'outbound' and status = 'queued';

comment on index public.rfq_messages_one_queued_send_unique is
  'Prevents concurrent duplicate sends while allowing multiple sent follow-up messages in one RFQ conversation.';
