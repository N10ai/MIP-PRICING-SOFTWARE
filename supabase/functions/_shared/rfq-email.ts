export const DEFAULT_INBOUND_DOMAIN = 'whidelaede.resend.app'

export function normalizeRfqNumber(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function replyToForRfq(rfqNumber: string, domain = DEFAULT_INBOUND_DOMAIN): string {
  return `rfq-${normalizeRfqNumber(rfqNumber)}@${domain.trim().toLowerCase()}`
}

export function rfqNumberFromRecipient(value: string, domain = DEFAULT_INBOUND_DOMAIN): string | null {
  const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = value.match(new RegExp(`(?:^|[<,\\s])rfq-([a-z0-9-]+)@${escaped}(?:>|,|\\s|$)`, 'i'))
  return match ? match[1].toUpperCase() : null
}

export function rfqNumbersFromText(...values: unknown[]): string[] {
  const matches = values.filter(value => typeof value === 'string').join(' ').match(/RFQ-[A-Z0-9]+(?:-[A-Z0-9]+)*/gi) || []
  return [...new Set(matches.map(value => value.toUpperCase()))]
}

export function sanitizeEmailHtml(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  return value
    .replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"')
}
