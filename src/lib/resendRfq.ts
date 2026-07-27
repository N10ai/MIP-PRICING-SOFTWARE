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
  if (error) {
    let message = error.message || 'Unable to call the RFQ email service'
    try {
      const context = (error as { context?: Response }).context
      if (context && typeof context.json === 'function') {
        const payload = await context.json() as { error?: string; message?: string }
        message = payload.error || payload.message || message
      }
    } catch {
      // Keep the original Supabase Functions error when the response body is unavailable.
    }
    throw new Error(message)
  }
  if (!data) throw new Error('The RFQ email service returned no response')
  if ((data as { error?: string }).error) throw new Error((data as { error: string }).error)
  return data
}
