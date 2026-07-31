import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { normalizeRfqNumber, replyToForRfq, rfqNumberFromRecipient, rfqNumbersFromText, sanitizeEmailHtml } from './rfq-email.ts'

Deno.test('normalizes deterministic RFQ reply-to addresses',()=>{
 assertEquals(normalizeRfqNumber(' RFQ 2026/001_A '),'rfq-2026-001-a')
 assertEquals(replyToForRfq('RFQ-2026-001'),'rfq-rfq-2026-001@whidelaede.resend.app')
})
Deno.test('matches the complete inbound recipient address only',()=>{
 assertEquals(rfqNumberFromRecipient('MIP <rfq-rfq-2026-001@whidelaede.resend.app>'),'RFQ-2026-001')
 assertEquals(rfqNumberFromRecipient('rfq-rfq-2026-001@attacker.example'),null)
})
Deno.test('extracts exact subject fallback candidates and exposes ambiguity',()=>{
 assertEquals(rfqNumbersFromText('Re: RFQ-2026-001'),['RFQ-2026-001'])
 assertEquals(rfqNumbersFromText('RFQ-2026-001 and RFQ-2026-002').length,2)
})
Deno.test('removes active content from received HTML',()=>assertEquals(sanitizeEmailHtml('<script>x()</script><p onclick="x()">Safe</p>'),'<p>Safe</p>'))
