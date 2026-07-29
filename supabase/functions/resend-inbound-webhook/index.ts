import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WEBHOOK_TOKEN = 'mip_rfq_inbound_2026_7f3d9b2a'

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function extractRfqNumber(...values: Array<unknown>): string | null {
  const text = values.filter(Boolean).join(' ')
  const match = text.match(/RFQ-[A-Z0-9-]+/i)
  return match ? match[0].toUpperCase() : null
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const url = new URL(req.url)
  if (url.searchParams.get('token') !== WEBHOOK_TOKEN) return json({ error: 'Unauthorized' }, 401)

  try {
    const event = await req.json()
    if (event?.type !== 'email.received') return json({ received: true, ignored: true })

    const emailId = String(event?.data?.email_id || '')
    if (!emailId) return json({ error: 'Missing email_id' }, 400)

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) return json({ error: 'RESEND_API_KEY is not configured' }, 500)

    const emailResponse = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const email = await emailResponse.json()
    if (!emailResponse.ok) return json({ error: email?.message || 'Unable to retrieve received email' }, 502)

    const rfqNumber = extractRfqNumber(email.subject, email.text, email.html, ...(email.to || []))
    if (!rfqNumber) return json({ received: true, matched: false, reason: 'RFQ number not found' })

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: rfq, error: rfqError } = await admin
      .from('vendor_rfqs')
      .select('id,quote_request_id,rfq_number,status')
      .eq('rfq_number', rfqNumber)
      .maybeSingle()

    if (rfqError) throw rfqError
    if (!rfq) return json({ received: true, matched: false, rfq_number: rfqNumber })

    const attachments = Array.isArray(email.attachments)
      ? email.attachments.map((item: Record<string, unknown>) => ({
          id: item.id,
          filename: item.filename,
          content_type: item.content_type,
          size: item.size,
        }))
      : []

    const { error: insertError } = await admin.from('rfq_conversation_messages').upsert({
      vendor_rfq_id: rfq.id,
      direction: 'inbound',
      provider_message_id: email.message_id || email.id,
      provider_thread_id: email.headers?.references || email.headers?.['in-reply-to'] || null,
      sender_email: email.from || null,
      recipient_email: Array.isArray(email.to) ? email.to.join(', ') : null,
      subject: email.subject || null,
      body_text: email.text || null,
      body_html: email.html || null,
      status: 'received',
      received_at: email.created_at || new Date().toISOString(),
      attachments,
      metadata: { resend_received_email_id: email.id || emailId, headers: email.headers || {} },
    }, { onConflict: 'provider_message_id' })

    if (insertError) throw insertError

    const receivedAt = email.created_at || new Date().toISOString()
    await admin.from('vendor_rfqs').update({
      status: 'responded',
      response_received_at: receivedAt,
      original_response: email.text || email.html || null,
    }).eq('id', rfq.id)

    await admin.from('commercial_activities').insert({
      quote_request_id: rfq.quote_request_id,
      vendor_rfq_id: rfq.id,
      activity_type: 'vendor_rfq_reply_received',
      title: `${rfq.rfq_number} reply received`,
      description: `Inbound vendor reply received from ${email.from || 'vendor'}.`,
      actor_name: email.from || 'Vendor',
      metadata: { resend_received_email_id: email.id || emailId, message_id: email.message_id || null },
    })

    return json({ received: true, matched: true, rfq_number: rfq.rfq_number })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to process inbound email' }, 500)
  }
})