import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, FileText, Filter, LayoutGrid, LayoutList, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button, EmptyState, GlassCard, StatusBadge } from './ui'
import { ResponsiveQuoteWorkspace } from './ResponsiveQuoteWorkspace'

type QuoteRow={id:string;quote_number:unknown;customer_name:unknown;status:unknown;quote_data:any;quote_request_id:string|null;created_at:string|null}
type QuoteView='list'|'cards'
type QuoteGroup='none'|'status'|'customer'|'date'

const uid=()=>crypto.randomUUID()
const text=(v:any,f='')=>{if(v==null||v==='')return f;if(typeof v==='string'||typeof v==='number')return String(v);if(Array.isArray(v))return v.map(x=>text(x)).filter(Boolean).join(' · ');if(typeof v==='object'){for(const k of ['label','name','value','code','title','text','type']){const s=text(v[k]);if(s)return s}}return f}
const number=(v:any)=>Number(v)||0
const money=(v:any,c:any='USD')=>{const n=number(v),currency=text(c,'USD');try{return new Intl.NumberFormat('en-US',{style:'currency',currency}).format(n)}catch{return `$${n.toFixed(2)}`}}
const qnum=()=>`Q-${new Date().toISOString().slice(2,10).replaceAll('-','')}-${Math.floor(100+Math.random()*900)}`
const field=(rows:any[],label:string)=>text((rows||[]).find(x=>text(x?.label).toLowerCase()===label.toLowerCase())?.value)
const routeValue=(rows:any[],labels:string[])=>{for(const label of labels){const value=field(rows,label);if(value)return value}return''}
const basis=(v:string)=>({per_kg:'per_actual_kg',per_actual_kg:'per_actual_kg',per_chargeable_kg:'per_chargeable_kg',per_lb:'per_lb',per_cbm:'per_cbm',per_piece:'per_piece',per_pallet:'per_pallet',per_container:'per_container'} as any)[v]||'flat'
const quoteCustomer=(q:QuoteRow)=>text(q.customer_name,'Customer')
const quoteStatus=(q:QuoteRow)=>text(q.status,'draft')
const quoteRoute=(q:QuoteRow)=>{const d=q.quote_data&&typeof q.quote_data==='object'?q.quote_data:{};return text(d.route,text(d.routing,'Route pending'))}
const quoteCreated=(q:QuoteRow)=>q.created_at?new Date(q.created_at):null

function cargoMetrics(cargo:any[]){let actualKg=0,cbm=0,pieces=0,pallets=0,containers=0;for(const c of cargo){const qty=number(c.quantity??c.qty)||1,w=number(c.weight_value??c.weight),wu=text(c.weight_unit??c.wUnit,'kg').toLowerCase(),du=text(c.dimension_unit??c.dUnit,'cm').toLowerCase(),f=du==='in'?2.54:1;pieces+=qty;actualKg+=(wu==='lb'?w*.453592:w)*qty;cbm+=number(c.length_value??c.l)*f*number(c.width_value??c.w)*f*number(c.height_value??c.h)*f/1e6*qty;const p=text(c.packaging_type??c.desc).toLowerCase();if(p.includes('pallet'))pallets+=qty;if(p.includes('container'))containers+=qty}return{actualKg,chargeableKg:Math.max(actualKg,cbm*167),lb:actualKg*2.20462,cbm,pieces,pallets,containers}}
function qtyFor(type:string,m:any){return({flat:1,per_actual_kg:m.actualKg,per_chargeable_kg:m.chargeableKg,per_lb:m.lb,per_cbm:m.cbm,per_piece:m.pieces,per_pallet:m.pallets,per_container:m.containers} as any)[basis(type)]||1}
function presetName(mode:string,direction:string,service:string){if(mode==='air')return direction==='import'?'Air Import Standard':'Air Export Standard';if(mode==='ocean')return service.toLowerCase().includes('lcl')?'LCL Ocean':direction==='export'?'Ocean Export Standard':'LCL Ocean';if(mode==='ground')return'Ground Standard';return''}
function isUS(country:any,code:any){return /united states|usa|u\.s\./i.test(text(country))||/^(MIA|JFK|LAX|ORD|ATL|DFW|IAH|SFO|SEA|BOS|EWR|MCO|FLL|PORT EVERGLADES|MIAMI)$/i.test(text(code))}

