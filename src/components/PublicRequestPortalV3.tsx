import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, MapPin, Plane, Plus, Sparkles, Ship, Trash2, Truck, Warehouse } from 'lucide-react'
import { supabase } from '../lib/supabase'

type Mode = 'air' | 'ocean' | 'ground' | 'warehouse' | ''
type Intent = 'quote' | 'booking'
type StartMode = 'choose' | 'paste' | 'form'

type Cargo = {
  id: string
  commodity: string
  packaging: string
  qty: string
  weight: string
  weightUnit: 'lb' | 'kg'
  length: string
  width: string
  height: string
  dimUnit: 'in' | 'cm'
}

type LocationDetails = {
  zip: string
  company: string
  address: string
  city: string
  state: string
  country: string
  contact: string
  phone: string
  instructions: string
}

type Leg = {
  id: string
  label: string
  from: string
  to: string
  mode: Mode
}

type Draft = {
  mode: Mode
  intent: Intent
  service: string
  origin: string
  destination: string
  readyDate: string
  company: string
  contactName: string
  email: string
  phone: string
  reference: string
  notes: string
  extraServices: string[]
}

const logo = 'https://raw.githubusercontent.com/N10ai/mip-tools/main/Untitled%20design%20-%201.png'
const modeOptions = [
  { id: 'air' as const, label: 'Air freight', copy: 'Fast international or domestic movement', icon: Plane },
  { id: 'ocean' as const, label: 'Ocean freight', copy: 'LCL, FCL and oversized cargo', icon: Ship },
  { id: 'ground' as const, label: 'Ground', copy: 'Local, LTL, FTL and drayage', icon: Truck },
  { id: 'warehouse' as const, label: 'Warehousing', copy: 'Storage, handling and fulfillment', icon: Warehouse },
]
const services = ['Pickup', 'Delivery', 'Customs clearance', 'Cargo insurance', 'Warehousing', 'Packing / crating', 'Cross-dock', 'FTZ handling', 'Bonded transport', 'Hazmat handling', 'Temperature controlled', 'Other']
const serviceDefaults: Record<Exclude<Mode, ''>, string> = {
  air: 'Air freight',
  ocean: 'Ocean freight',
  ground: 'Ground transportation',
  warehouse: 'Warehousing',
}

const emptyCargo = (): Cargo => ({ id: crypto.randomUUID(), commodity: '', packaging: 'pallet', qty: '1', weight: '', weightUnit: 'lb', length: '', width: '', height: '', dimUnit: 'in' })
const emptyLocation = (): LocationDetails => ({ zip: '', company: '', address: '', city: '', state: '', country: '', contact: '', phone: '', instructions: '' })
const emptyDraft = (): Draft => ({ mode: '', intent: 'quote', service: '', origin: '', destination: '', readyDate: '', company: '', contactName: '', email: '', phone: '', reference: '', notes: '', extraServices: [] })

