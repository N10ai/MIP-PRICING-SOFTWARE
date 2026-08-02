import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, Copy, MoreHorizontal, Pencil, Plus, Save, Search, Send, Star, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getResendConnectionStatus, sendRfqEmails } from '../lib/resendRfq'
import { Button, StatusBadge } from './ui'
import type { RequestSummary } from './RequestWorkspace'

export type RfqWorkspaceMode = 'new-rfq-vendors' | 'new-rfq-template' | 'vendor-chat'
type Contact = { id: string; name: string | null; email: string | null; is_primary: boolean | null }
type Vendor = { id: string; company: string; vendor_type: string | null; preferred: boolean | null; modes: string[] | null; countries: string[] | null; general_email: string | null; vendor_contacts?: Contact[] }
type ExistingRfq = { id: string; rfq_number: string; status: string; sent_to: string | null; subject: string | null; message_body: string | null; sent_at: string | null; response_data: Record<string, unknown> | null; vendors?: { company?: string } | null }
type Message = { id: string; direction: 'outbound' | 'inbound'; sender_email: string | null; recipient_email: string | null; subject: string | null; body_text: string | null; status: string; sent_at: string | null; received_at: string | null; created_at: string; attachments: unknown[] }
type Template = { id: string; name: string; subject_template: string; body_template: string; is_default: boolean; active?: boolean }
type EditorTarget = 'subject' | 'body'
type VendorFilter = 'suggested' | 'all' | 'preferred' | 'air' | 'ocean' | 'trucking' | 'customs' | 'warehouse' | 'courier' | 'other'

