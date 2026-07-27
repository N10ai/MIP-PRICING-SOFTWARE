import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, FileText, Grid2X2, List, Plus, Search, Send, SlidersHorizontal } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'

type QuoteItem = {
  id: string
  quote_number: string | null
  customer_name: string | null
  status: string | null
  quote_data: any
  created_at: string | null
}

const money=(n:number,c='USD')=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:2}).format(Number(n)||0)}catch{return `$${(Number(n)||0).toFixed(2)}`}}
const routeText=(item:QuoteItem)=>item.quote_data?.route||item.quote_data?.routing||'Route not set'
const totalSell=(item:QuoteItem)=>Number(item.quote_data?.totals?.sell||item.quote_data?.totalSell||item.quote_data?.total||0)
const margin=(item:QuoteItem)=>Number(item.quote_data?.totals?.margin||item.quote_data?.margin||0)
const currency=(item:QuoteItem)=>item.quote_data?.currency||'USD'

export function QuotesPageV2({quotes,onNew}:{quotes:QuoteItem[];onNew?:()=>void}){
 const[,setParams]=useSearchParams()
 const[query,setQuery]=useState('')
 const[status,setStatus]=useState('all')
 const[view,setView]=useState<'cards'|'list'>('cards')
 const[sort,setSort]=useState<'newest'|'oldest'|'value'>('newest')
 const visible=useMemo(()=>{
  const term=query.trim().toLowerCase()
  const rows=quotes.filter(q=>{
   if(status!=='all'&&(q.status||'draft')!==status)return false
   return [q.quote_number,q.customer_name,routeText(q),q.status].join(' ').toLowerCase().includes(term)
  })
  return [...rows].sort((a,b)=>sort==='value'?totalSell(b)-totalSell(a):sort==='oldest'?new Date(a.created_at||0).getTime()-new Date(b.created_at||0).getTime():new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime())
 },[quotes,query,status,sort])
 const counts=useMemo(()=>({all:quotes.length,draft:quotes.filter(q=>(q.status||'draft')==='draft').length,sent:quotes.filter(q=>q.status==='sent').length,accepted:quotes.filter(q=>q.status==='accepted').length}),[quotes])
 return <div className="quotes-v2-page">
  <header className="quotes-v2-hero"><div><small>COMMERCIAL</small><h1>Quotes</h1><p>Review, filter, compare and open every quotation from one place.</p></div><button className="quotes-v2-new" onClick={onNew}><Plus size={16}/>New quote</button></header>
  <section className="quotes-v2-toolbar">
   <label><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, quote or route"/></label>
   <div className="quotes-v2-filterbar">{(['all','draft','sent','accepted'] as const).map(key=><button key={key} className={status===key?'active':''} onClick={()=>setStatus(key)}><span>{key[0].toUpperCase()+key.slice(1)}</span><b>{counts[key]}</b></button>)}</div>
   <div className="quotes-v2-actions"><button title="Cards" className={view==='cards'?'active':''} onClick={()=>setView('cards')}><Grid2X2 size={16}/></button><button title="List" className={view==='list'?'active':''} onClick={()=>setView('list')}><List size={16}/></button><label className="quotes-v2-sort"><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value as any)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="value">Highest value</option></select></label></div>
  </section>
  <section className={`quotes-v2-results ${view}`}>
   {visible.map(q=><button key={q.id} className="quotes-v2-card" onClick={()=>setParams({quote:q.id})}>
    <div className="quotes-v2-card-top"><span className="quotes-v2-doc"><FileText size={17}/></span><span className={`quotes-v2-status ${q.status||'draft'}`}>{q.status||'draft'}</span></div>
    <div className="quotes-v2-card-body"><small>{q.quote_number||'Draft quote'}</small><h2>{q.customer_name||'Customer'}</h2><p>{routeText(q)}</p></div>
    <div className="quotes-v2-meta"><span><CalendarDays size={14}/>{q.created_at?new Date(q.created_at).toLocaleDateString('en-US'):'No date'}</span><span>{q.status==='sent'?<Send size={14}/>:<CheckCircle2 size={14}/>} {margin(q).toFixed(1)}% margin</span></div>
    <div className="quotes-v2-total"><small>Total sell</small><strong>{money(totalSell(q),currency(q))}</strong></div>
   </button>)}
   {!visible.length&&<div className="quotes-v2-empty"><FileText size={28}/><h2>No quotes found</h2><p>Try a different search or filter.</p></div>}
  </section>
 </div>
}
