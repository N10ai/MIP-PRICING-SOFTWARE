import { Building2, Mail, MapPin, Phone, Search, Star, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button, EmptyState, GlassCard, StatusBadge } from './ui'

type Contact={id:string;name:string|null;email:string|null;phone:string|null;department:string|null;is_primary:boolean|null}
type Vendor={id:string;company:string;vendor_type:string;general_email:string|null;phone:string|null;website:string|null;payment_terms:string|null;modes:string[]|null;countries:string[]|null;preferred:boolean|null;notes:string|null;status:string;vendor_contacts:Contact[]|null}
type Rfq={id:string;rfq_number:string;status:string;sent_at:string|null;created_at:string;quote_requests:{request_number:string;origin_code:string|null;destination_code:string|null}|null}

const typeLabel=(value:string)=>value.replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())

function VendorDrawer({vendor,onClose}:{vendor:Vendor|null;onClose:()=>void}){
 const[rfqs,setRfqs]=useState<Rfq[]>([]);const[loading,setLoading]=useState(false)
 useEffect(()=>{if(!vendor)return;setLoading(true);supabase.from('vendor_rfqs').select('id,rfq_number,status,sent_at,created_at,quote_requests(request_number,origin_code,destination_code)').eq('vendor_id',vendor.id).order('created_at',{ascending:false}).limit(20).then(({data})=>{setRfqs((data||[]) as unknown as Rfq[]);setLoading(false)})},[vendor])
 if(!vendor)return null
 const primary=(vendor.vendor_contacts||[]).find(contact=>contact.is_primary)||(vendor.vendor_contacts||[])[0]
 return <div className="vendor-overlay" onMouseDown={event=>{if(event.target===event.currentTarget)onClose()}}><aside className="vendor-drawer">
  <header className="vendor-drawer-head"><div className="vendor-icon"><Building2 size={22}/></div><div><span>{typeLabel(vendor.vendor_type)}</span><h2>{vendor.company}</h2></div><button onClick={onClose}><X size={20}/></button></header>
  <div className="vendor-drawer-body">
   <section className="vendor-overview">
    <div><small>Status</small><StatusBadge status={vendor.status}/></div><div><small>Preferred</small><b>{vendor.preferred?'Yes':'No'}</b></div><div><small>Payment terms</small><b>{vendor.payment_terms||'Not set'}</b></div>
   </section>
   <section><h3>Contact information</h3><div className="vendor-contact-card">
    <div><Mail size={16}/><span>{primary?.email||vendor.general_email||'No email saved'}</span></div>
    <div><Phone size={16}/><span>{primary?.phone||vendor.phone||'No phone saved'}</span></div>
    {primary?.name&&<div><Building2 size={16}/><span>{primary.name}{primary.department?` · ${primary.department}`:''}</span></div>}
   </div></section>
   <section><h3>Coverage</h3><div className="vendor-chip-row">{(vendor.modes||[]).map(mode=><span key={mode}>{mode}</span>)}{!(vendor.modes||[]).length&&<span>All modes</span>}</div><div className="vendor-chip-row countries">{(vendor.countries||[]).map(country=><span key={country}><MapPin size={12}/>{country}</span>)}{!(vendor.countries||[]).length&&<span>Countries not specified</span>}</div></section>
   {vendor.notes&&<section><h3>Internal notes</h3><p className="vendor-notes">{vendor.notes}</p></section>}
   <section><div className="vendor-section-title"><h3>Recent RFQs</h3><span>{rfqs.length}</span></div>{loading?<div className="vendor-loading">Loading RFQs…</div>:rfqs.length?<div className="vendor-rfq-list">{rfqs.map(rfq=><article key={rfq.id}><div><b>{rfq.rfq_number}</b><small>{rfq.quote_requests?.request_number||'Request'} · {rfq.quote_requests?.origin_code||'—'} → {rfq.quote_requests?.destination_code||'—'}</small></div><StatusBadge status={rfq.status}/></article>)}</div>:<EmptyState icon={<Mail size={24}/>} title="No RFQs yet" copy="Rate requests sent to this vendor will appear here."/>}</section>
  </div>
  <footer className="vendor-actions"><Button variant="secondary" onClick={()=>location.href='vendors.html'}>Edit vendor</Button><Button onClick={()=>location.href='vendors.html'}>New vendor RFQ</Button></footer>
 </aside></div>
}