const requestRoute = (request: RequestSummary) => `${request.origin_code || request.origin_name || 'Origin'} → ${request.destination_code || request.destination_name || 'Destination'}`
const rfqNumber = () => `RFQ-${new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 12)}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
const contact = (vendor: Vendor) => vendor.vendor_contacts?.find(item => item.is_primary && item.email) || vendor.vendor_contacts?.find(item => item.email)
const timestamp = (value: string | null) => value ? new Date(value).toLocaleString() : 'Pending'
const stripQuotedHistory = (value: string) => { const lines = value.split('\n'); const cutoff = lines.findIndex(line => /^\s*>/.test(line) || /^\s*On .+wrote:\s*$/i.test(line) || /^\s*-{2,}\s*Original Message/i.test(line)); return cutoff > 0 ? lines.slice(0, cutoff).join('\n').trim() : value }
const firstValue = (...values: unknown[]) => values.find(value => value !== null && value !== undefined && String(value).trim() !== '')
const normalize = (value: string | null | undefined) => String(value || '').toLowerCase().replaceAll('_', ' ')
const vendorTypeLabel = (value: string | null) => normalize(value || 'service provider').replace(/\b\w/g, letter => letter.toUpperCase())
const modeMatches = (vendor: Vendor, mode: string | null) => Boolean(mode && vendor.modes?.some(item => normalize(item) === normalize(mode)))
const vendorCategory = (vendor: Vendor): Exclude<VendorFilter, 'suggested' | 'all' | 'preferred'> => {
 const haystack = [vendor.vendor_type, ...(vendor.modes || [])].map(normalize).join(' ')
 if (/air|airline|gsa/.test(haystack)) return 'air'
 if (/ocean|nvocc|carrier|co loader/.test(haystack)) return 'ocean'
 if (/truck|drayage|ground/.test(haystack)) return 'trucking'
 if (/customs|broker/.test(haystack)) return 'customs'
 if (/warehouse|cfs|3pl/.test(haystack)) return 'warehouse'
 if (/courier|parcel/.test(haystack)) return 'courier'
 return 'other'
}

const tokenDefinitions = [
 ['Customer name', '{{customer_name}}'], ['Customer reference', '{{customer_reference}}'], ['Request number', '{{request_number}}'],
 ['Origin', '{{origin}}'], ['Destination', '{{destination}}'], ['Route', '{{route}}'], ['Mode', '{{mode}}'], ['Service level', '{{service_level}}'],
 ['Cargo summary', '{{cargo_summary}}'], ['Pieces', '{{pieces}}'], ['Weight', '{{weight}}'], ['Volume', '{{volume}}'], ['Commodity', '{{commodity}}'],
 ['Estimated departure', '{{estimated_departure}}'], ['Incoterm', '{{incoterm}}'], ['Special instructions', '{{special_instructions}}']
] as const

const tokenValues = (request: RequestSummary): Record<string, string> => {
 const raw = request as unknown as Record<string, unknown>
 const pieces = firstValue(raw.total_pieces, raw.pieces, 0)
 const weight = firstValue(raw.total_weight_kg, raw.weight_kg, 0)
 const volume = firstValue(raw.total_volume_cbm, raw.volume_cbm, 0)
 return {
  customer_name: String(firstValue(request.customer_company, request.contact_name, 'Customer')),
  customer_reference: String(firstValue(request.customer_reference, raw.reference, 'Not provided')),
  request_number: request.request_number,
  origin: String(firstValue(request.origin_code, request.origin_name, 'Origin')),
  destination: String(firstValue(request.destination_code, request.destination_name, 'Destination')),
  route: requestRoute(request),
  mode: String(firstValue(request.mode, 'Not specified')),
  service_level: String(firstValue(raw.service_level, raw.service, request.service_type, 'Not specified')),
  cargo_summary: `${Number(pieces)} pieces · ${Number(weight)} kg · ${Number(volume)} CBM`,
  pieces: String(pieces), weight: `${Number(weight)} kg`, volume: `${Number(volume)} CBM`,
  commodity: String(firstValue(raw.commodity, 'Not specified')),
  estimated_departure: String(firstValue(raw.estimated_departure, raw.requested_departure, 'Not specified')),
  incoterm: String(firstValue(raw.incoterm, 'Not specified')),
  special_instructions: String(firstValue(raw.special_instructions, raw.instructions, request.notes, 'None')),
 }
}

const renderTemplate = (value: string, request: RequestSummary) => Object.entries(tokenValues(request)).reduce((output, [key, replacement]) => output.replaceAll(`{{${key}}}`, replacement), value)

const rfqComposerPolish = `
.rfq-new-screen{--rfq-blue:#3478f6;--rfq-ink:#101114;--rfq-muted:#6f7682;--rfq-line:#e2e6ec;--rfq-soft:#f6f7f9;background:#fff}
.rfq-new-screen .rfq-vendor-filters{display:flex;gap:7px;overflow-x:auto;padding:1px 1px 5px;scrollbar-width:none}
.rfq-new-screen .rfq-vendor-filters::-webkit-scrollbar{display:none}
.rfq-new-screen .rfq-vendor-filters button{flex:0 0 auto;border:1px solid #d7dce4;border-radius:999px;background:#fff;color:#596273;padding:8px 12px;font:inherit;font-size:13px;font-weight:700;min-height:38px}
.rfq-new-screen .rfq-vendor-filters button.active{background:#101114;border-color:#101114;color:#fff}
.rfq-new-screen .rfq-vendor-result-label{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--rfq-muted);font-size:13px}
.rfq-new-screen .rfq-vendor-result-label b{color:var(--rfq-ink);font-size:15px}
.rfq-new-screen .rfq-vendor-meta{display:flex!important;gap:6px!important;align-items:center;flex-wrap:wrap}
.rfq-new-screen .rfq-vendor-meta i{font-style:normal;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#566173;background:#f2f4f7;border-radius:999px;padding:4px 7px}
.rfq-new-screen .rfq-vendor-meta i.suggested{color:#245fc5;background:#eaf2ff}
.rfq-new-screen .rfq-vendor-empty{padding:28px 18px;text-align:center;border:1px dashed #d6dce5;border-radius:16px;color:var(--rfq-muted);background:#fff}
.rfq-new-screen .rfq-template-screen{gap:14px;background:#fbfbfc}
.rfq-new-screen .rfq-selected-summary{padding:11px 13px;border-radius:14px}
.rfq-new-screen .rfq-template-manager{padding:12px 13px;gap:9px;border-radius:15px;box-shadow:none}
.rfq-new-screen .rfq-template-picker{grid-template-columns:minmax(0,1fr) auto auto;gap:8px;align-items:end}
.rfq-new-screen .rfq-template-picker label{min-width:0}
.rfq-new-screen .rfq-template-picker select{width:100%;min-width:0;padding:10px 11px;border-radius:12px}
.rfq-new-screen .rfq-template-picker>button,.rfq-new-screen .rfq-template-more>button{min-height:42px;border:1px solid #d7dce4;background:#fff;border-radius:12px;padding:0 11px;display:inline-flex;align-items:center;justify-content:center;gap:5px;color:#253044;font-weight:700}
.rfq-new-screen .rfq-template-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;color:var(--rfq-muted);font-size:12px}
.rfq-new-screen .rfq-template-meta button{min-height:38px;border:0;border-radius:11px;background:#eef4ff;color:#245fc5;padding:0 11px}
.rfq-new-screen .rfq-template-meta button:disabled{opacity:.45}
.rfq-new-screen .rfq-token-panel{order:3;padding:12px 13px;border-radius:15px;gap:9px;background:#f6f9ff}
.rfq-new-screen .rfq-token-panel header p{font-size:12px}
.rfq-new-screen .rfq-token-panel>div{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:7px;padding:1px 1px 5px;scroll-padding-inline:10px;scrollbar-width:none}
.rfq-new-screen .rfq-token-panel>div::-webkit-scrollbar{display:none}
.rfq-new-screen .rfq-token-panel>div button{flex:0 0 auto;white-space:nowrap;padding:7px 10px}
.rfq-new-screen .rfq-subject-field{order:4}
.rfq-new-screen .rfq-message-field{order:5;flex:1;min-height:300px}
.rfq-new-screen .rfq-message-field textarea{height:100%;min-height:300px;resize:vertical;font-weight:500;line-height:1.48}
.rfq-new-screen .rfq-template-preview{order:6}
.rfq-new-screen .rfq-template-screen>footer{order:7}
.rfq-new-screen .rfq-template-screen>p{order:8}
.rfq-new-screen .rfq-template-more{position:relative}
.rfq-new-screen .rfq-template-more .rfq-source-menu{top:48px;right:0;width:245px}
.rfq-new-screen .rfq-template-more .rfq-source-menu label{padding:8px;display:grid;gap:5px;color:#596273;font-size:12px}
.rfq-new-screen .rfq-template-more .rfq-source-menu input{border:1px solid #d7dce4;border-radius:10px;padding:9px;color:#101114;background:#fff}
@media(max-width:700px){
 .rfq-new-screen .rfq-context-header{padding:10px 12px}
 .rfq-new-screen .rfq-step-nav button{padding:13px 8px}
 .rfq-new-screen .rfq-vendor-screen,.rfq-new-screen .rfq-template-screen{padding:14px 14px 0}
 .rfq-new-screen .rfq-vendor-screen>header{gap:10px}
 .rfq-new-screen .rfq-vendor-screen>header h3{font-size:22px}
 .rfq-new-screen .rfq-vendor-screen>header p{font-size:12px;max-width:230px}
 .rfq-new-screen .rfq-vendor-screen>header button{font-size:12px;white-space:nowrap}
 .rfq-new-screen .rfq-template-picker{grid-template-columns:minmax(0,1fr) auto auto}
 .rfq-new-screen .rfq-template-picker label{grid-column:auto}
 .rfq-new-screen .rfq-template-picker>button,.rfq-new-screen .rfq-template-more>button{font-size:0;width:42px;padding:0}
 .rfq-new-screen .rfq-template-picker>button svg,.rfq-new-screen .rfq-template-more>button svg{margin:0}
 .rfq-new-screen .rfq-token-panel header{flex-direction:row;align-items:center}
 .rfq-new-screen .rfq-token-panel header>div:first-child p{display:none}
 .rfq-new-screen .rfq-message-field{min-height:340px}
 .rfq-new-screen .rfq-message-field textarea{min-height:340px}
 .rfq-new-screen .rfq-vendor-screen>footer,.rfq-new-screen .rfq-template-screen>footer{margin-inline:-14px;padding:14px 14px max(16px,env(safe-area-inset-bottom));gap:9px}
 .rfq-new-screen .rfq-template-screen>footer button{flex:1;min-width:0}
}
`

export function RfqComposer({ request, mode, rfqId, onModeChange, onClose, onCreated }: { request: RequestSummary; mode: RfqWorkspaceMode; rfqId: string | null; onModeChange: (mode: RfqWorkspaceMode, rfqId?: string) => void; onClose: () => void; onCreated: () => void }) {
 const [vendors, setVendors] = useState<Vendor[]>([])
 const [selected, setSelected] = useState<string[]>([])
 const [search, setSearch] = useState('')
 const [vendorFilter, setVendorFilter] = useState<VendorFilter>('suggested')
 const [rfqs, setRfqs] = useState<ExistingRfq[]>([])
 const [messages, setMessages] = useState<Message[]>([])
 const [templates, setTemplates] = useState<Template[]>([])
 const [templateId, setTemplateId] = useState('')
 const [templateName, setTemplateName] = useState('Standard RFQ')
 const [subject, setSubject] = useState('Rate request | {{request_number}} | {{route}}')
 const [body, setBody] = useState('Good morning,\n\nPlease provide your best rate for the shipment below.\n\nRequest number:\n{{request_number}}\n\nCustomer reference:\n{{customer_reference}}\n\nMode / service:\n{{mode}} · {{service_level}}\n\nRoute:\n{{route}}\n\nCargo:\n{{cargo_summary}}\n\nEstimated departure:\n{{estimated_departure}}\n\nSpecial instructions:\n{{special_instructions}}\n\nPlease include your complete freight and surcharge breakdown, minimum charges, routing, carrier, transit time, frequency, validity, inclusions, and exclusions.\n\nThank you,\nMIP Cargo Express')
 const [isDefault, setIsDefault] = useState(false)
 const [editingTemplate, setEditingTemplate] = useState(false)
 const [loading, setLoading] = useState(true)
 const [saving, setSaving] = useState(false)
 const [feedback, setFeedback] = useState('')
 const [followup, setFollowup] = useState('')
 const [menu, setMenu] = useState(false)
 const [templateMenu, setTemplateMenu] = useState(false)
 const [emailConnected, setEmailConnected] = useState<boolean | null>(null)
 const [editorTarget, setEditorTarget] = useState<EditorTarget>('body')
 const subjectRef = useRef<HTMLInputElement>(null)
 const bodyRef = useRef<HTMLTextAreaElement>(null)
 const active = useMemo(() => rfqs.find(item => item.id === rfqId) || null, [rfqs, rfqId])
 const selectedVendors = useMemo(() => vendors.filter(vendor => selected.includes(vendor.id)), [vendors, selected])
 const savedTemplate = templates.find(item => item.id === templateId)
 const templateChanged = !savedTemplate || templateName !== savedTemplate.name || subject !== savedTemplate.subject_template || body !== savedTemplate.body_template || isDefault !== Boolean(savedTemplate.is_default)
 const visibleVendors = useMemo(() => {
  const query = search.trim().toLowerCase()
  return vendors.filter(vendor => {
   const email = contact(vendor)?.email || vendor.general_email || ''
   const haystack = [vendor.company, email, vendor.vendor_type, ...(vendor.modes || []), ...(vendor.countries || [])].join(' ').toLowerCase()
   if (query && !haystack.includes(query)) return false
   if (vendorFilter === 'all') return true
   if (vendorFilter === 'preferred') return Boolean(vendor.preferred)
   if (vendorFilter === 'suggested') return Boolean(vendor.preferred || modeMatches(vendor, request.mode))
   return vendorCategory(vendor) === vendorFilter
  }).sort((a, b) => Number(Boolean(b.preferred)) - Number(Boolean(a.preferred)) || Number(modeMatches(b, request.mode)) - Number(modeMatches(a, request.mode)) || a.company.localeCompare(b.company))
 }, [vendors, search, vendorFilter, request.mode])

 const load = async () => {
  setLoading(true)
  const [v, r, t, status] = await Promise.all([
   supabase.from('vendors').select('id,company,vendor_type,preferred,modes,countries,general_email,vendor_contacts(id,name,email,is_primary)').is('archived_at', null).order('preferred', { ascending: false }).order('company'),
   supabase.from('vendor_rfqs').select('id,rfq_number,status,sent_to,subject,message_body,sent_at,response_data,vendors(company)').eq('quote_request_id', request.id).order('created_at', { ascending: false }),
   supabase.from('rfq_templates').select('id,name,subject_template,body_template,is_default,active').eq('active', true).order('is_default', { ascending: false }).order('name'),
   getResendConnectionStatus().catch(() => ({ connected: false }))
  ])
  setVendors((v.data || []) as unknown as Vendor[])
  setRfqs((r.data || []) as unknown as ExistingRfq[])
  const loaded = (t.data || []) as Template[]
  setTemplates(loaded)
  setEmailConnected(Boolean(status?.connected))
  const preferred = loaded.find(item => item.is_default) || loaded[0]
  if (preferred) applyTemplate(preferred)
  setLoading(false)
 }
 useEffect(() => { void load() }, [request.id])
 useEffect(() => {
  if (mode !== 'vendor-chat' || !rfqId) { setMessages([]); return }
  const fetchMessages = async () => { const { data } = await supabase.from('rfq_conversation_messages').select('id,direction,sender_email,recipient_email,subject,body_text,status,sent_at,received_at,created_at,attachments').eq('vendor_rfq_id', rfqId).order('created_at'); setMessages((data || []) as Message[]) }
  void fetchMessages()
  const channel = supabase.channel(`rfq-screen-${rfqId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'rfq_conversation_messages', filter: `vendor_rfq_id=eq.${rfqId}` }, () => void fetchMessages()).subscribe()
  return () => { void supabase.removeChannel(channel) }
 }, [mode, rfqId])

 function applyTemplate(template: Template) { setTemplateId(template.id); setTemplateName(template.name); setSubject(template.subject_template); setBody(template.body_template); setIsDefault(Boolean(template.is_default)); setEditingTemplate(false); setFeedback('') }
 const confirmDiscard = () => !templateChanged || confirm('Discard your unsaved template changes?')
 const closeComposer = () => { if (confirmDiscard()) onClose() }
 const chooseTemplate = (id: string) => { if (!confirmDiscard()) return; const template = templates.find(item => item.id === id); if (template) applyTemplate(template); else startNewTemplate() }
 const startNewTemplate = () => { setTemplateId(''); setTemplateName('New RFQ template'); setSubject('Rate request | {{request_number}} | {{route}}'); setBody('Good morning,\n\nPlease provide your best rate for {{route}}.\n\nRequest number: {{request_number}}\nCargo: {{cargo_summary}}\n\nThank you,\nMIP Cargo Express'); setIsDefault(false); setEditingTemplate(true); setTemplateMenu(false); setFeedback('New template draft') }
 const duplicateTemplate = () => { setTemplateId(''); setTemplateName(`${templateName} copy`); setIsDefault(false); setEditingTemplate(true); setTemplateMenu(false); setFeedback('Template duplicated. Save it as a new template.') }
 const saveTemplate = async (asNew = false) => { if (!templateName.trim() || !subject.trim() || !body.trim()) return; setSaving(true); setFeedback('Saving template…'); try { if (isDefault) { const { error } = await supabase.from('rfq_templates').update({ is_default: false }).neq('id', '00000000-0000-0000-0000-000000000000'); if (error) throw error } if (templateId && !asNew) { const { data, error } = await supabase.from('rfq_templates').update({ name: templateName.trim(), subject_template: subject, body_template: body, is_default: isDefault, active: true }).eq('id', templateId).select('id,name,subject_template,body_template,is_default,active').single(); if (error) throw error; const saved = data as Template; setTemplates(current => current.map(item => item.id === saved.id ? saved : { ...item, is_default: isDefault ? false : item.is_default })); applyTemplate(saved) } else { const { data, error } = await supabase.from('rfq_templates').insert({ name: templateName.trim(), subject_template: subject, body_template: body, is_default: isDefault, active: true }).select('id,name,subject_template,body_template,is_default,active').single(); if (error) throw error; const saved = data as Template; setTemplates(current => [saved, ...current.map(item => ({ ...item, is_default: isDefault ? false : item.is_default }))]); applyTemplate(saved) } setFeedback('Template saved') } catch (error) { setFeedback(error instanceof Error ? error.message : 'Unable to save template') } finally { setSaving(false) } }
 const deleteTemplate = async () => { if (!templateId || !confirm(`Delete template “${templateName}”?`)) return; setSaving(true); const { error } = await supabase.from('rfq_templates').update({ active: false, is_default: false }).eq('id', templateId); setSaving(false); if (error) { setFeedback(error.message); return } const remaining = templates.filter(item => item.id !== templateId); setTemplates(remaining); const next = remaining.find(item => item.is_default) || remaining[0]; if (next) applyTemplate(next); else startNewTemplate(); setFeedback('Template deleted') }
 const insertToken = (token: string) => { const ref = editorTarget === 'subject' ? subjectRef.current : bodyRef.current; const value = editorTarget === 'subject' ? subject : body; const start = ref?.selectionStart ?? value.length; const end = ref?.selectionEnd ?? start; const next = `${value.slice(0, start)}${token}${value.slice(end)}`; if (editorTarget === 'subject') setSubject(next); else setBody(next); requestAnimationFrame(() => { ref?.focus(); ref?.setSelectionRange(start + token.length, start + token.length) }) }
 const create = async () => { if (!selected.length || !subject.trim() || !body.trim() || emailConnected !== true) return; setSaving(true); setFeedback('Creating RFQ…'); try { const renderedSubject = renderTemplate(subject, request), renderedBody = renderTemplate(body, request); const rows = selectedVendors.map(vendor => ({ rfq_number: rfqNumber(), quote_request_id: request.id, vendor_id: vendor.id, vendor_contact_id: contact(vendor)?.id || null, status: 'draft', sent_to: contact(vendor)?.email || vendor.general_email, subject: renderedSubject, message_body: renderedBody, response_data: { template_id: templateId || null, template_name: templateName } })); const { data, error } = await supabase.from('vendor_rfqs').insert(rows).select('id,rfq_number,status,sent_to,subject,message_body,sent_at,response_data,vendors(company)'); if (error) throw error; const created = (data || []) as unknown as ExistingRfq[]; await sendRfqEmails(created.map(item => item.id)); await supabase.from('quote_requests').update({ status: 'vendor_rfq', last_activity_at: new Date().toISOString() }).eq('id', request.id); await supabase.from('commercial_activities').insert({ quote_request_id: request.id, activity_type: 'vendor_rfq_created', title: `${created.length} vendor RFQ${created.length === 1 ? '' : 's'} created`, description: `Rate requests sent to ${created.map(item => item.vendors?.company || item.sent_to).join(', ')}.`, actor_name: 'Pricing Team' }); setRfqs(current => [...created, ...current]); setFeedback('RFQ sent'); onCreated(); if (created[0]) onModeChange('vendor-chat', created[0].id) } catch (error) { setFeedback(error instanceof Error ? error.message : 'Unable to send RFQ') } finally { setSaving(false) } }
 const sendFollowup = async () => { if (!active || !followup.trim() || saving) return; setSaving(true); setFeedback('Sending…'); const { data, error } = await supabase.functions.invoke<{ error?: string }>('send-rfq-followup', { body: { vendor_rfq_id: active.id, message: followup.trim() } }); setSaving(false); if (error || data?.error) { setFeedback(data?.error || error?.message || 'Unable to send'); return } setFollowup(''); setFeedback('Sent') }
 const deleteChat = async () => { if (!active || !confirm(`Delete chat for ${active.vendors?.company || active.sent_to || 'this vendor'} (${active.rfq_number})? The RFQ and saved rates will remain.`)) return; const { error } = await supabase.from('rfq_conversation_messages').delete().eq('vendor_rfq_id', active.id); if (error) { setFeedback(error.message); return } setMessages([]); setMenu(false); onCreated() }
 const deleteRfq = async () => { if (!active || !confirm(`Delete RFQ ${active.rfq_number} for ${active.vendors?.company || active.sent_to || 'this vendor'} and its chat? Saved rate data and messages for this RFQ will be deleted; the request and other RFQs remain.`)) return; const { error } = await supabase.from('vendor_rfqs').delete().eq('id', active.id); if (error) { setFeedback(error.message); return } setMenu(false); onCreated(); onClose() }

 if (loading) return <div className="rfq-source-overlay"><section className="rfq-source-screen rfq-loading">Loading RFQ workspace…</section></div>
 if (mode === 'vendor-chat') return <div className="rfq-source-overlay"><section className="rfq-source-screen rfq-chat-screen" aria-label="Vendor conversation"><header className="rfq-chat-header"><div><small>VENDOR CONVERSATION</small><h2>{active?.vendors?.company || active?.sent_to || 'Conversation unavailable'}</h2><p>{active?.rfq_number || 'RFQ not found'} · {active?.sent_to || 'No recipient'}</p></div><div><button onClick={onClose} aria-label="Close conversation"><X /></button><button onClick={() => setMenu(!menu)} aria-label="Conversation menu"><MoreHorizontal /></button>{menu && <div className="rfq-source-menu"><button onClick={deleteChat}><Trash2 />Delete chat</button><button className="danger" onClick={deleteRfq}><Trash2 />Delete RFQ</button></div>}</div></header>{active?.response_data && Number(active.response_data.total) > 0 && <div className="rfq-rate-strip"><span>Total</span><b>{String(active.response_data.currency || 'USD')} {Number(active.response_data.total).toFixed(2)}</b>{Boolean(active.response_data.carrier) && <span>{String(active.response_data.carrier)}</span>}{Boolean(active.response_data.transit) && <span>{String(active.response_data.transit)}</span>}</div>}<main className="rfq-thread">{active && messages.length === 0 && active.message_body && <article className="rfq-bubble outbound"><small>MIP Pricing Team · {timestamp(active.sent_at)}</small><b>{active.subject}</b><p>{active.message_body}</p><StatusBadge status={active.status} /></article>}{messages.map(item => <article key={item.id} className={`rfq-bubble ${item.direction}`}><small>{item.direction === 'outbound' ? 'MIP Pricing Team' : item.sender_email || 'Vendor'} · {timestamp(item.sent_at || item.received_at || item.created_at)}</small>{item.subject && <b>{item.subject}</b>}<p>{stripQuotedHistory(item.body_text || 'No message body')}</p><StatusBadge status={item.status} /></article>)}</main><footer className="rfq-followup"><div className="rfq-quick-replies">{[['Validity', 'Please confirm the rate validity and expiration date.'], ['Inclusions', 'Please confirm which charges are included.'], ['Transit', 'Please confirm transit time, routing, and frequency.']].map(([label, value]) => <button key={label} onClick={() => setFollowup(value)}>{label}</button>)}</div><div><textarea aria-label="Follow-up message" value={followup} onChange={event => setFollowup(event.target.value)} placeholder="Write a message…" rows={2} /><button onClick={sendFollowup} disabled={!active || saving || !followup.trim()} aria-label="Send follow-up"><Send /></button></div>{feedback && <small role="status">{feedback}</small>}</footer></section></div>

 const filterOptions: Array<[VendorFilter, string]> = [['suggested', 'Suggested'], ['all', 'All'], ['preferred', 'Preferred'], ['air', 'Air'], ['ocean', 'Ocean'], ['trucking', 'Trucking'], ['customs', 'Customs'], ['warehouse', 'Warehouse'], ['courier', 'Courier'], ['other', 'Other']]
 return <div className="rfq-source-overlay"><section className="rfq-source-screen rfq-new-screen" aria-label="New vendor RFQ"><style>{rfqComposerPolish}</style><header className="rfq-context-header"><button onClick={closeComposer}><ChevronLeft />Back to request</button><div><small>{request.request_number}</small><h2>{requestRoute(request)}</h2><p>{request.customer_company || request.contact_name || 'Customer'}</p></div><button onClick={closeComposer} aria-label="Close"><X /></button></header><nav className="rfq-step-nav" aria-label="New RFQ steps"><button className={mode === 'new-rfq-vendors' ? 'active' : ''} onClick={() => onModeChange('new-rfq-vendors')}>1 <span>Vendors</span></button><button className={mode === 'new-rfq-template' ? 'active' : ''} onClick={() => selected.length && onModeChange('new-rfq-template')} disabled={!selected.length}>2 <span>Template</span></button></nav>{mode === 'new-rfq-vendors' ? <main className="rfq-vendor-screen"><header><div><small>VENDOR DIRECTORY</small><h3>Select recipients</h3><p>Choose any vendor. Suggested vendors are prioritized, never required.</p></div><button onClick={() => { onClose(); location.hash = '#/vendors' }}><Plus />Add vendor</button></header><label className="rfq-vendor-search"><Search /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search company, email, type, mode or country" /></label><div className="rfq-vendor-filters" role="tablist" aria-label="Vendor filters">{filterOptions.map(([value, label]) => <button key={value} className={vendorFilter === value ? 'active' : ''} onClick={() => setVendorFilter(value)}>{label}</button>)}</div><div className="rfq-vendor-result-label"><b>{vendorFilter === 'suggested' ? 'Suggested for this shipment' : `${filterOptions.find(([value]) => value === vendorFilter)?.[1]} vendors`}</b><span>{visibleVendors.length} shown · {selected.length} selected</span></div><div className="rfq-vendor-list">{visibleVendors.map(vendor => { const email = contact(vendor)?.email || vendor.general_email; const checked = selected.includes(vendor.id); const suggested = Boolean(vendor.preferred || modeMatches(vendor, request.mode)); return <button key={vendor.id} className={checked ? 'selected' : ''} disabled={!email} onClick={() => setSelected(current => checked ? current.filter(id => id !== vendor.id) : [...current, vendor.id])}><span><b>{vendor.company}{vendor.preferred && <em><Star size={14} />Preferred</em>}</b><small>{email || 'Email required'}</small><span className="rfq-vendor-meta"><i>{vendorTypeLabel(vendor.vendor_type)}</i>{suggested && <i className="suggested">Suggested</i>}</span></span><span className="rfq-vendor-check">{checked && <Check />}</span></button> })}</div>{visibleVendors.length === 0 && <div className="rfq-vendor-empty">No vendors match this filter. Choose All or clear the search.</div>}<footer><span>{selected.length} selected</span><Button onClick={() => onModeChange('new-rfq-template')} disabled={!selected.length}>Continue to Template</Button></footer></main> : <main className="rfq-template-screen"><section className="rfq-selected-summary"><small>RECIPIENTS</small><div>{selectedVendors.map(vendor => <span key={vendor.id}>{vendor.company}<button aria-label={`Remove ${vendor.company}`} onClick={() => setSelected(current => current.filter(id => id !== vendor.id))}><X size={14} /></button></span>)}</div></section><section className="rfq-template-manager"><div className="rfq-template-picker"><label>Template<select value={templateId} onChange={event => chooseTemplate(event.target.value)}><option value="">Unsaved template</option>{templates.map(template => <option key={template.id} value={template.id}>{template.is_default ? '★ ' : ''}{template.name}</option>)}</select></label><button onClick={() => setEditingTemplate(true)} disabled={!templateId}><Pencil />Edit</button><div className="rfq-template-more"><button onClick={() => setTemplateMenu(value => !value)} aria-label="More template actions"><MoreHorizontal />More</button>{templateMenu && <div className="rfq-source-menu"><button onClick={startNewTemplate}><Plus />New template</button><button onClick={duplicateTemplate}><Copy />Duplicate</button><label>Template name<input value={templateName} onChange={event => { setTemplateName(event.target.value); setEditingTemplate(true) }} /></label><button onClick={() => saveTemplate(true)} disabled={saving}><Copy />Save as new</button><button onClick={() => { setIsDefault(true); setEditingTemplate(true); setTemplateMenu(false) }} disabled={isDefault}><Star />Make default</button><button className="danger" onClick={deleteTemplate} disabled={!templateId || isDefault}><Trash2 />Delete template</button></div>}</div></div><div className="rfq-template-meta"><span>{templateChanged ? 'Unsaved changes' : 'Up to date'}</span><button onClick={() => saveTemplate(false)} disabled={saving || !templateChanged}><Save />Save changes</button></div></section><section className="rfq-token-panel"><header><div><small>DYNAMIC FIELDS</small><p>Insert request data at the cursor.</p></div><div><button className={editorTarget === 'subject' ? 'active' : ''} onClick={() => setEditorTarget('subject')}>Subject</button><button className={editorTarget === 'body' ? 'active' : ''} onClick={() => setEditorTarget('body')}>Message</button></div></header><div>{tokenDefinitions.map(([label, token]) => <button key={token} onClick={() => insertToken(token)}>{label}</button>)}</div></section><label className="rfq-subject-field">Subject<input ref={subjectRef} value={subject} onFocus={() => setEditorTarget('subject')} onChange={event => { setSubject(event.target.value); setEditingTemplate(true) }} /></label><label className="rfq-message-field">Message<textarea ref={bodyRef} value={body} onFocus={() => setEditorTarget('body')} onChange={event => { setBody(event.target.value); setEditingTemplate(true) }} rows={12} /></label><details className="rfq-template-preview"><summary>Preview with request data</summary><div><b>{renderTemplate(subject, request)}</b><p>{renderTemplate(body, request)}</p></div></details><footer><Button variant="secondary" onClick={() => onModeChange('new-rfq-vendors')}>Back to Vendors</Button><Button onClick={create} disabled={saving || !selected.length || emailConnected !== true || !subject.trim() || !body.trim()} title={!selected.length ? 'Select at least one recipient' : emailConnected !== true ? 'Email sending is unavailable' : !subject.trim() ? 'Enter a subject' : !body.trim() ? 'Enter a message' : ''}><Send />{saving ? 'Sending…' : `Send ${selected.length} RFQ${selected.length === 1 ? '' : 's'}`}</Button></footer>{!selected.length && <p role="alert">Select at least one recipient before sending.</p>}{emailConnected === false && <p role="alert">Email sending is unavailable. Configure the Resend connection.</p>}{feedback && <p role="status">{feedback}</p>}</main>}</section></div>
}
