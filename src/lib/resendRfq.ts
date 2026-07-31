import { supabase } from './supabase'

export type ResendConnectionStatus = {
  connected: boolean
  mode: 'test' | 'production'
  from_email?: string | null
  test_recipient?: string | null
  error?: string | null
}

const SEND_TIMEOUT_MS = 20000

type SendResult = {
  error?: string | { code?: string; message?: string }
  results?: Array<{ id?: string; status?: string; error?: string; reason?: string }>
}

export async function getResendConnectionStatus() {
  const { data, error } = await supabase.functions.invoke<ResendConnectionStatus>('resend-connection-status')
  if (error) throw error
  return data
}

function showSendFailure(message: string) {
  console.error('[RFQ email]', message)
  if (typeof window !== 'undefined') window.alert(`RFQ email error:\n\n${message}`)
}

export async function sendRfqEmails(rfqIds: string[]) {
  if (!rfqIds.length) throw new Error('No RFQs were provided for sending')

  let timeoutId: number | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error('The RFQ email service did not respond within 20 seconds. Please try again.')),
      SEND_TIMEOUT_MS,
    )
  })

  try {
    const invokePromise = supabase.functions.invoke<SendResult>('send-rfq-resend', {
      body: { rfq_ids: rfqIds },
    })

    const { data, error } = await Promise.race([invokePromise, timeoutPromise])

    if (error) {
      let message = error.message || 'Unable to call the RFQ email service'
      try {
        const context = (error as { context?: Response }).context
        if (context && typeof context.clone === 'function') {
          const response = context.clone()
          const payload = await response.json() as { error?: string; message?: string }
          message = payload.error || payload.message || message
        }
      } catch {
        // Keep the original function error.
      }
      throw new Error(message)
    }

    if (!data) throw new Error('The RFQ email service returned no response')
    if (data.error) throw new Error(typeof data.error === 'string' ? data.error : data.error.message || 'Unable to send RFQs')
    if (!Array.isArray(data.results)) throw new Error('The RFQ email service returned an invalid response')

    const failed = data.results.filter(item => item.status === 'failed')
    if (failed.length === data.results.length && failed.length > 0) {
      throw new Error(failed.map(item => item.error || item.reason || 'RFQ could not be sent').join(' • '))
    }

    return data
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error('Unable to call the RFQ email service')
    showSendFailure(normalized.message)
    throw normalized
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  }
}
