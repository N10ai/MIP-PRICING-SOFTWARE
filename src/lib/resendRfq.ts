import { supabase } from './supabase'

export type ResendConnectionStatus = {
  connected: boolean
  mode: 'test' | 'production'
  from_email?: string | null
  test_recipient?: string | null
  error?: string | null
}

const SEND_TIMEOUT_MS = 20000

async function responseMessage(response: Response) {
  try {
    const payload = await response.clone().json() as { error?: string; message?: string }
    return payload.error || payload.message || `RFQ email service failed (${response.status})`
  } catch {
    try {
      const text = await response.text()
      return text || `RFQ email service failed (${response.status})`
    } catch {
      return `RFQ email service failed (${response.status})`
    }
  }
}

export async function getResendConnectionStatus() {
  const { data, error } = await supabase.functions.invoke<ResendConnectionStatus>('resend-connection-status')
  if (error) throw error
  return data
}

export async function sendRfqEmails(rfqIds: string[]) {
  if (!rfqIds.length) throw new Error('No RFQs were provided for sending')

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw new Error(sessionError.message)
  const accessToken = sessionData.session?.access_token
  if (!accessToken) throw new Error('Your session expired. Please sign in again.')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!supabaseUrl || !anonKey) throw new Error('Supabase is not configured in this build')

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), SEND_TIMEOUT_MS)

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-rfq-resend`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rfq_ids: rfqIds }),
      signal: controller.signal,
    })

    if (!response.ok) throw new Error(await responseMessage(response))

    const payload = await response.json() as { error?: string; results?: unknown[] }
    if (payload.error) throw new Error(payload.error)
    if (!Array.isArray(payload.results)) throw new Error('The RFQ email service returned an invalid response')
    return payload
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('The RFQ email service did not respond within 20 seconds. Please try again.')
    }
    throw error instanceof Error ? error : new Error('Unable to call the RFQ email service')
  } finally {
    window.clearTimeout(timeout)
  }
}
