import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const stateValue = url.searchParams.get('state')
  if (!code || !stateValue) return new Response('Missing OAuth parameters', { status: 400 })

  const state = JSON.parse(atob(stateValue)) as { userId: string; returnTo?: string }
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gmail-oauth-callback`
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokens = await tokenResponse.json()
  if (!tokenResponse.ok) return new Response(`OAuth failed: ${tokens.error_description || tokens.error || 'Unknown error'}`, { status: 400 })

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const profile = await profileResponse.json()

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const existing = await admin.from('gmail_connections').select('refresh_token_encrypted').eq('user_id', state.userId).maybeSingle()
  const refreshToken = tokens.refresh_token || existing.data?.refresh_token_encrypted || null

  const { error } = await admin.from('gmail_connections').upsert({
    user_id: state.userId,
    email_address: profile.email || null,
    access_token_encrypted: tokens.access_token,
    refresh_token_encrypted: refreshToken,
    token_expires_at: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(),
    scopes: String(tokens.scope || '').split(' ').filter(Boolean),
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  if (error) return new Response(`Unable to save Gmail connection: ${error.message}`, { status: 500 })

  const returnTo = state.returnTo || Deno.env.get('APP_URL') || '/'
  return Response.redirect(`${returnTo.replace(/\/$/, '')}/#/settings?gmail=connected`, 302)
})
