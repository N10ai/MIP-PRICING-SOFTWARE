-- Prevent accidental duplicate RFQs for the same vendor and customer request.
-- Existing historical duplicates remain untouched; this guard applies to new inserts.

create or replace function public.prevent_duplicate_active_vendor_rfq()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  existing_rfq record;
begin
  -- Revisions are intentionally handled by a separate explicit workflow.
  -- Until that workflow exists, every new RFQ insert is treated as an original request.
  select id, rfq_number, status, sent_at
    into existing_rfq
  from public.vendor_rfqs
  where quote_request_id = new.quote_request_id
    and vendor_id = new.vendor_id
    and id <> coalesce(new.id, gen_random_uuid())
    and lower(coalesce(status, 'draft')) in (
      'draft',
      'queued',
      'sending',
      'sent',
      'delivered',
      'awaiting_response',
      'responded',
      'selected'
    )
  order by created_at desc
  limit 1;

  if existing_rfq.id is not null then
    raise exception using
      errcode = '23505',
      message = format(
        'RFQ already exists for this vendor on this request (%s, status: %s). Open the existing conversation instead of sending another RFQ.',
        existing_rfq.rfq_number,
        coalesce(existing_rfq.status, 'draft')
      ),
      detail = existing_rfq.id::text,
      hint = 'Use retry only for a failed send. A future explicit revision action may create a linked revision.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_active_vendor_rfq on public.vendor_rfqs;
create trigger prevent_duplicate_active_vendor_rfq
before insert on public.vendor_rfqs
for each row
execute function public.prevent_duplicate_active_vendor_rfq();

create index if not exists vendor_rfqs_request_vendor_status_idx
  on public.vendor_rfqs (quote_request_id, vendor_id, status, created_at desc);

comment on function public.prevent_duplicate_active_vendor_rfq() is
  'Rejects accidental duplicate active RFQs for the same vendor and quote request while preserving historical rows.';
