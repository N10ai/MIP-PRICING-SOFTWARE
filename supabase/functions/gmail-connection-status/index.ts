import { adminClient, authenticatedUser } from '../_shared/gmail.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const user = await authenticatedUser(req)
  if (!user) return new Response(JSON.stringify({ connected: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  const admin = adminClient()
  const { data, error } = await admin.from('gmail_connections').select('email_address,connected_at,watch_expiration').eq('user_id', user.id).maybeSingle()
  return new Response(JSON.stringify({ connected: Boolean(data), connection: data || null, error: error?.message || null }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
