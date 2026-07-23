import { Building2, Check, ChevronLeft, Mail, MapPin, Phone, Save, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ResponsiveVendorRateWorkspace } from './ResponsiveVendorRateWorkspace'
import type { RequestSummary } from './RequestWorkspace'

const vendorTypes=[['airline','Airline'],['gsa','GSA'],['air_cargo_agent','Air Cargo Agent'],['nvocc','NVOCC'],['ocean_carrier','Ocean Carrier'],['co_loader','Co-loader'],['trucker','Trucker'],['drayage_carrier','Drayage Carrier'],['customs_broker','Customs Broker'],['warehouse_cfs','Warehouse / CFS'],['courier','Courier'],['overseas_agent','Overseas Agent'],['service_provider','Other Service Provider']] as const
const modes=['air','ocean','ground','warehouse','customs']

type VendorForm={company:string;vendor_type:string;general_email:string;phone:string;payment_terms:string;default_currency:string;modes:string[];countries:string;preferred:boolean;notes:string}
const blank=():VendorForm=>({company:'',vendor_type:'service_provider',general_email:'',phone:'',payment_terms:'',default_currency:'USD',modes:[],countries:'',preferred:false,notes:''})

function buttonWithText(root:ParentNode,text:string){return Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(button=>(button.textContent||'').toLowerCase().includes(text.toLowerCase()))}

export function RfqQuickActions(){
 const[vendorOpen,setVendorOpen]=useState(false)
 const[form,setForm]=useState<VendorForm>(blank())
 const[saving,setSaving]=useState(false)
 const[error,setError]=useState('')
 const[rateRequest,setRateRequest]=useState<RequestSummary|null>(null)
 const[rateLoading,setRateLoading]=useState(false)

 useEffect(()=>{
  const click=async(event:MouseEvent)=>{
   const target=event.target as HTMLElement|null
   if(!target)return
   if(target.closest('.rfq-add-vendor')){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation()
    setError('');setForm(blank());setVendorOpen(true)
    return
   }
   const rateTarget=target.closest('.open-rate-workspace,.rfq-direct-rate,.pricing-workspace[data-mobile-rfq="rfqs"] .mobile-rfq-footer button:last-child')
   if(rateTarget){
    event.preventDefault();event.stopPropagation();event.stopImmediatePropagation()
    const requestText=document.querySelector('.pricing-workspace .pricing-head p')?.textContent||''
    const requestNumber=requestText.split('·')[0]?.trim()
    if(!requestNumber)return
    setRateLoading(true)
    const{data,error}=await supabase.from('quote_requests').select('*').eq('request_number',requestNumber).maybeSingle()
    setRateLoading(false)
    if(error||!data){setError(error?.message||'Unable to open rates for this request.');return}
    setRateRequest(data as RequestSummary)
   }
  }
  document.addEventListener('click',click,true)
  return()=>document.removeEventListener('click',click,true)
 },[])

 const toggleMode=(mode:string)=>setForm(current=>({...current,modes:current.modes.includes(mode)?current.modes.filter(x=>x!==mode):[...current.modes,mode]}))
 const closeVendor=()=>{if(saving)return;setVendorOpen(false);setError('')}
 const refreshRfq=()=>{
  const close=document.querySelector<HTMLButtonElement>('.pricing-workspace .pricing-close')
  close?.click()
  window.setTimeout(()=>{
   const drawer=document.querySelector('.pricing-decision-workspace')
   const reopen=drawer&&(buttonWithText(drawer,'request another vendor rate')||buttonWithText(drawer,'request vendor rfq'))
   reopen?.click()
  },160)
 }
 const saveVendor=async()=>{
  if(!form.company.trim()){setError('Company name is required.');return}
  setSaving(true);setError('')
  const payload={company:form.company.trim(),vendor_type:form.vendor_type,general_email:form.general_email.trim()||null,phone:form.phone.trim()||null,payment_terms:form.payment_terms||null,default_currency:form.default_currency,modes:form.modes,countries:form.countries.split(',').map(x=>x.trim()).filter(Boolean),preferred:form.preferred,status:'active',notes:form.notes.trim()||null}
  const{error}=await supabase.from('vendors').insert(payload)
  setSaving(false)
  if(error){setError(error.message);return}
  setVendorOpen(false)
  refreshRfq()
 }

 return <>
  {vendorOpen&&<div className="rfq-quick-vendor-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)closeVendor()}}>
   <section className="rfq-quick-vendor-sheet" role="dialog" aria-modal="true" aria-label="Add vendor">
    <header><button type="button" onClick={closeVendor}><ChevronLeft/></button><div><small>NEW VENDOR</small><h2>Add service provider</h2><p>Save it and continue selecting vendors.</p></div><button type="button" onClick={closeVendor}><X/></button></header>
    <main>
     <section className="quick-vendor-card primary"><label><span>Company name *</span><div><Building2/><input autoFocus value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Vendor company"/></div></label><label><span>Vendor type</span><select value={form.vendor_type} onChange={e=>setForm({...form,vendor_type:e.target.value})}>{vendorTypes.map(([value,name])=><option value={value} key={value}>{name}</option>)}</select></label></section>
     <section className="quick-vendor-card"><h3>Contact</h3><div className="quick-two"><label><span>Email</span><div><Mail/><input type="email" value={form.general_email} onChange={e=>setForm({...form,general_email:e.target.value})} placeholder="pricing@vendor.com"/></div></label><label><span>Phone</span><div><Phone/><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Optional"/></div></label></div></section>
     <section className="quick-vendor-card"><h3>Services</h3><div className="quick-mode-picker">{modes.map(mode=><button type="button" className={form.modes.includes(mode)?'active':''} onClick={()=>toggleMode(mode)} key={mode}>{form.modes.includes(mode)&&<Check/>}{mode}</button>)}</div><label><span>Countries / coverage</span><div><MapPin/><input value={form.countries} onChange={e=>setForm({...form,countries:e.target.value})} placeholder="United States, Ecuador, Peru"/></div></label></section>
     <section className="quick-vendor-card"><h3>Commercial</h3><div className="quick-two"><label><span>Payment terms</span><select value={form.payment_terms} onChange={e=>setForm({...form,payment_terms:e.target.value})}><option value="">Not specified</option><option>Prepaid</option><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></label><label><span>Currency</span><select value={form.default_currency} onChange={e=>setForm({...form,default_currency:e.target.value})}><option>USD</option><option>EUR</option><option>GBP</option><option>CAD</option></select></label></div><button type="button" className={`quick-preferred ${form.preferred?'active':''}`} onClick={()=>setForm({...form,preferred:!form.preferred})}><Star fill={form.preferred?'currentColor':'none'}/><span><b>Preferred vendor</b><small>Show this provider first in RFQ suggestions.</small></span></button><label><span>Internal notes</span><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Optional notes"/></label></section>
     {error&&<div className="quick-vendor-error">{error}</div>}
    </main>
    <footer><button type="button" className="secondary" onClick={closeVendor}>Cancel</button><button type="button" className="primary" disabled={saving} onClick={saveVendor}><Save/>{saving?'Saving…':'Save vendor'}</button></footer>
   </section>
  </div>}
  {rateLoading&&<div className="rfq-rate-loading">Opening vendor rates…</div>}
  {rateRequest&&<div className="rfq-rate-modal-layer"><ResponsiveVendorRateWorkspace request={rateRequest} onClose={()=>setRateRequest(null)} onChanged={()=>{}}/></div>}
 </>
}