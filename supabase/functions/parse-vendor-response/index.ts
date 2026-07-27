import { adminClient, authenticatedUser } from '../_shared/gmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    currency: { type: ['string', 'null'] },
    carrier: { type: ['string', 'null'] },
    transit: { type: ['string', 'null'] },
    validity: { type: ['string', 'null'] },
    routing: { type: ['string', 'null'] },
    frequency: { type: ['string', 'null'] },
    total: { type: ['number', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    missing_fields: { type: 'array', items: { type: 'string' } },
    remarks: { type: ['string', 'null'] },
    charges: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          description: { type: 'string' },
          amount: { type: ['number', 'null'] },
          rate: { type: ['number', 'null'] },
          basis: { type: ['string', 'null'] },
          minimum: { type: ['number', 'null'] },
          currency: { type: ['string', 'null'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          notes: { type: ['string', 'null'] },
        },
        required: ['description', 'amount', 'rate', 'basis', 'minimum', 'currency', 'confidence', 'notes'],
      },
    },
  },
  required: ['currency', 'carrier', 'transit', 'validity', 'routing', 'frequency', 'total', 'confidence', 'missing_fields', 'remarks', 'charges'],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const user = await authenticatedUser(req)
    if (!user) return json({ error: 'Unauthorized' }, 401)
    const { rfq_id } = await req.json() as { rfq_id: string }
    if (!rfq_id) return json({ error: 'rfq_id is required' }, 400)

    const admin = adminClient()
    const { data: run, error: runError } = await admin
      .from('vendor_response_parse_runs')
      .select('id,source_text,email_message_id')
      .eq('vendor_rfq_id', rfq_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (runError) throw runError
    if (!run) return json({ error: 'No vendor response is available to parse' }, 404)

    await admin.from('vendor_response_parse_runs').update({ status: 'processing' }).eq('id', run.id)
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured')

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_RATE_PARSER_MODEL') || 'gpt-5-mini',
        input: [
          {
            role: 'system',
            content: 'Extract freight-forwarding vendor rates from the email. Never invent missing values. Normalize common bases such as flat, per_kg, per_cbm, per_shipment, per_container, per_day, per_pallet, percentage, and minimum. Return low confidence when wording is ambiguous.',
          },
          { role: 'user', content: String(run.source_text || '') },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'vendor_rate_response',
            strict: true,
            schema,
          },
        },
      }),
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload?.error?.message || 'Rate parsing failed')
    const rawText = payload.output_text || payload.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text
    if (!rawText) throw new Error('Parser returned no structured result')
    const result = JSON.parse(rawText)
    const needsReview = Number(result.confidence || 0) < 0.85 || (result.missing_fields || []).length > 0 || (result.charges || []).some((charge: any) => Number(charge.confidence || 0) < 0.8)
    const status = needsReview ? 'needs_review' : 'completed'

    await admin.from('vendor_response_parse_runs').update({
      status,
      result,
      confidence: result.confidence,
      completed_at: new Date().toISOString(),
      error_message: null,
    }).eq('id', run.id)

    await admin.from('vendor_rfqs').update({
      status: needsReview ? 'needs_review' : 'responded',
      parse_status: status,
      parse_confidence: result.confidence,
      response_data: {
        ...result,
        valid_until: result.validity,
        parser_version: 'openai-v1',
        source_email_message_id: run.email_message_id,
      },
    }).eq('id', rfq_id)

    return json({ status, result })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to parse vendor response' }, 500)
  }
})
