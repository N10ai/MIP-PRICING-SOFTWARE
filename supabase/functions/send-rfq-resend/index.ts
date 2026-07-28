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

    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'MIP Pricing OS <onboarding@resend.dev>'
    const configuredMode = (Deno.env.get('RESEND_MODE') || 'test') === 'production' ? 'production' : 'test'
    const resendSandboxSender = fromEmail.toLowerCase().includes('onboarding@resend.dev')
    const mode = resendSandboxSender ? 'test' : configuredMode
    const testRecipient = Deno.env.get('RESEND_TEST_RECIPIENT') || user.email
    if (mode === 'test' && !testRecipient) return json({ error: 'RESEND_TEST_RECIPIENT is required in test mode' }, 500)

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
      const destination = mode === 'test' ? testRecipient : rfq.sent_to
      if (!destination) {
        results.push({ id: rfq.id, status: 'failed', error: 'Vendor email is missing' })
        continue
      }

      const existingMeta = (rfq.response_data && typeof rfq.response_data === 'object') ? rfq.response_data : {}
      const existingResendId = (existingMeta as Record<string, unknown>).resend_email_id
      if (existingResendId || rfq.thread_reference) {
        results.push({ id: rfq.id, status: 'skipped', reason: 'Already sent' })
        continue
      }

      const subjectBase = String(rfq.subject || `Rate request | ${rfq.rfq_number}`)
      const taggedSubject = subjectBase.includes(rfq.rfq_number) ? subjectBase : `${subjectBase} | ${rfq.rfq_number}`
      const subject = mode === 'test' ? `[TEST for ${rfq.sent_to || 'vendor'}] ${taggedSubject}` : taggedSubject
      const body = `${rfq.message_body || ''}\n\nReference: ${rfq.rfq_number}${mode === 'test' ? `\n\nTEST MODE: This message would be sent to ${rfq.sent_to || 'the selected vendor'}.` : ''}`.trim()

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [destination],
          subject,
          text: body,
          reply_to: mode === 'production' ? (Deno.env.get('RESEND_REPLY_TO') || undefined) : undefined,
        }),
      })

      let payload: Record<string, unknown> = {}
      try {
        payload = await response.json()
      } catch {
        payload = {}
      }

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
          sent_at: sentAt,
        },
      }

      const { error: updateError } = await admin.from('vendor_rfqs').update(updatePayload).eq('id', rfq.id)
      if (updateError) {
        results.push({ id: rfq.id, status: 'failed', error: `Email was accepted by Resend but the RFQ status could not be updated: ${updateError.message}` })
        continue
      }

      await admin.from('commercial_activities').insert({
        quote_request_id: rfq.quote_request_id,
        activity_type: 'vendor_rfq_sent',
        title: `${rfq.rfq_number} sent${mode === 'test' ? ' in test mode' : ''}`,
        description: mode === 'test'
          ? `Test RFQ delivered to ${destination}; intended vendor: ${rfq.sent_to || 'not provided'}.`
          : `RFQ emailed to ${destination}.`,
        actor_name: user.email || 'Pricing Team',
        metadata: { vendor_rfq_id: rfq.id, resend_email_id: resendEmailId || null, mode, intended_recipient: rfq.sent_to },
      })

      results.push({ id: rfq.id, status: 'sent', resend_email_id: resendEmailId || null, delivered_to: destination, intended_recipient: rfq.sent_to, mode })
    }

    return json({ mode, results })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to send RFQs' }, 500)
  }
})