import { Building2, Mail, MapPin, Pencil, Plus, Search, Star } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, EmptyState, GlassCard } from './ui'

type Vendor={id:string;company:string;vendor_type:string;general_email:string|null;phone:string|null;website:string|null;payment_terms:string|null;default_currency:string|null;modes:string[]|null;countries:string[]|null;preferred:boolean|null;notes:string|null;status:string}
const vendorTypes=[['airline','Airline'],['gsa','GSA'],['air_cargo_agent','Air Cargo Agent'],['nvocc','NVOCC'],['ocean_carrier','Ocean Carrier'],['co_loader','Co-loader'],['trucker','Trucker'],['drayage_carrier','Drayage Carrier'],['customs_broker','Customs Broker'],['warehouse_cfs','Warehouse / CFS'],['courier','Courier'],['overseas_agent','Overseas Agent'],['service_provider','Other Service Provider']] as const
const label=(v:string)=>vendorTypes.find(x=>x[0]===v)?.[1]||(v||'service provider').replaceAll('_',' ').replace(/\b\w/g,m=>m.toUpperCase())

export function VendorsPage(){
 const location=useLocation(),navigate=useNavigate()
 const[vendors,setVendors]=useState<Vendor[]>([]),[loading,setLoading]=useState(true),[search,setSearch]=useState(''),[type,setType]=useState('')
 const load=()=>{setLoading(true);supabase.from('vendors').select('*').neq('status','archived').order('preferred',{ascending:false}).order('company').then(({data})=>{setVendors((data||[]) as Vendor[]);setLoading(false)})}
 useEffect(load,[])
 useEffect(()=>{const refresh=()=>load();window.addEventListener('vendor-directory-changed',refresh);return()=>window.removeEventListener('vendor-directory-changed',refresh)},[])
 const openEditor=(vendor:Vendor|null)=>window.dispatchEvent(new CustomEvent('open-premium-vendor-editor',{detail:vendor}))
 useEffect(()=>{const params=new URLSearchParams(location.search);if(params.get('new')==='1'){openEditor(null);navigate('/vendors',{replace:true})}},[location.search,navigate])
 const filtered=useMemo(()=>vendors.filter(v=>(!type||v.vendor_type===type)&&[v.company,v.vendor_type,v.general_email,...(v.modes||[]),...(v.countries||[])].join(' ').toLowerCase().includes(search.toLowerCase())),[vendors,search,type])
 return <><section className="hero compact"><div><p className="eyebrow">SUPPLIER NETWORK</p><h1>Vendors</h1><p>Add and maintain airlines, GSAs, carriers, agents, brokers, warehouses and truckers.</p></div><Button onClick={()=>openEditor(null)}><Plus size={16}/>Add vendor</Button></section><GlassCard><div className="vendor-toolbar"><label><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search vendors, modes or countries"/></label><select value={type} onChange={e=>setType(e.target.value)}><option value="">All vendor types</option>{vendorTypes.map(([value,name])=><option key={value} value={value}>{name}</option>)}</select></div>{loading?<div className="vendor-loading">Loading vendors…</div>:filtered.length?<div className="vendor-grid">{filtered.map(v=><article key={v.id} className="vendor-card"><button className="vendor-card-open" onClick={()=>openEditor(v)}><div className="vendor-card-top"><div className="vendor-logo"><Building2 size={20}/></div>{v.preferred&&<span className="preferred"><Star size={12} fill="currentColor"/>Preferred</span>}</div><h3>{v.company}</h3><p>{label(v.vendor_type)}</p><div className="vendor-card-meta"><span><Mail size={13}/>{v.general_email||'No email'}</span><span><MapPin size={13}/>{(v.countries||[]).slice(0,2).join(', ')||'Coverage not set'}</span></div><div className="vendor-chip-row">{(v.modes||[]).map(x=><span key={x}>{x}</span>)}</div></button><button className="vendor-edit-button" onClick={()=>openEditor(v)}><Pencil size={14}/>Edit</button></article>)}</div>:<EmptyState icon={<Building2 size={30}/>} title="No matching vendors" copy="Add a provider or adjust the filters."/>}</GlassCard></>
}
