import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { EmptyState, GlassCard, SectionHeading, StatusBadge } from './ui'
import { QuotesPage } from './QuoteWorkspace'

type QuoteRow={id:string;quote_number:string|null;customer_name:string|null;status:string|null;quote_data:any;created_at:string|null}
const money=(value:unknown,currency='USD')=>{const n=Number(value)||0;try{return new Intl.NumberFormat('en-US',{style:'currency',currency:currency||'USD',maximumFractionDigits:2}).format(n)}catch{return `$${n.toFixed(2)}`}}

export function QuoteRoute(){
 const[params,setParams]=useSearchParams()
 const[rows,setRows]=useState<QuoteRow[]>([])
 const[loading,setLoading]=useState(true)
 const[error,setError]=useState('')
 const editorOpen=Boolean(params.get('request')||params.get('quote'))
 useEffect(()=>{if(editorOpen)return;let active=true;setLoading(true);setError('');supabase.from('quotes').select('id,quote_number,customer_name,status,quote_data,created_at').order('created_at',{ascending:false}).then(({data,error})=>{if(!active)return;if(error){setError(error.message);setRows([])}else setRows((data||[]) as QuoteRow[]);setLoading(false)});return()=>{active=false}},[editorOpen])
 if(editorOpen)return <QuotesPage/>
 return <>
  <section className="hero compact"><div><p className="eyebrow">CUSTOMER PRICING</p><h1>Quotes</h1><p>Build, review, and manage customer-facing freight quotes.</p></div></section>
  <GlassCard><SectionHeading eyebrow="QUOTE PIPELINE" title="Recent quotes"/>
   {loading?<div className="quote-index-state">Loading quotes…</div>:error?<div className="quote-index-error"><b>Quotes could not be loaded.</b><span>{error}</span><button onClick={()=>location.reload()}>Retry</button></div>:rows.length?<div className="quote-list">{rows.map(q=>{const d=q.quote_data&&typeof q.quote_data==='object'?q.quote_data:{};return <button key={q.id} onClick={()=>setParams({quote:q.id})}><div><b>{q.quote_number||'Draft quote'}</b><small>{q.created_at?new Date(q.created_at).toLocaleDateString():'Date unavailable'}</small></div><div><b>{q.customer_name||'Customer'}</b><small>{d.route||'Route pending'}</small></div><div><b>{money(d.totals?.sell,d.currency)}</b><small>{(Number(d.totals?.margin)||0).toFixed(1)}% margin</small></div><StatusBadge status={q.status||'draft'}/></button>})}</div>:<EmptyState icon={<FileText size={28}/>} title="No quotes yet" copy="Select a vendor rate from a request, then create the customer quote."/>}
  </GlassCard>
 </>
}