export function QuoteRoute(){
 const[params,setParams]=useSearchParams(),[rows,setRows]=useState<QuoteRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[booting,setBooting]=useState(false)
 const[filtersOpen,setFiltersOpen]=useState(false),[status,setStatus]=useState('all'),[customer,setCustomer]=useState('all'),[dateRange,setDateRange]=useState('all'),[group,setGroup]=useState<QuoteGroup>('none'),[view,setView]=useState<QuoteView>('list')
 const requestId=params.get('request'),quoteId=params.get('quote'),editorOpen=Boolean(requestId||quoteId)
 const load=()=>{setLoading(true);setError('');supabase.from('quotes').select('id,quote_number,customer_name,status,quote_data,quote_request_id,created_at').order('created_at',{ascending:false}).then(({data,error})=>{if(error){setError(error.message);setRows([])}else setRows((data||[]) as QuoteRow[]);setLoading(false)})}
 useEffect(()=>{if(!editorOpen)load()},[editorOpen])
 useEffect(()=>{if(!requestId||booting)return;(async()=>{setBooting(true);const existing=await supabase.from('quotes').select('id').eq('quote_request_id',requestId).order('created_at',{ascending:false}).limit(1).maybeSingle();if(existing.data?.id){setParams({quote:existing.data.id},{replace:true});return}
  const[{data:r,error:re},{data:cargo},{data:rfq},{data:presets}]=await Promise.all([supabase.from('quote_requests').select('*').eq('id',requestId).single(),supabase.from('quote_request_cargo').select('*').eq('quote_request_id',requestId).order('line_number'),supabase.from('vendor_rfqs').select('id,rfq_number,status,response_data,selected_at,vendors(company)').eq('quote_request_id',requestId).order('selected_at',{ascending:false,nullsFirst:false}).order('created_at',{ascending:false}).limit(1).maybeSingle(),supabase.from('charge_presets').select('*')]);if(re||!r){setError(re?.message||'Request not found');setBooting(false);return}
  const mode=text(r.mode).toLowerCase(),service=text(r.service_type),direction=isUS(r.origin_country,r.origin_code)&&!isUS(r.destination_country,r.destination_code)?'export':!isUS(r.origin_country,r.origin_code)&&isUS(r.destination_country,r.destination_code)?'import':text(r.direction);const metrics=cargoMetrics(cargo||[]),recommended=presetName(mode,direction,service),preset=(presets||[]).find((p:any)=>text(p.name)===recommended);let charges=(preset?.charges||[]).map((x:any)=>{const b=basis(text(x.type)),q=qtyFor(text(x.type),metrics),rate=number(x.rate),minimum=number(x.minimum??x.min),total=Math.max(q*rate,minimum);return{id:uid(),description:text(x.name,'Charge'),basis:b,quantity:q,rate,minimum,cost:total,sell:total,autoQuantity:b!=='flat'}})
  const rd=(rfq as any)?.response_data||{},vendorCharges=Array.isArray(rd.charges)?rd.charges:[];if(vendorCharges.length){const vendorTotal=vendorCharges.reduce((s:number,x:any)=>s+number(x.amount??x.cost??x.total),0);if(charges.length){const freight=charges.find((x:any)=>/freight/i.test(x.description));if(freight){freight.cost=vendorTotal;freight.rate=freight.quantity?vendorTotal/freight.quantity:vendorTotal}}else charges=vendorCharges.map((x:any)=>({id:uid(),description:text(x.description??x.name,'Vendor charge'),basis:'flat',quantity:1,rate:number(x.amount??x.cost),minimum:0,cost:number(x.amount??x.cost),sell:number(x.amount??x.cost),autoQuantity:false}))}else if(number(rd.total)>0){const freight=charges.find((x:any)=>/freight/i.test(x.description));if(freight){freight.cost=number(rd.total);freight.rate=freight.quantity?number(rd.total)/freight.quantity:number(rd.total)}else charges.unshift({id:uid(),description:'Selected vendor rate',basis:'flat',quantity:1,rate:number(rd.total),minimum:0,cost:number(rd.total),sell:number(rd.total),autoQuantity:false})}
  const route=`${r.origin_code||r.origin_name||'Origin'} → ${r.destination_code||r.destination_name||'Destination'}`,data={requestNumber:r.request_number,customerEmail:r.contact_email,customerPhone:r.contact_phone,customerReference:r.customer_reference,mode,serviceType:service,direction,route,incoterm:r.incoterm,cargoReadyDate:r.cargo_ready_date,estimatedDepartureDate:r.estimated_departure_date,requestIntent:r.request_intent,targetRate:{amount:r.target_rate_amount,currency:r.target_rate_currency,basis:r.target_rate_basis},cargo:cargo||[],metrics,preset:recommended,vendor:{rfqId:(rfq as any)?.id||null,rfqNumber:(rfq as any)?.rfq_number||null,name:(rfq as any)?.vendors?.company||null,response:rd},currency:text(rd.currency,r.target_rate_currency||'USD'),validUntil:text(rd.valid_until),transit:text(rd.transit),routing:text(rd.routing??rd.carrier),charges,totals:{cost:charges.reduce((s:number,x:any)=>s+number(x.cost),0),sell:charges.reduce((s:number,x:any)=>s+number(x.sell),0),profit:0,margin:0},terms:'Rates subject to space and equipment availability. Duties, taxes, inspections, storage, demurrage and detention are excluded unless specifically stated.',customerNotes:'',requestNotes:r.notes}
  const created=await supabase.from('quotes').insert({quote_number:qnum(),customer_name:r.customer_company||r.contact_name||'Customer',status:'draft',quote_data:data,quote_request_id:r.id,version_number:1}).select('id').single();setBooting(false);if(created.error){setError(created.error.message);return}setParams({quote:created.data.id},{replace:true})})()},[requestId])
 const migrateAndOpen=async(q:QuoteRow)=>{if(q.quote_request_id){setParams({quote:q.id});return}const d=q.quote_data&&typeof q.quote_data==='object'?q.quote_data:{},info=Array.isArray(d.info)?d.info:[],route=Array.isArray(d.route)?d.route:[],origin=routeValue(route,['Origin','POL'])||text(d.origin),destination=routeValue(route,['Destination','POD'])||text(d.destination),mode=text(d.mode,d.preset?.toLowerCase().includes('ocean')?'ocean':d.preset?.toLowerCase().includes('air')?'air':'ground'),insert=await supabase.from('quote_requests').insert({request_number:text(d.requestNumber,`LEGACY-${Date.now()}`),customer_company:text(q.customer_name,field(info,'Customer'))||'Legacy customer',contact_name:field(info,'Contact')||null,contact_email:text(d.customerEmail,field(info,'Email'))||'legacy@mipcargoexp.com',contact_phone:text(d.customerPhone,field(info,'Phone'))||null,customer_reference:text(d.customerReference,field(info,'Customer Reference'))||null,status:'pricing',priority:'best_value',mode,service_type:text(d.serviceType,routeValue(route,['Service']))||null,origin_code:origin||null,origin_name:origin||null,destination_code:destination||null,destination_name:destination||null,incoterm:text(d.incoterm,routeValue(route,['Incoterm']))||null,source:'legacy_quote',notes:text(d.requestNotes)||null,request_data:{legacy_quote_id:q.id}}).select('id').single();if(insert.error){alert(insert.error.message);return}const legacyCargo=Array.isArray(d.cargo)?d.cargo:[];if(legacyCargo.length)await supabase.from('quote_request_cargo').insert(legacyCargo.map((c:any,i:number)=>({quote_request_id:insert.data.id,line_number:i+1,commodity:text(c.commodity??c.desc,'Cargo'),packaging_type:text(c.packaging_type??c.desc,'piece'),quantity:number(c.quantity??c.qty)||1,weight_value:number(c.weight_value??c.weight),weight_unit:text(c.weight_unit??c.wUnit,'kg'),length_value:number(c.length_value??c.l),width_value:number(c.width_value??c.w),height_value:number(c.height_value??c.h),dimension_unit:text(c.dimension_unit??c.dUnit,'cm'),stackable:true,dangerous_goods:false,normalized_data:{legacy:true}})));await supabase.from('quotes').update({quote_request_id:insert.data.id}).eq('id',q.id);setParams({quote:q.id})}
 const createNew=async()=>{const req=await supabase.from('quote_requests').insert({request_number:`MANUAL-${Date.now()}`,customer_company:'New customer',contact_email:'pricing@mipcargoexp.com',status:'pricing',priority:'best_value',source:'manual_quote',request_data:{manual:true}}).select('id').single();if(req.error){alert(req.error.message);return}const quote=await supabase.from('quotes').insert({quote_number:qnum(),customer_name:'New customer',status:'draft',quote_data:{mode:'',route:'Origin → Destination',cargo:[],charges:[],totals:{cost:0,sell:0,profit:0,margin:0},currency:'USD'},quote_request_id:req.data.id,version_number:1}).select('id').single();if(quote.error){alert(quote.error.message);return}setParams({quote:quote.data.id})}
 const remove=async(q:QuoteRow)=>{if(!confirm(`Delete ${text(q.quote_number,'this quote')}? This cannot be undone.`))return;const{error}=await supabase.from('quotes').delete().eq('id',q.id);if(error)alert(error.message);else load()}

 const customers=useMemo(()=>[...new Set(rows.map(quoteCustomer))].sort((a,b)=>a.localeCompare(b)),[rows])
 const statuses=useMemo(()=>[...new Set(rows.map(quoteStatus))].sort(),[rows])
 const visible=useMemo(()=>rows.filter(q=>{
  if(status!=='all'&&quoteStatus(q)!==status)return false
  if(customer!=='all'&&quoteCustomer(q)!==customer)return false
  if(dateRange!=='all'){
   const created=quoteCreated(q)
   if(!created||created.getTime()<Date.now()-Number(dateRange)*86400000)return false
  }
  return true
 }),[rows,status,customer,dateRange])
 const grouped=useMemo(()=>{
  if(group==='none')return new Map([['',visible]])
  const map=new Map<string,QuoteRow[]>()
  visible.forEach(q=>{
   const label=group==='status'?quoteStatus(q).replaceAll('_',' '):group==='customer'?quoteCustomer(q):(quoteCreated(q)?.toLocaleDateString(undefined,{month:'long',year:'numeric'})||'Date unavailable')
   map.set(label,[...(map.get(label)||[]),q])
  })
  return map
 },[visible,group])

 if(editorOpen)return booting?<div className="quote-index-state fullscreen">Preparing quote from request…</div>:<ResponsiveQuoteWorkspace/>

 return <>
  <section className="hero compact quote-queue-hero"><div><p className="eyebrow">CUSTOMER PRICING</p><h1>Quotes</h1><p>Build, edit, and manage request-linked and legacy quotations.</p></div><Button onClick={createNew}><Plus size={16}/>New quote</Button></section>
  <GlassCard className="quote-queue-card">
   <div className="quote-queue-toolbar">
    <div><b>Quote queue</b><small>Newest created first</small></div>
    <div className="quote-queue-tools">
     <button className={filtersOpen?'active':''} onClick={()=>setFiltersOpen(v=>!v)}><Filter size={17}/><span>{filtersOpen?'Done':'Filters'}</span></button>
     <div className="quote-view-toggle" aria-label="Quote view"><button className={view==='list'?'active':''} onClick={()=>setView('list')} aria-label="List view"><LayoutList size={18}/></button><button className={view==='cards'?'active':''} onClick={()=>setView('cards')} aria-label="Card view"><LayoutGrid size={18}/></button></div>
    </div>
   </div>
   {filtersOpen&&<div className="quote-filter-panel">
    <label><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">All statuses</option>{statuses.map(value=><option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}</select></label>
    <label><span>Customer</span><select value={customer} onChange={e=>setCustomer(e.target.value)}><option value="all">All customers</option>{customers.map(value=><option key={value} value={value}>{value}</option>)}</select></label>
    <label><span>Date</span><select value={dateRange} onChange={e=>setDateRange(e.target.value)}><option value="all">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
    <label><span>Group</span><select value={group} onChange={e=>setGroup(e.target.value as QuoteGroup)}><option value="none">No grouping</option><option value="status">By status</option><option value="customer">By customer</option><option value="date">By month</option></select></label>
   </div>}
   <div className="quote-results-meta"><b>{visible.length} quotes</b><span>{group==='none'?(view==='list'?'List view':'Card view'):`Grouped by ${group}`}</span></div>
   {loading?<div className="quote-index-state">Loading quotes…</div>:error?<div className="quote-index-error"><b>Quotes could not be loaded.</b><span>{error}</span><button onClick={load}>Retry</button></div>:visible.length?<div className="quote-groups">{[...grouped.entries()].map(([label,items])=><section className="quote-group" key={label||'all'}>{label&&<header><b>{label}</b><span>{items.length}</span></header>}<div className={`quote-queue quote-view-${view}`}>{items.map(q=>{const d=q.quote_data&&typeof q.quote_data==='object'?q.quote_data:{},legacy=!q.quote_request_id;return <article className="quote-queue-item" key={q.id}>
    <button className="quote-queue-main" onClick={()=>migrateAndOpen(q)}>
     <div className="quote-queue-primary"><b>{text(q.quote_number,'Draft quote')}</b><small>{q.created_at?new Date(q.created_at).toLocaleString():'Date unavailable'}{legacy?' · Legacy':''}</small></div>
     <div className="quote-queue-customer"><b>{quoteCustomer(q)}</b><small>{quoteRoute(q)}</small></div>
     <div className="quote-queue-value"><b>{money(d.totals?.sell,d.currency)}</b><small>{number(d.totals?.margin).toFixed(1)}% margin</small></div>
     <StatusBadge status={quoteStatus(q)}/>
     <span className="quote-open-button" aria-hidden="true"><ArrowUpRight size={20}/></span>
    </button>
    <button className="quote-delete-button" title="Delete" onClick={()=>remove(q)}><Trash2 size={15}/></button>
   </article>})}</div></section>)}</div>:<EmptyState icon={<FileText size={28}/>} title="No quotes found" copy="Quotes matching these filters will appear here."/>}
  </GlassCard>
 </>
}