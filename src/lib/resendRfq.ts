import { supabase } from './supabase'

export type ResendConnectionStatus = {
  connected: boolean
  mode: 'test' | 'production'
  from_email?: string | null
  test_recipient?: string | null
  error?: string | null
}

export async function getResendConnectionStatus() {
  const { data, error } = await supabase.functions.invoke<ResendConnectionStatus>('resend-connection-status')
  if (error) throw error
  return data
}

export async function sendRfqEmails(rfqIds: string[]) {
  const { data, error } = await supabase.functions.invoke('send-rfq-resend', { body: { rfq_ids: rfqIds } })
  if (error) throw error
  return data
}
