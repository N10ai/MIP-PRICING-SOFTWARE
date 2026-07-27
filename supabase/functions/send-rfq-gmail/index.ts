import { adminClient, authenticatedUser, base64UrlEncode, getGmailAccessToken, gmailRequest } from '../_shared/gmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const user = await authenticatedUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const { rfq_ids } = await req.json() as { rfq_ids: string[] }
    if (!Array.isArray(rfq_ids) || !rfq_ids.length) return json({ error: 'rfq_ids is required' }, 400)

    const admin = adminClient()
    const accessToken = await getGmailAccessToken(user.id, admin)
    const { data: connection } = await admin.from('gmail_connections').select('email_address').eq('user_id', user.id).single()
    const { data: rfqs, error } = await admin
      .from('vendor_rfqs')
      .select('id,rfq_number,status,sent_to,subject,message_body,quote_request_id,gmail_message_id')
      .in('id', rfq_ids)
    if (error) throw error

    const results = []
    for (const rfq of rfqs || []) {
      if (!rfq.sent_to) {
        results.push({ id: rfq.id, status: 'failed', error: 'Vendor email is missing' })
        continue
      }
      if (rfq.gmail_message_id) {
        results.push({ id: rfq.id, status: 'skipped', reason: 'Already sent' })
        continue
      }

      const subject = String(rfq.subject || `Rate request | ${rfq.rfq_number}`)
      const taggedSubject = subject.includes(rfq.rfq_number) ? subject : `${subject} | ${rfq.rfq_number}`
      const body = `${rfq.message_body || ''}\n\nReference: ${rfq.rfq_number}`.trim()
      const raw = [
        `From: ${connection?.email_address || ''}`,
        `To: ${rfq.sent_to}`,
        `Subject: ${taggedSubject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset="UTF-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        body,
      ].join('\r\n')

      const sent = await gmailRequest(accessToken, '/messages/send', {
        method: 'POST',
        body: JSON.stringify({ raw: base64UrlEncode(raw) }),
      })

      const sentAt = new Date().toISOString()
      await admin.from('vendor_rfqs').update({
        status: 'sent',
        gmail_message_id: sent.id,
        gmail_thread_id: sent.threadId,
        sent_at: sentAt,
      }).eq('id', rfq.id)

      await admin.from('rfq_email_messages').insert({
        vendor_rfq_id: rfq.id,
        gmail_message_id: sent.id,
        gmail_thread_id: sent.threadId,
        direction: 'outbound',
        from_email: connection?.email_address || null,
        to_emails: [rfq.sent_to],
        subject: taggedSubject,
        body_text: body,
        sent_at: sentAt,
      })

      await admin.from('commercial_activities').insert({
        quote_request_id: rfq.quote_request_id,
        activity_type: 'vendor_rfq_sent',
        title: `${rfq.rfq_number} sent`,
        description: `RFQ emailed to ${rfq.sent_to}.`,
        actor_name: connection?.email_address || 'Pricing Team',
        metadata: { vendor_rfq_id: rfq.id, gmail_message_id: sent.id, gmail_thread_id: sent.threadId },
      })

      results.push({ id: rfq.id, status: 'sent', gmail_message_id: sent.id, gmail_thread_id: sent.threadId })
    }

    return json({ results })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send RFQs' }, 500)
  }
})