function inferDraft(text: string) {
  const lower = text.toLowerCase()
  const mode: Mode = /ocean|sea freight|container|\bfcl\b|\blcl\b/.test(lower) ? 'ocean' : /truck|ground|ltl|ftl|drayage|local delivery/.test(lower) ? 'ground' : /warehouse|storage|fulfillment|pick and pack/.test(lower) ? 'warehouse' : /air|airport|airfreight|flight/.test(lower) ? 'air' : ''
  const intent: Intent = /book|booking|confirm shipment|ready to ship/.test(lower) ? 'booking' : 'quote'
  const zips = [...text.matchAll(/\b\d{5}(?:-\d{4})?\b/g)].map(x => x[0])
  const codes = [...text.matchAll(/\b[A-Z]{3}\b/g)].map(x => x[0]).filter(x => !['THE', 'AND', 'FOR', 'LBS', 'KGS', 'USD'].includes(x))
  const route = text.match(/(?:from|pickup(?: at)?)[\s:]+(.+?)(?:\s+(?:to|deliver(?:y)?(?: to)?|destination)[\s:]+)(.+?)(?:[.,\n]|$)/i)
  const origin = zips[0] || codes[0] || route?.[1]?.trim() || ''
  const destination = zips[1] || codes[1] || route?.[2]?.trim() || ''
  const packageMatch = text.match(/(\d+)\s*(pallets?|boxes?|cartons?|crates?|drums?|pieces?|containers?)/i)
  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(lb|lbs|pounds?|kg|kgs|kilograms?)/i)
  const dimsMatch = text.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(in|inch|inches|cm|centimeters?)?/i)
  const extraServices = services.filter(service => {
    const s = service.toLowerCase()
    if (service === 'Pickup') return /pickup|collect/.test(lower)
    if (service === 'Delivery') return /delivery|deliver/.test(lower)
    if (service === 'Customs clearance') return /customs|clearance|broker/.test(lower)
    if (service === 'Cargo insurance') return /insurance|insured/.test(lower)
    if (service === 'Warehousing') return /warehouse|storage/.test(lower)
    if (service === 'Packing / crating') return /packing|crating|crate/.test(lower)
    if (service === 'FTZ handling') return /\bftz\b|foreign trade zone/.test(lower)
    if (service === 'Hazmat handling') return /hazmat|dangerous goods|\bdg\b|\bun\d{4}\b/.test(lower)
    return lower.includes(s)
  })
  const cargo = emptyCargo()
  if (packageMatch) {
    cargo.qty = packageMatch[1]
    cargo.packaging = packageMatch[2].toLowerCase().replace(/s$/, '')
  }
  if (weightMatch) {
    cargo.weight = weightMatch[1]
    cargo.weightUnit = /^k/i.test(weightMatch[2]) ? 'kg' : 'lb'
  }
  if (dimsMatch) {
    cargo.length = dimsMatch[1]
    cargo.width = dimsMatch[2]
    cargo.height = dimsMatch[3]
    cargo.dimUnit = dimsMatch[4] && /^c/i.test(dimsMatch[4]) ? 'cm' : 'in'
  }
  return {
    draft: { ...emptyDraft(), mode, intent, service: mode ? serviceDefaults[mode] : '', origin, destination, extraServices, notes: text },
    cargo,
    found: [mode && `Service: ${serviceDefaults[mode]}`, origin && `Origin: ${origin}`, destination && `Destination: ${destination}`, packageMatch && `Cargo: ${packageMatch[1]} ${packageMatch[2]}`, weightMatch && `Weight: ${weightMatch[1]} ${weightMatch[2]}`, ...extraServices.map(x => `Service: ${x}`)].filter(Boolean) as string[],
  }
}

