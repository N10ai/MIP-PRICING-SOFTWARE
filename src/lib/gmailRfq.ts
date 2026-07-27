import { supabase } from './supabase'

export type GmailConnectionStatus = {
  connected: boolean
  connection?: { email_address?: string | null; connected_at?: string | null } | null
  error?: string | null
}

export async function getGmailConnectionStatus() {
  const { data, error } = await supabase.functions.invoke<GmailConnectionStatus>('gmail-connection-status')
  if (error) throw error
  return data
}

export async function connectGmail() {
  const { data, error } = await supabase.functions.invoke<{ url: string }>('gmail-oauth-start')
  if (error) throw error
  if (!data?.url) throw new Error('Google authorization URL was not returned')
  window.location.assign(data.url)
}

export async function sendRfqEmails(rfqIds: string[]) {
  const { data, error } = await supabase.functions.invoke('send-rfq-gmail', { body: { rfq_ids: rfqIds } })
  if (error) throw error
  return data
}

export async function syncRfqReplies() {
  const { data, error } = await supabase.functions.invoke('sync-gmail-rfq-replies', { body: {} })
  if (error) throw error
  return data
}

export async function parseVendorResponse(rfqId: string) {
  const { data, error } = await supabase.functions.invoke('parse-vendor-response', { body: { rfq_id: rfqId } })
  if (error) throw error
  return data
}
