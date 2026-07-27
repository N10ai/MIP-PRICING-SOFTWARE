import { adminClient, authenticatedUser, collectMessageBodies, getGmailAccessToken, gmailRequest, headerValue } from '../_shared/gmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function extractAddress(value: string) {
  const match = value.match(/<([^>]+)>/)
  return (match?.[1] || value).trim()
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const user = await authenticatedUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const admin = adminClient()
    const accessToken = await getGmailAccessToken(user.id, admin)
    const { data: connection } = await admin.from('gmail_connections').select('email_address').eq('user_id', user.id).single()
    const ownEmail = String(connection?.email_address || '').toLowerCase()

    const { data: rfqs, error } = await admin
      .from('vendor_rfqs')
      .select('id,rfq_number,quote_request_id,gmail_thread_id,status,sent_to')
      .not('gmail_thread_id', 'is', null)
      .in('status', ['sent', 'responded', 'received', 'needs_review'])
    if (error) throw error

    const results = []
    for (const rfq of rfqs || []) {
      const thread = await gmailRequest(accessToken, `/threads/${rfq.gmail_thread_id}?format=full`)
      for (const message of thread.messages || []) {
        const headers = message.payload?.headers || []
        const from = extractAddress(headerValue(headers, 'From'))
        if (!from || from.toLowerCase() === ownEmail) continue

        const existing = await admin.from('rfq_email_messages').select('id').eq('gmail_message_id', message.id).maybeSingle()
        if (existing.data) continue

        const parsed = collectMessageBodies(message.payload)
        const receivedAt = message.internalDate ? new Date(Number(message.internalDate)).toISOString() : new Date().toISOString()
        const { data: emailRow, error: emailError } = await admin.from('rfq_email_messages').insert({
          vendor_rfq_id: rfq.id,
          gmail_message_id: message.id,
          gmail_thread_id: message.threadId,
          direction: 'inbound',
          from_email: from,
          to_emails: [extractAddress(headerValue(headers, 'To'))].filter(Boolean),
          cc_emails: headerValue(headers, 'Cc').split(',').map(extractAddress).filter(Boolean),
          subject: headerValue(headers, 'Subject'),
          body_text: parsed.text,
          body_html: parsed.html,
          raw_headers: Object.fromEntries(headers.map((header: any) => [header.name, header.value])),
          received_at: receivedAt,
        }).select('id').single()
        if (emailError) throw emailError

        for (const attachment of parsed.attachments) {
          let storagePath: string | null = null
          if (attachment.attachmentId) {
            const file = await gmailRequest(accessToken, `/messages/${message.id}/attachments/${attachment.attachmentId}`)
            if (file?.data) {
              const normalized = String(file.data).replaceAll('-', '+').replaceAll('_', '/')
              const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
              const binary = atob(padded)
              const bytes = Uint8Array.from(binary, char => char.charCodeAt(0))
              storagePath = `${rfq.id}/${message.id}/${attachment.filename || attachment.attachmentId}`
              await admin.storage.from('rfq-email-attachments').upload(storagePath, bytes, { contentType: attachment.mimeType || 'application/octet-stream', upsert: true })
            }
          }
          await admin.from('rfq_email_attachments').insert({
            email_message_id: emailRow.id,
            gmail_attachment_id: attachment.attachmentId || null,
            file_name: attachment.filename || null,
            mime_type: attachment.mimeType || null,
            size_bytes: attachment.size || null,
            storage_path: storagePath,
          })
        }

        const parseStatus = parsed.text || parsed.html ? 'pending' : 'needs_review'
        await admin.from('vendor_response_parse_runs').insert({
          vendor_rfq_id: rfq.id,
          email_message_id: emailRow.id,
          status: parseStatus,
          source_text: parsed.text || parsed.html || '',
          parser_version: 'gmail-v1',
        })
        await admin.from('vendor_rfqs').update({
          status: 'received',
          response_received_at: receivedAt,
          parse_status: parseStatus,
        }).eq('id', rfq.id)
        await admin.from('commercial_activities').insert({
          quote_request_id: rfq.quote_request_id,
          activity_type: 'vendor_response_received',
          title: `${rfq.rfq_number} response received`,
          description: `Reply received from ${from}.`,
          actor_name: from,
          metadata: { vendor_rfq_id: rfq.id, gmail_message_id: message.id },
        })
        results.push({ rfq_id: rfq.id, gmail_message_id: message.id, from, parse_status: parseStatus })
      }
    }

    return json({ received: results.length, results })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to sync Gmail replies' }, 500)
  }
})
