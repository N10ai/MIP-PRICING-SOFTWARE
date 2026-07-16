import { Bell, Building2, FileText, Home, Menu, Plus, Search, Ship, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { supabase } from './lib/supabase'

type RequestRow = {
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
  status: string
  submitted_at: string
}

const logo='https://raw.githubusercontent.com/N10ai/mip-tools/main/Untitled%20design%20-%201.png'
const navigation=[
  ['/', 'Overview', Home],
  ['/requests', 'Requests', Ship],
  ['/quotes', 'Quotes', FileText],
  ['/vendors', 'Vendors', Building2],
  ['/customers', 'Customers', Users],
] as const

function RequestList({items,loading}:{items:RequestRow[],loading:boolean}){
  if(loading) return <div className="stack">{[1,2,3,4,5].map(i=><div className="skeleton" key={i}/>)}</div>
  if(!items.length) return <div className="empty"><Ship size={28}/><h3>No requests found</h3><p>New customer requests will appear here.</p></div>
  return <div className="request-list">{items.map(item=><button className="request-row" key={item.id}>
    <div><b>{item.request_number}</b><small>{new Date(item.submitted_at).toLocaleString()}</small></div>
    <div><b>{item.customer_company||item.contact_name||'Guest request'}</b><small>{item.contact_email}</small></div>
    <div><span>{item.mode||'Freight'} {item.service_type||''}</span><b>{item.origin_code||item.origin_name||'—'} → {item.destination_code||item.destination_name||'—'}</b></div>
    <div><em className={`status status-${item.status}`}>{item.status.replaceAll('_',' ')}</em></div>
  </button>)}</div>
}

function Dashboard({requests,loading}:{requests:RequestRow[],loading:boolean}){
  const count=(s:string)=>requests.filter(r=>r.status===s).length
  const cards=[['New requests',count('new')],['Waiting vendors',count('vendor_rfq')],['Pricing',count('pricing')],['Accepted',count('accepted')]]
  return <><section className="hero"><div><p className="eyebrow">COMMERCIAL OPERATIONS</p><h1>Good morning.</h1><p>Everything that needs your attention in one premium workspace.</p></div><button className="primary"><Plus size={17}/>New request</button></section>
  <section className="stats">{cards.map(([label,value])=><article className="glass stat" key={label}><span>{label}</span>{loading?<div className="mini-skeleton"/>:<strong>{value}</strong>}<small>Live pipeline</small></article>)}</section>
  <section className="grid-two"><article className="glass"><header className="section-head"><div><p className="eyebrow">LIVE PIPELINE</p><h2>Recent requests</h2></div><NavLink to="/requests">View all</NavLink></header><RequestList items={requests.slice(0,6)} loading={loading}/></article><article className="glass focus"><p className="eyebrow">TODAY'S FOCUS</p><h2>Priority actions</h2><div className="focus-item"><i className="purple"/><div><b>Vendor follow-ups</b><small>Review requests waiting on carrier replies.</small></div></div><div className="focus-item"><i className="blue"/><div><b>New requests</b><small>Respond while each opportunity is fresh.</small></div></div><div className="focus-item"><i className="green"/><div><b>Ready to send</b><small>Finalize and deliver completed quotes.</small></div></div></article></section></>
}

function Requests({items,loading,search,setSearch}:{items:RequestRow[],loading:boolean,search:string,setSearch:(v:string)=>void}){
  return <><section className="hero compact"><div><p className="eyebrow">COMMERCIAL INTAKE</p><h1>Quote requests</h1><p>Review, assign, request vendor rates, and create quotes.</p></div><button className="primary"><Plus size={17}/>New request</button></section><article className="glass"><div className="toolbar"><label><Search size={17}/><input placeholder="Search requests" value={search} onChange={e=>setSearch(e.target.value)}/></label><button className="secondary">All statuses</button></div><RequestList items={items} loading={loading}/></article></>
}

function Placeholder({title,copy}:{title:string,copy:string}){return <article className="glass placeholder"><FileText size={30}/><h1>{title}</h1><p>{copy}</p></article>}

export default function App(){
  const [requests,setRequests]=useState<RequestRow[]>([])
  const [loading,setLoading]=useState(true)
  const [search,setSearch]=useState('')
  useEffect(()=>{supabase.from('quote_requests').select('*').is('archived_at',null).order('submitted_at',{ascending:false}).limit(100).then(({data})=>{setRequests((data||[]) as RequestRow[]);setLoading(false)})},[])
  const filtered=useMemo(()=>requests.filter(r=>[r.request_number,r.customer_company,r.contact_email,r.origin_code,r.destination_code].join(' ').toLowerCase().includes(search.toLowerCase())),[requests,search])
  return <div className="app-bg"><div className="orb one"/><div className="orb two"/><aside className="sidebar"><div className="brand"><img src={logo}/><div><b>MIP Pricing OS</b><span>Commercial Operations</span></div></div><nav>{navigation.map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/' }><Icon size={18}/><span>{label}</span></NavLink>)}</nav><footer><div className="avatar">IP</div><div><b>Pricing Team</b><span>MIP Cargo Express</span></div></footer></aside><header className="topbar"><button className="mobile-menu"><Menu size={20}/></button><button className="global-search"><Search size={17}/><span>Search requests, quotes, vendors...</span><kbd>⌘ K</kbd></button><div><button className="icon"><Bell size={18}/></button><button className="primary"><Plus size={17}/>New</button></div></header><main className="workspace"><Routes><Route path="/" element={<Dashboard requests={requests} loading={loading}/>}/><Route path="/requests" element={<Requests items={filtered} loading={loading} search={search} setSearch={setSearch}/>}/><Route path="/quotes" element={<Placeholder title="Quotes" copy="The premium quote workspace is next."/>}/><Route path="/vendors" element={<Placeholder title="Vendors" copy="Vendor CRM and RFQs will inherit this same design."/>}/><Route path="/customers" element={<Placeholder title="Customers" copy="Customer profiles and commercial history."/>}/></Routes></main><nav className="bottom-nav">{navigation.slice(0,4).map(([to,label,Icon])=><NavLink key={to} to={to} end={to==='/' }><Icon size={19}/><span>{label}</span></NavLink>)}<button><Menu size={19}/><span>More</span></button></nav></div>
}
