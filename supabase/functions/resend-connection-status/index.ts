import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return new Response(JSON.stringify({ connected: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response(JSON.stringify({ connected: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  const apiKey = Deno.env.get('RESEND_API_KEY')
  const mode = (Deno.env.get('RESEND_MODE') || 'test') === 'production' ? 'production' : 'test'
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'
  const testRecipient = Deno.env.get('RESEND_TEST_RECIPIENT') || user.email || null

  return new Response(JSON.stringify({ connected: Boolean(apiKey), mode, from_email: fromEmail, test_recipient: testRecipient }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
