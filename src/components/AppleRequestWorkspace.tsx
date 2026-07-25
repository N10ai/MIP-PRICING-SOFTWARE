import { ArrowRight, Box, CheckCircle2, Clock3, FileText, Mail, MapPin, Plane, Ship, Target, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type RequestRecord = {
  id: string
  request_number: string
  customer_company: string | null
  contact_name: string | null
  contact_email: string
  mode: string | null
  service_type: string | null
  origin_code: string | null
  origin_name: string | null
  destination_code: string | null
  destination_name: string | null
  status: string | null
  submitted_at: string
  notes: string | null
  customer_reference: string | null
  target_rate_amount: number | null
  target_rate_currency: string | null
}

type Cargo = { id:string; quantity:number|null; packaging_type:string|null; commodity:string|null; weight_value:number|null; weight_unit:string|null; length_value:number|null; width_value:number|null; height_value:number|null; dimension_unit:string|null }
type Rfq = { id:string; status:string|null; sent_to:string|null; selected_at:string|null; vendors?:{company?:string}|null }
type Activity = { id:string; title:string; description:string|null; created_at:string }

const route = (request: RequestRecord) => `${request.origin_code || request.origin_name || '—'} → ${request.destination_code || request.destination_name || '—'}`
const modeIcon = (mode: string | null) => mode === 'air' ? <Plane size={20}/> : mode === 'ocean' ? <Ship size={20}/> : <Truck size={20}/>

export function AppleRequestWorkspace({ requestId }: { requestId: string }) {
  const navigate = useNavigate()
  const [request, setRequest] = useState<RequestRecord | null>(null)
  const [cargo, setCargo] = useState<Cargo[]>([])
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      supabase.from('quote_requests').select('*').eq('id', requestId).single(),
      supabase.from('quote_request_cargo').select('*').eq('quote_request_id', requestId).order('line_number'),
      supabase.from('vendor_rfqs').select('id,status,sent_to,selected_at,vendors(company)').eq('quote_request_id', requestId).order('created_at', { ascending: false }),
      supabase.from('commercial_activities').select('id,title,description,created_at').eq('quote_request_id', requestId).order('created_at', { ascending: false }).limit(8),
    ]).then(([requestResult, cargoResult, rfqResult, activityResult]) => {
      if (!active) return
      setRequest((requestResult.data || null) as RequestRecord | null)
      setCargo((cargoResult.data || []) as Cargo[])
      setRfqs((rfqResult.data || []) as unknown as Rfq[])
      setActivity((activityResult.data || []) as Activity[])
    }).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [requestId])

  const metrics = useMemo(() => {
    let pieces = 0
    let weight = 0
    let cbm = 0
    cargo.forEach(line => {
      const quantity = Number(line.quantity) || 1
      pieces += quantity
      const weightValue = Number(line.weight_value) || 0
      weight += String(line.weight_unit || 'kg').toLowerCase() === 'lb' ? weightValue * .453592 * quantity : weightValue * quantity
      const unit = String(line.dimension_unit || 'cm').toLowerCase()
      const factor = unit === 'in' ? 2.54 : unit === 'm' ? 100 : 1
      cbm += (Number(line.length_value)||0)*factor*(Number(line.width_value)||0)*factor*(Number(line.height_value)||0)*factor/1e6*quantity
    })
    return { pieces, weight, cbm }
  }, [cargo])

  if (loading) return <section className="apple-request-workspace"><div className="apple-request-loading"><span/><span/><span/></div></section>
  if (!request) return <section className="apple-request-workspace"><div className="apple-request-empty"><h2>Request not found</h2><button onClick={() => navigate('/requests')}>Return to requests</button></div></section>

  const responded = rfqs.filter(item => ['responded','received','selected','accepted'].includes(String(item.status).toLowerCase())).length
  const pending = Math.max(0, rfqs.length - responded)

  return <section className="apple-request-workspace">
    <header className="apple-request-head">
      <div className="apple-request-mode">{modeIcon(request.mode)}</div>
      <div className="apple-request-title">
        <small>{request.request_number}</small>
        <h1>{route(request)}</h1>
        <p>{request.customer_company || request.contact_name || 'Guest request'} · {request.mode || 'Freight'} {request.service_type || ''}</p>
      </div>
      <span className={`apple-request-status status-${String(request.status || 'new').replaceAll('_','-')}`}>{String(request.status || 'new').replaceAll('_',' ')}</span>
    </header>

    <div className="apple-request-commandbar">
      <button className="primary" onClick={() => navigate(`/quotes?request=${request.id}`)}>Build quote <ArrowRight size={15}/></button>
      <button onClick={() => window.dispatchEvent(new CustomEvent('open-request-rfq', { detail: { requestId: request.id } }))}>Request vendor rates</button>
    </div>

    <main className="apple-request-document">
      <section className="apple-request-section apple-request-overview">
        <div className="apple-section-label">SHIPMENT OVERVIEW</div>
        <div className="apple-fact-grid">
          <article><Mail size={17}/><span>Customer</span><b>{request.customer_company || request.contact_name || 'Guest request'}</b><small>{request.contact_email}</small></article>
          <article><MapPin size={17}/><span>Route</span><b>{route(request)}</b><small>{request.mode || 'Freight'} · {request.service_type || 'Service pending'}</small></article>
          <article><Box size={17}/><span>Cargo</span><b>{metrics.pieces || cargo.length} pieces · {metrics.weight.toFixed(1)} kg</b><small>{metrics.cbm.toFixed(3)} CBM</small></article>
          <article><Target size={17}/><span>Target</span><b>{request.target_rate_amount ? `${request.target_rate_currency || 'USD'} ${Number(request.target_rate_amount).toLocaleString('en-US')}` : 'Open to best rate'}</b><small>{request.customer_reference || 'No customer reference'}</small></article>
        </div>
      </section>

      <section className="apple-request-section">
        <div className="apple-section-heading"><div><div className="apple-section-label">VENDOR PRICING</div><h2>{rfqs.length ? `${rfqs.length} vendor request${rfqs.length === 1 ? '' : 's'}` : 'Vendor pricing required'}</h2></div><button onClick={() => window.dispatchEvent(new CustomEvent('open-request-rfq', { detail: { requestId: request.id } }))}>Manage RFQs</button></div>
        <div className="apple-pricing-strip">
          <article><CheckCircle2 size={18}/><strong>{responded}</strong><span>Responded</span></article>
          <article><Clock3 size={18}/><strong>{pending}</strong><span>Pending</span></article>
          <article><FileText size={18}/><strong>{rfqs.some(item => item.selected_at) ? 'Selected' : 'Open'}</strong><span>Decision</span></article>
        </div>
      </section>

      {cargo.length > 0 && <section className="apple-request-section">
        <div className="apple-section-label">CARGO LINES</div>
        <div className="apple-cargo-list">{cargo.map(line => <article key={line.id}><div><b>{line.quantity || 1} {line.packaging_type || 'piece(s)'}</b><span>{line.commodity || 'Cargo'}</span></div><small>{line.weight_value || 0} {line.weight_unit || 'kg'} · {line.length_value || 0}×{line.width_value || 0}×{line.height_value || 0} {line.dimension_unit || 'cm'}</small></article>)}</div>
      </section>}

      {(request.notes || activity.length > 0) && <section className="apple-request-section">
        <div className="apple-section-label">ACTIVITY & NOTES</div>
        {request.notes && <p className="apple-request-notes">{request.notes}</p>}
        <div className="apple-activity-list">{activity.map(item => <article key={item.id}><span/><div><b>{item.title}</b><p>{item.description || new Date(item.created_at).toLocaleString()}</p></div><time>{new Date(item.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</time></article>)}</div>
      </section>}
    </main>
  </section>
}