export function VendorsPage(){
 const[vendors,setVendors]=useState<Vendor[]>([]);const[loading,setLoading]=useState(true);const[search,setSearch]=useState('');const[type,setType]=useState('');const[selected,setSelected]=useState<Vendor|null>(null)
 useEffect(()=>{supabase.from('vendors').select('*,vendor_contacts(*)').eq('status','active').order('preferred',{ascending:false}).order('company').then(({data})=>{setVendors((data||[]) as Vendor[]);setLoading(false)})},[])
 const filtered=useMemo(()=>vendors.filter(vendor=>(!type||vendor.vendor_type===type)&&[vendor.company,vendor.vendor_type,vendor.general_email,...(vendor.modes||[]),...(vendor.countries||[])].join(' ').toLowerCase().includes(search.toLowerCase())),[vendors,search,type])
 const types=[...new Set(vendors.map(vendor=>vendor.vendor_type))]
 return <><section className="hero compact"><div><p className="eyebrow">SUPPLIER NETWORK</p><h1>Vendors</h1><p>Manage airlines, GSAs, carriers, agents, truckers and other service providers.</p></div><Button onClick={()=>location.href='vendors.html'}>+ Add vendor</Button></section>
 <div className="vendor-metrics"><GlassCard><span>Total vendors</span><strong>{vendors.length}</strong></GlassCard><GlassCard><span>Preferred</span><strong>{vendors.filter(v=>v.preferred).length}</strong></GlassCard><GlassCard><span>Air providers</span><strong>{vendors.filter(v=>(v.modes||[]).includes('air')).length}</strong></GlassCard><GlassCard><span>Ocean providers</span><strong>{vendors.filter(v=>(v.modes||[]).includes('ocean')).length}</strong></GlassCard></div>
 <GlassCard><div className="vendor-toolbar"><label><Search size={17}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search vendors, contacts, modes or countries"/></label><select value={type} onChange={event=>setType(event.target.value)}><option value="">All vendor types</option>{types.map(value=><option key={value} value={value}>{typeLabel(value)}</option>)}</select></div>
 {loading?<div className="vendor-loading">Loading vendors…</div>:filtered.length?<div className="vendor-grid">{filtered.map(vendor=>{const contact=(vendor.vendor_contacts||[]).find(c=>c.is_primary)||(vendor.vendor_contacts||[])[0];return <button key={vendor.id} onClick={()=>setSelected(vendor)} className="vendor-card"><div className="vendor-card-top"><div className="vendor-logo"><Building2 size={20}/></div>{vendor.preferred&&<span className="preferred"><Star size={12} fill="currentColor"/>Preferred</span>}</div><h3>{vendor.company}</h3><p>{typeLabel(vendor.vendor_type)}</p><div className="vendor-card-meta"><span><Mail size={13}/>{contact?.email||vendor.general_email||'No email'}</span><span><MapPin size={13}/>{(vendor.countries||[]).slice(0,2).join(', ')||'Coverage not set'}</span></div><div className="vendor-chip-row">{(vendor.modes||[]).slice(0,3).map(mode=><span key={mode}>{mode}</span>)}</div></button>})}</div>:<EmptyState icon={<Building2 size={30}/>} title="No matching vendors" copy="Adjust the filters or add a new provider."/>}
 </GlassCard><VendorDrawer vendor={selected} onClose={()=>setSelected(null)}/></>
}
