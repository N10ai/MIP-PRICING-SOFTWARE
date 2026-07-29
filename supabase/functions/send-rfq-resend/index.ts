import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const { rfq_ids } = await req.json() as { rfq_ids: string[] }
    if (!Array.isArray(rfq_ids) || !rfq_ids.length) return json({ error: 'rfq_ids is required' }, 400)

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) return json({ error: 'RESEND_API_KEY is not configured' }, 500)

    const fromEmail = 'MIP Pricing OS <onboarding@resend.dev>'
    const inboundDomain = 'whidelaede.resend.app'
    const mode = 'test'
    const testRecipient = 'infon10miami@gmail.com'

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: rfqs, error } = await admin
      .from('vendor_rfqs')
      .select('id,rfq_number,status,sent_to,subject,message_body,quote_request_id,thread_reference,response_data')
      .in('id', rfq_ids)
    if (error) throw error

    const foundIds = new Set((rfqs || []).map(rfq => rfq.id))
    const results: Array<Record<string, unknown>> = rfq_ids
      .filter(id => !foundIds.has(id))
      .map(id => ({ id, status: 'failed', error: 'RFQ was not found' }))

    for (const rfq of rfqs || []) {
      const destination = testRecipient
      const replyTo = `rfq-${rfq.rfq_number.toLowerCase()}@${inboundDomain}`
      const existingMeta = (rfq.response_data && typeof rfq.response_data === 'object') ? rfq.response_data : {}
      const existingResendId = (existingMeta as Record<string, unknown>).resend_email_id
      if (existingResendId || rfq.thread_reference) {
        results.push({ id: rfq.id, status: 'skipped', reason: 'Already sent' })
        continue
      }

      const subjectBase = String(rfq.subject || `Rate request | ${rfq.rfq_number}`)
      const taggedSubject = subjectBase.includes(rfq.rfq_number) ? subjectBase : `${subjectBase} | ${rfq.rfq_number}`
      const subject = `[TEST for ${rfq.sent_to || 'vendor'}] ${taggedSubject}`
      const body = `${rfq.message_body || ''}\n\nReference: ${rfq.rfq_number}\n\nTEST MODE: This message would be sent to ${rfq.sent_to || 'the selected vendor'}.`.trim()

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: fromEmail, to: [destination], reply_to: replyTo, subject, text: body }),
      })

      let payload: Record<string, unknown> = {}
      try { payload = await response.json() } catch { payload = {} }

      if (!response.ok) {
        results.push({ id: rfq.id, status: 'failed', error: String(payload.message || `Resend rejected the email (${response.status})`) })
        continue
      }

      const sentAt = new Date().toISOString()
      const resendEmailId = String(payload.id || '')
      const updatePayload = {
        status: 'sent',
        thread_reference: resendEmailId || rfq.thread_reference || null,
        sent_at: sentAt,
        response_data: {
          ...existingMeta,
          resend_email_id: resendEmailId || null,
          resend_mode: mode,
          delivered_to: destination,
          intended_recipient: rfq.sent_to,
          reply_to: replyTo,
          sent_at: sentAt,
        },
      }

      const { error: updateError } = await admin.from('vendor_rfqs').update(updatePayload).eq('id', rfq.id)
      if (updateError) {
        results.push({ id: rfq.id, status: 'failed', error: `Email was accepted by Resend but the RFQ status could not be updated: ${updateError.message}` })
        continue
      }

      const { error: messageError } = await admin.from('rfq_conversation_messages').insert({
        vendor_rfq_id: rfq.id,
        direction: 'outbound',
        sender_email: user.email || 'Pricing Team',
        recipient_email: destination,
        subject,
        body_text: body,
        provider_message_id: resendEmailId || null,
        provider_thread_id: resendEmailId || null,
        status: 'sent',
        sent_at: sentAt,
        metadata: {
          intended_recipient: rfq.sent_to,
          resend_mode: mode,
          delivered_to: destination,
          reply_to: replyTo,
          source: 'send-rfq-resend',
        },
      })

      await admin.from('commercial_activities').insert({
        quote_request_id: rfq.quote_request_id,
        vendor_rfq_id: rfq.id,
        activity_type: 'vendor_rfq_sent',
        title: `${rfq.rfq_number} sent in test mode`,
        description: `Test RFQ delivered to ${destination}; intended vendor: ${rfq.sent_to || 'not provided'}. Replies route to ${replyTo}.`,
        actor_name: user.email || 'Pricing Team',
        metadata: { vendor_rfq_id: rfq.id, resend_email_id: resendEmailId || null, mode, intended_recipient: rfq.sent_to, reply_to: replyTo },
      })

      results.push({
        id: rfq.id,
        status: 'sent',
        resend_email_id: resendEmailId || null,
        delivered_to: destination,
        intended_recipient: rfq.sent_to,
        reply_to: replyTo,
        mode,
        conversation_logged: !messageError,
        conversation_error: messageError?.message || null,
      })
    }

    const failedCount = results.filter(result => result.status === 'failed').length
    const sentCount = results.filter(result => result.status === 'sent').length
    const skippedCount = results.filter(result => result.status === 'skipped').length

    if (failedCount > 0 && sentCount === 0 && skippedCount === 0) {
      return json({ mode, results, error: 'All RFQ sends failed' }, 500)
    }

    return json({ mode, results })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send RFQs' }, 500)
  }
})