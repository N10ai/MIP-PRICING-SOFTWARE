import { supabase } from './supabase'

export type ResendConnectionStatus = {
  connected: boolean
  mode: 'test' | 'production'
  from_email?: string | null
  test_recipient?: string | null
  error?: string | null
}

const SEND_TIMEOUT_MS = 20000
const SENDABLE_STATUSES = new Set(['draft', 'failed'])

type SendResult = {
  error?: string | { code?: string; message?: string }
  results?: Array<{ id?: string; status?: string; error?: string; reason?: string }>
}

type RfqSendState = {
  id: string
  rfq_number: string | null
  status: string | null
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

async function getSendableRfqIds(rfqIds: string[]) {
  const uniqueIds = [...new Set(rfqIds.filter(Boolean))]
  if (!uniqueIds.length) throw new Error('No RFQs were provided for sending')

  const { data, error } = await supabase
    .from('vendor_rfqs')
    .select('id,rfq_number,status')
    .in('id', uniqueIds)

  if (error) throw new Error(error.message || 'Unable to verify RFQ send status')

  const rows = (data || []) as RfqSendState[]
  const rowsById = new Map(rows.map(row => [row.id, row]))
  const missingIds = uniqueIds.filter(id => !rowsById.has(id))
  if (missingIds.length) throw new Error('One or more RFQs could not be found. Refresh the workspace and try again.')

  const blocked = rows.filter(row => !SENDABLE_STATUSES.has(String(row.status || 'draft').toLowerCase()))
  if (blocked.length) {
    const details = blocked
      .map(row => `${row.rfq_number || row.id} is already ${String(row.status || 'processed').replaceAll('_', ' ')}`)
      .join(' • ')
    throw new Error(`${details}. Open the existing conversation instead of sending it again.`)
  }

  return uniqueIds
}

export async function sendRfqEmails(rfqIds: string[]) {
  const sendableIds = await getSendableRfqIds(rfqIds)

  let timeoutId: number | undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error('The RFQ email service did not respond within 20 seconds. Please try again.')),
      SEND_TIMEOUT_MS,
    )
  })

  try {
    const invokePromise = supabase.functions.invoke<SendResult>('send-rfq-resend', {
      body: { rfq_ids: sendableIds },
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