export function PublicRequestPortalV3() {
  const [startMode, setStartMode] = useState<StartMode>('choose')
  const [pasteText, setPasteText] = useState('')
  const [analysis, setAnalysis] = useState<ReturnType<typeof inferDraft> | null>(null)
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [cargo, setCargo] = useState<Cargo[]>([emptyCargo()])
  const [pickup, setPickup] = useState<LocationDetails>(emptyLocation())
  const [delivery, setDelivery] = useState<LocationDetails>(emptyLocation())
  const [pickupOpen, setPickupOpen] = useState(false)
  const [deliveryOpen, setDeliveryOpen] = useState(false)
  const [legs, setLegs] = useState<Leg[]>([])
  const [customService, setCustomService] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const totals = useMemo(() => cargo.reduce((sum, row) => {
    const qty = Number(row.qty) || 0
    const each = Number(row.weight) || 0
    const kg = (row.weightUnit === 'lb' ? each * .453592 : each) * qty
    const f = row.dimUnit === 'in' ? 2.54 : 1
    const cbm = (Number(row.length) || 0) * f * (Number(row.width) || 0) * f * (Number(row.height) || 0) * f / 1e6 * qty
    return { pieces: sum.pieces + qty, kg: sum.kg + kg, cbm: sum.cbm + cbm }
  }, { pieces: 0, kg: 0, cbm: 0 }), [cargo])

  const patch = (value: Partial<Draft>) => setDraft(current => ({ ...current, ...value }))
  const updateCargo = (id: string, value: Partial<Cargo>) => setCargo(rows => rows.map(row => row.id === id ? { ...row, ...value } : row))
  const toggleService = (service: string) => patch({ extraServices: draft.extraServices.includes(service) ? draft.extraServices.filter(x => x !== service) : [...draft.extraServices, service] })

  const useAnalysis = () => {
    if (!analysis) return
    setDraft(analysis.draft)
    setCargo([analysis.cargo])
    setStartMode('form')
    setStep(0)
  }

  const goDashboard = () => { location.hash = '#/' }

  const canContinue = step === 0 ? Boolean(draft.mode) : step === 1 ? Boolean(draft.origin && (draft.mode === 'warehouse' || draft.destination) && cargo.some(x => Number(x.qty) > 0)) : step === 2 ? Boolean(draft.email) : true

  const submit = async () => {
    setSubmitting(true)
    setMessage('')
    const serviceLegs = legs.map((leg, index) => ({ id: leg.id, type: leg.mode || 'ground', label: leg.label || `Leg ${index + 1}`, sequence: index + 1, origin: leg.from, destination: leg.to, details: { custom: true } }))
    if (pickup.zip || pickup.address) serviceLegs.unshift({ id: crypto.randomUUID(), type: 'pickup', label: 'Pickup', sequence: 0, origin: [pickup.company, pickup.address, pickup.city, pickup.state, pickup.zip, pickup.country].filter(Boolean).join(', '), destination: draft.origin, details: pickup })
    if (delivery.zip || delivery.address) serviceLegs.push({ id: crypto.randomUUID(), type: 'delivery', label: 'Delivery', sequence: serviceLegs.length + 1, origin: draft.destination, destination: [delivery.company, delivery.address, delivery.city, delivery.state, delivery.zip, delivery.country].filter(Boolean).join(', '), details: delivery })
    const payload = {
      company: draft.company,
      contactName: draft.contactName,
      email: draft.email,
      phone: draft.phone,
      referenceNumber: draft.reference,
      mode: draft.mode,
      serviceType: draft.service || (draft.mode ? serviceDefaults[draft.mode] : ''),
      originSearch: draft.origin,
      originName: draft.origin,
      destinationSearch: draft.destination,
      destinationName: draft.destination,
      cargoReadyDate: draft.readyDate,
      requestIntent: draft.intent,
      specialInstructions: draft.notes,
      extraServices: draft.extraServices,
      serviceLegs,
      cargo: cargo.map(row => ({ commodity: row.commodity, packagingType: row.packaging, cargoType: 'general', qty: Number(row.qty) || 0, weight: { value: Number(row.weight) || 0, unit: row.weightUnit }, dimensions: { length: { value: Number(row.length) || 0, unit: row.dimUnit }, width: { value: Number(row.width) || 0, unit: row.dimUnit }, height: { value: Number(row.height) || 0, unit: row.dimUnit } }, stackable: true })),
      totals: { weight: { kg: { value: +totals.kg.toFixed(2), unit: 'kg' } }, volume: { cbm: { value: +totals.cbm.toFixed(3), unit: 'm3' } }, chargeableWeight: { kg: { value: +Math.max(totals.kg, totals.cbm * 167).toFixed(2), unit: 'kg' } } },
      includeInland: Boolean(pickup.zip || delivery.zip || legs.length),
      pickup,
      delivery,
    }
    const { data, error } = await supabase.functions.invoke('submit-quote-request', { body: payload })
    setSubmitting(false)
    if (error) { setMessage(error.message); return }
    setMessage(`SUCCESS:${data.requestNumber}`)
  }

  if (message.startsWith('SUCCESS:')) return <div className="request-v3 success"><div className="request-v3-success"><span><Check /></span><small>REQUEST RECEIVED</small><h1>Thank you.</h1><p>Your reference is <b>{message.split(':')[1]}</b></p><button onClick={() => location.reload()}>Submit another request</button><button className="text" onClick={goDashboard}>Back to dashboard</button></div></div>

  if (startMode === 'choose') return <div className="request-v3"><header className="request-v3-header"><button onClick={goDashboard}><ArrowLeft /> Dashboard</button><div><img src={logo} /><span><b>MIP Cargo Express</b><small>Freight made simple</small></span></div></header><main className="request-v3-start"><small>NEW REQUEST</small><h1>How would you like to begin?</h1><p>Share what you know. You can add optional details later.</p><div className="request-v3-start-options"><button className="ai" onClick={() => setStartMode('paste')}><span><Sparkles /></span><div><b>Describe or paste shipment details</b><small>Fastest. Paste an email, message, or simple description.</small></div><ArrowRight /></button><button onClick={() => setStartMode('form')}><span><Plus /></span><div><b>Fill it myself</b><small>Answer a few short questions.</small></div><ArrowRight /></button></div></main></div>

  if (startMode === 'paste') return <div className="request-v3"><header className="request-v3-header"><button onClick={() => { setStartMode('choose'); setAnalysis(null) }}><ArrowLeft /> Back</button><div><img src={logo} /><span><b>MIP Cargo Express</b><small>AI-assisted request</small></span></div></header><main className="request-v3-paste"><small>SMART START</small><h1>Tell us about the shipment</h1><p>Paste a message or describe it naturally. You will review everything before submitting.</p><textarea autoFocus value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Example: Need air freight from 33174 to AMS. 2 pallets, 500 lb each, 48 x 40 x 50 in. Ready Friday. Include pickup and customs clearance." />{analysis && <section className="request-v3-analysis"><header><div><small>DRAFT CREATED</small><h2>Here’s what we found</h2></div><Check /></header><div>{analysis.found.length ? analysis.found.map(item => <span key={item}>{item}</span>) : <p>We could not identify enough details yet. Add the service, route, or cargo information.</p>}</div><p>You can correct or complete everything in the next screen.</p></section>}<footer><button className="secondary" onClick={() => setStartMode('choose')}>Cancel</button>{analysis ? <button className="primary" onClick={useAnalysis}>Use these details <ArrowRight /></button> : <button className="primary" disabled={!pasteText.trim()} onClick={() => setAnalysis(inferDraft(pasteText))}><Sparkles /> Create draft</button>}</footer></main></div>

  return <div className="request-v3"><header className="request-v3-header"><button onClick={step ? () => setStep(step - 1) : () => setStartMode('choose')}><ArrowLeft /> {step ? 'Back' : 'Start over'}</button><div><img src={logo} /><span><b>MIP Cargo Express</b><small>Request a quote</small></span></div><button className="dashboard-link" onClick={goDashboard}>Dashboard</button></header><div className="request-v3-progress"><span style={{ width: `${((step + 1) / 4) * 100}%` }} /></div><main className="request-v3-builder"><div className="request-v3-step-label">STEP {step + 1} OF 4</div>
    {step === 0 && <section><h1>What do you need?</h1><p>Choose the main service. Extra services come later.</p><div className="request-v3-mode-grid">{modeOptions.map(({ id, label, copy, icon: Icon }) => <button className={draft.mode === id ? 'selected' : ''} onClick={() => patch({ mode: id, service: serviceDefaults[id] })} key={id}><Icon /><span><b>{label}</b><small>{copy}</small></span>{draft.mode === id && <i><Check /></i>}</button>)}</div><div className="request-v3-intent"><span><b>What should we prepare?</b><small>You can change this later.</small></span><div><button className={draft.intent === 'quote' ? 'selected' : ''} onClick={() => patch({ intent: 'quote' })}>Quote</button><button className={draft.intent === 'booking' ? 'selected' : ''} onClick={() => patch({ intent: 'booking' })}>Booking</button></div></div></section>}
    {step === 1 && <section><h1>Route and cargo</h1><p>ZIP codes, airport codes, ports, or cities are enough.</p><div className="request-v3-route"><label><span>Origin *</span><input value={draft.origin} onChange={e => patch({ origin: e.target.value })} placeholder="ZIP, airport, port, or city" /></label>{draft.mode !== 'warehouse' && <label><span>Destination *</span><input value={draft.destination} onChange={e => patch({ destination: e.target.value })} placeholder="ZIP, airport, port, or city" /></label>}<label><span>Ready date</span><input type="date" value={draft.readyDate} onChange={e => patch({ readyDate: e.target.value })} /></label></div><div className="request-v3-cargo-list">{cargo.map((row, index) => <article key={row.id}><header><b>Cargo {index + 1}</b>{cargo.length > 1 && <button onClick={() => setCargo(v => v.filter(x => x.id !== row.id))}><Trash2 /></button>}</header><div className="request-v3-cargo-fields"><label className="commodity"><span>What is it?</span><input value={row.commodity} onChange={e => updateCargo(row.id, { commodity: e.target.value })} placeholder="General cargo, furniture…" /></label><label><span>Qty</span><input inputMode="numeric" value={row.qty} onChange={e => updateCargo(row.id, { qty: e.target.value })} /></label><label><span>Package</span><select value={row.packaging} onChange={e => updateCargo(row.id, { packaging: e.target.value })}><option>pallet</option><option>box</option><option>carton</option><option>crate</option><option>drum</option><option>piece</option><option>container</option><option>unknown</option></select></label><label><span>Weight each</span><div><input inputMode="decimal" value={row.weight} onChange={e => updateCargo(row.id, { weight: e.target.value })} placeholder="Optional" /><select value={row.weightUnit} onChange={e => updateCargo(row.id, { weightUnit: e.target.value as 'lb' | 'kg' })}><option>lb</option><option>kg</option></select></div></label><label className="dimensions"><span>Dimensions</span><div><input value={row.length} onChange={e => updateCargo(row.id, { length: e.target.value })} placeholder="L" /><input value={row.width} onChange={e => updateCargo(row.id, { width: e.target.value })} placeholder="W" /><input value={row.height} onChange={e => updateCargo(row.id, { height: e.target.value })} placeholder="H" /><select value={row.dimUnit} onChange={e => updateCargo(row.id, { dimUnit: e.target.value as 'in' | 'cm' })}><option>in</option><option>cm</option></select></div></label></div></article>)}</div><button className="request-v3-add" onClick={() => setCargo(v => [...v, emptyCargo()])}><Plus /> Add cargo line</button></section>}
    {step === 2 && <section><h1>Services and contact</h1><p>Add only what applies. Full addresses are optional.</p><div className="request-v3-services">{services.map(service => <button className={draft.extraServices.includes(service) ? 'selected' : ''} onClick={() => toggleService(service)} key={service}>{draft.extraServices.includes(service) ? <Check /> : <Plus />} {service}</button>)}</div>{draft.extraServices.includes('Other') && <div className="request-v3-custom-service"><input value={customService} onChange={e => setCustomService(e.target.value)} placeholder="Describe the other service" /><button disabled={!customService.trim()} onClick={() => { patch({ extraServices: [...draft.extraServices.filter(x => x !== 'Other'), customService.trim()] }); setCustomService('') }}>Add</button></div>}<div className="request-v3-optional-location"><button onClick={() => setPickupOpen(v => !v)}><span><MapPin /><b>Pickup details</b><small>{pickup.zip || 'Optional — ZIP code is enough'}</small></span>{pickupOpen ? <ChevronUp /> : <ChevronDown />}</button>{pickupOpen && <LocationForm value={pickup} onChange={setPickup} />}</div><div className="request-v3-optional-location"><button onClick={() => setDeliveryOpen(v => !v)}><span><MapPin /><b>Delivery details</b><small>{delivery.zip || 'Optional — ZIP code is enough'}</small></span>{deliveryOpen ? <ChevronUp /> : <ChevronDown />}</button>{deliveryOpen && <LocationForm value={delivery} onChange={setDelivery} />}</div><div className="request-v3-legs"><header><div><b>Shipment legs</b><small>Optional for multi-step or multimodal moves.</small></div><button onClick={() => setLegs(v => [...v, { id: crypto.randomUUID(), label: '', from: '', to: '', mode: 'ground' }])}><Plus /> Add leg</button></header>{legs.map((leg, index) => <article key={leg.id}><span>{index + 1}</span><div><input value={leg.label} onChange={e => setLegs(v => v.map(x => x.id === leg.id ? { ...x, label: e.target.value } : x))} placeholder="Leg name" /><div><input value={leg.from} onChange={e => setLegs(v => v.map(x => x.id === leg.id ? { ...x, from: e.target.value } : x))} placeholder="From" /><ArrowRight /><input value={leg.to} onChange={e => setLegs(v => v.map(x => x.id === leg.id ? { ...x, to: e.target.value } : x))} placeholder="To" /></div><select value={leg.mode} onChange={e => setLegs(v => v.map(x => x.id === leg.id ? { ...x, mode: e.target.value as Mode } : x))}><option value="ground">Ground</option><option value="air">Air</option><option value="ocean">Ocean</option><option value="warehouse">Warehouse</option></select></div><button onClick={() => setLegs(v => v.filter(x => x.id !== leg.id))}><Trash2 /></button></article>)}</div><div className="request-v3-contact"><label><span>Email *</span><input type="email" value={draft.email} onChange={e => patch({ email: e.target.value })} placeholder="you@company.com" /></label><label><span>Name</span><input value={draft.contactName} onChange={e => patch({ contactName: e.target.value })} /></label><label><span>Company</span><input value={draft.company} onChange={e => patch({ company: e.target.value })} /></label><label><span>Phone</span><input value={draft.phone} onChange={e => patch({ phone: e.target.value })} /></label><label className="full"><span>Reference / PO</span><input value={draft.reference} onChange={e => patch({ reference: e.target.value })} /></label><label className="full"><span>Anything else?</span><textarea value={draft.notes} onChange={e => patch({ notes: e.target.value })} placeholder="Special instructions, deadlines, or anything we should know" /></label></div></section>}
    {step === 3 && <section><h1>Review your request</h1><p>Check the essentials. You can go back to make changes.</p><div className="request-v3-review"><article className="route"><small>ROUTE</small><b>{draft.origin || 'Origin'} <ArrowRight /> {draft.mode === 'warehouse' ? 'Warehouse service' : draft.destination || 'Destination'}</b><span>{draft.service || (draft.mode ? serviceDefaults[draft.mode] : 'Service')}</span></article><article><small>REQUEST</small><b>{draft.intent === 'booking' ? 'Booking request' : 'Quote request'}</b><span>{draft.readyDate || 'Flexible date'}</span></article><article><small>CARGO</small><b>{totals.pieces} pieces · {totals.kg.toFixed(1)} kg</b><span>{totals.cbm.toFixed(3)} CBM</span></article><article><small>EXTRA SERVICES</small><b>{draft.extraServices.length ? draft.extraServices.join(', ') : 'None selected'}</b><span>{legs.length ? `${legs.length} additional leg${legs.length === 1 ? '' : 's'}` : 'Direct movement'}</span></article><article><small>CONTACT</small><b>{draft.company || draft.contactName || 'Customer'}</b><span>{draft.email}</span></article></div>{message && <div className="request-v3-error">{message}</div>}</section>}
    <footer className="request-v3-actions">{step > 0 ? <button className="secondary" onClick={() => setStep(step - 1)}><ArrowLeft /> Back</button> : <span />}{step < 3 ? <button className="primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continue <ArrowRight /></button> : <button className="primary" disabled={submitting} onClick={submit}>{submitting ? 'Submitting…' : 'Submit request'} <Check /></button>}</footer>
  </main></div>
}

function LocationForm({ value, onChange }: { value: LocationDetails; onChange: (value: LocationDetails) => void }) {
  const patch = (next: Partial<LocationDetails>) => onChange({ ...value, ...next })
  return <div className="request-v3-location-form"><label><span>ZIP / postal code</span><input value={value.zip} onChange={e => patch({ zip: e.target.value })} placeholder="33174" /></label><label><span>Company / location</span><input value={value.company} onChange={e => patch({ company: e.target.value })} /></label><label className="full"><span>Street address</span><input value={value.address} onChange={e => patch({ address: e.target.value })} /></label><label><span>City</span><input value={value.city} onChange={e => patch({ city: e.target.value })} /></label><label><span>State / province</span><input value={value.state} onChange={e => patch({ state: e.target.value })} /></label><label><span>Country</span><input value={value.country} onChange={e => patch({ country: e.target.value })} /></label><label><span>Contact</span><input value={value.contact} onChange={e => patch({ contact: e.target.value })} /></label><label><span>Phone</span><input value={value.phone} onChange={e => patch({ phone: e.target.value })} /></label><label className="full"><span>Instructions</span><input value={value.instructions} onChange={e => patch({ instructions: e.target.value })} /></label></div>
}
