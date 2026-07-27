import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type GmailConnection = {
  user_id: string
  email_address: string | null
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
  token_expires_at: string | null
  history_id: string | null
}

export const adminClient = () => createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

export async function authenticatedUser(req: Request) {
  const authorization = req.headers.get('Authorization')
  if (!authorization) return null
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  )
  const { data: { user } } = await client.auth.getUser()
  return user
}

async function refreshAccessToken(connection: GmailConnection, admin: SupabaseClient) {
  if (!connection.refresh_token_encrypted) throw new Error('Gmail refresh token is missing. Reconnect Gmail.')
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: connection.refresh_token_encrypted,
      grant_type: 'refresh_token',
    }),
  })
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error_description || payload.error || 'Unable to refresh Gmail token')
  const expiresAt = new Date(Date.now() + Number(payload.expires_in || 3600) * 1000).toISOString()
  await admin.from('gmail_connections').update({
    access_token_encrypted: payload.access_token,
    token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq('user_id', connection.user_id)
  return payload.access_token as string
}

export async function getGmailAccessToken(userId: string, admin = adminClient()) {
  const { data, error } = await admin.from('gmail_connections').select('*').eq('user_id', userId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Gmail is not connected')
  const connection = data as GmailConnection
  const expiresSoon = !connection.token_expires_at || new Date(connection.token_expires_at).getTime() < Date.now() + 60_000
  if (expiresSoon || !connection.access_token_encrypted) return refreshAccessToken(connection, admin)
  return connection.access_token_encrypted
}

export function base64UrlEncode(value: string) {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach(byte => binary += String.fromCharCode(byte))
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

export function base64UrlDecode(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)))
}

export async function gmailRequest(accessToken: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  const payload = response.status === 204 ? null : await response.json()
  if (!response.ok) throw new Error(payload?.error?.message || `Gmail API failed (${response.status})`)
  return payload
}

export function headerValue(headers: Array<{ name?: string; value?: string }> | undefined, name: string) {
  return headers?.find(header => header.name?.toLowerCase() === name.toLowerCase())?.value || ''
}

export function collectMessageBodies(part: any): { text: string; html: string; attachments: any[] } {
  let text = ''
  let html = ''
  const attachments: any[] = []
  const visit = (node: any) => {
    const mimeType = String(node?.mimeType || '')
    const filename = String(node?.filename || '')
    const data = node?.body?.data
    const attachmentId = node?.body?.attachmentId
    if (filename || attachmentId) attachments.push({ filename, mimeType, attachmentId, size: node?.body?.size || 0 })
    if (data && mimeType === 'text/plain') text += `${base64UrlDecode(data)}\n`
    if (data && mimeType === 'text/html') html += `${base64UrlDecode(data)}\n`
    for (const child of node?.parts || []) visit(child)
  }
  visit(part)
  return { text: text.trim(), html: html.trim(), attachments }
}
