import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal, Send, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

const QUICK_MESSAGES=[
  ['Validity','Please confirm the rate validity and expiration date.'],
  ['Inclusions','Please confirm which charges and services are included.'],
  ['Transit','Please confirm transit time, routing, and frequency.'],
  ['Revise rate','Please review the shipment and provide your best revised rate.'],
]

type RateSummary={total:number;currency:string;carrier:string;transit:string;routing:string;validUntil:string}
type ActiveRfq={id:string;rfq_number:string;status:string;sent_to:string|null;response_data:Record<string,unknown>|null;vendors?:{company?:string}|null}

function readVisibleRfqNumber(){
  const rows=Array.from(document.querySelectorAll('.rfq-summary > div'))
  for(const row of rows){
    if(row.querySelector('span')?.textContent?.trim().toLowerCase()==='rfq')return row.querySelector('strong')?.textContent?.trim()||''
  }
  return ''
}

function compactQuotedHistory(){
  document.querySelectorAll<HTMLElement>('.rfq-conversation article.inbound pre').forEach(pre=>{
    if(pre.dataset.compacted==='true')return
    const source=pre.textContent||''
    const lines=source.split('\n')
    const cutoff=lines.findIndex(line=>/^\s*>/.test(line)||/^\s*On .+wrote:\s*$/i.test(line)||/^\s*-{2,}\s*Original Message/i.test(line))
    if(cutoff>0){
      pre.textContent=lines.slice(0,cutoff).join('\n').trim()
      const note=document.createElement('button')
      note.type='button';note.className='rfq-show-quoted';note.textContent='Show previous email'
      note.onclick=()=>{pre.textContent=source;note.remove()}
      pre.insertAdjacentElement('afterend',note)
    }
    pre.dataset.compacted='true'
  })
}

function summarizeRate(value:Record<string,unknown>|null):RateSummary{
  const raw=(value||{}) as Record<string,unknown>
  const charges=Array.isArray(raw.charges)?raw.charges as Array<Record<string,unknown>>:[]
  const chargeTotal=charges.reduce((sum,item)=>sum+(Number(item.amount)||Number(item.cost)||0),0)
  return{
    total:Number(raw.total)||chargeTotal,
    currency:String(raw.currency||'USD'),
    carrier:String(raw.carrier||''),
    transit:String(raw.transit||''),
    routing:String(raw.routing||''),
    validUntil:String(raw.validUntil||raw.valid_until||''),
  }
}

async function readableFunctionError(error:unknown){
  const fallback=error instanceof Error?error.message:'Unable to send follow-up'
  try{
    const context=(error as {context?:Response})?.context
    if(context?.clone){
      const payload=await context.clone().json() as {error?:string;message?:string}
      return payload.error||payload.message||fallback
    }
  }catch{/* use fallback */}
  return fallback
}

export function RfqConversationComposer(){
  const[mount,setMount]=useState<HTMLElement|null>(null)
  const[headerMount,setHeaderMount]=useState<HTMLElement|null>(null)
  const[rfq,setRfq]=useState<ActiveRfq|null>(null)
  const[text,setText]=useState('')
  const[sending,setSending]=useState(false)
  const[feedback,setFeedback]=useState('')
  const[menuOpen,setMenuOpen]=useState(false)
  const[deleting,setDeleting]=useState(false)

  useEffect(()=>{
    let lastNumber=''
    const sync=async()=>{
      compactQuotedHistory()
      const conversation=document.querySelector<HTMLElement>('.rfq-conversation')
      const workspace=conversation?.closest<HTMLElement>('.pricing-workspace')||null
      document.querySelectorAll('.pricing-workspace.rfq-chat-focus-mode').forEach(node=>{if(node!==workspace)node.classList.remove('rfq-chat-focus-mode')})
      if(conversation&&workspace){
        workspace.classList.add('rfq-chat-focus-mode')
        let header=conversation.parentElement?.querySelector<HTMLElement>('[data-rfq-chat-header]')||null
        if(!header){header=document.createElement('div');header.dataset.rfqChatHeader='true';conversation.insertAdjacentElement('beforebegin',header)}
        let host=conversation.parentElement?.querySelector<HTMLElement>('[data-rfq-chat-composer]')||null
        if(!host){host=document.createElement('div');host.dataset.rfqChatComposer='true';conversation.insertAdjacentElement('afterend',host)}
        setHeaderMount(header);setMount(host)
      }else{setHeaderMount(null);setMount(null)}
      const rfqNumber=readVisibleRfqNumber()
      if(!rfqNumber||rfqNumber===lastNumber)return
      lastNumber=rfqNumber
      const{data}=await supabase.from('vendor_rfqs').select('id,rfq_number,status,sent_to,response_data,vendors(company)').eq('rfq_number',rfqNumber).maybeSingle()
      setRfq((data||null) as unknown as ActiveRfq|null);setFeedback('');setText('');setMenuOpen(false)
    }
    void sync()
    const observer=new MutationObserver(()=>void sync())
    observer.observe(document.body,{childList:true,subtree:true,characterData:true})
    return()=>{observer.disconnect();document.querySelectorAll('.pricing-workspace.rfq-chat-focus-mode').forEach(node=>node.classList.remove('rfq-chat-focus-mode'))}
  },[])

  const enabled=useMemo(()=>Boolean(rfq&&['sent','delivered','awaiting_response','responded'].includes(String(rfq.status).toLowerCase())),[rfq])
  const summary=useMemo(()=>summarizeRate(rfq?.response_data||null),[rfq])
  const send=async()=>{
    if(!rfq||!text.trim()||sending||!enabled)return
    setSending(true);setFeedback('Sending…')
    try{
      const{data,error}=await supabase.functions.invoke<{status?:string;error?:string}>('send-rfq-followup',{body:{vendor_rfq_id:rfq.id,message:text.trim()}})
      if(error)throw error
      if(data?.error)throw new Error(data.error)
      setText('');setFeedback('Sent')
    }catch(error){setFeedback(await readableFunctionError(error))}finally{setSending(false)}
  }
  const clearConversation=async()=>{
    if(!rfq||deleting||!confirm(`Delete the entire message history for ${rfq.vendors?.company||rfq.rfq_number}? The RFQ and entered rates will remain.`))return
    setDeleting(true)
    const{error}=await supabase.from('rfq_conversation_messages').delete().eq('vendor_rfq_id',rfq.id)
    setDeleting(false);setMenuOpen(false)
    if(error){setFeedback(error.message);return}
    setFeedback('Conversation deleted')
  }
  const deleteRfq=async()=>{
    if(!rfq||deleting||!confirm(`Delete RFQ ${rfq.rfq_number} and its full chat history? This cannot be undone.`))return
    if(!confirm('This will also remove saved vendor rates connected to this RFQ. Continue?'))return
    setDeleting(true)
    const{error}=await supabase.from('vendor_rfqs').delete().eq('id',rfq.id)
    setDeleting(false);setMenuOpen(false)
    if(error){setFeedback(error.message);return}
    setFeedback('RFQ deleted')
    window.setTimeout(()=>document.querySelector<HTMLButtonElement>('.pricing-head button')?.click(),250)
  }

  if(!mount||!headerMount||!rfq)return null
  const header=createPortal(<section className="rfq-chat-focus-header">
    <div className="rfq-chat-focus-title"><small>VENDOR CONVERSATION</small><h2>{rfq.vendors?.company||rfq.sent_to||'Vendor'}</h2><p>{rfq.rfq_number} · {rfq.sent_to||'No recipient'}</p></div>
    <div className="rfq-chat-focus-actions">
      <button type="button" className="rfq-chat-close" onClick={()=>document.querySelector<HTMLButtonElement>('.pricing-head button')?.click()} aria-label="Close chat"><X size={19}/></button>
      <button type="button" className="rfq-chat-more" onClick={()=>setMenuOpen(value=>!value)} aria-label="Chat actions"><MoreHorizontal size={20}/></button>
      {menuOpen&&<div className="rfq-chat-menu"><button type="button" disabled={deleting} onClick={clearConversation}><Trash2 size={15}/>Delete chat only</button><button type="button" className="danger" disabled={deleting} onClick={deleteRfq}><Trash2 size={15}/>Delete RFQ and chat</button></div>}
    </div>
    {(summary.total>0||summary.carrier||summary.transit||summary.routing||summary.validUntil)&&<div className="rfq-floating-rate-summary">
      {summary.total>0&&<span><small>Total</small><b>{summary.currency} {summary.total.toFixed(2)}</b></span>}
      {summary.carrier&&<span><small>Carrier</small><b>{summary.carrier}</b></span>}
      {summary.transit&&<span><small>Transit</small><b>{summary.transit}</b></span>}
      {summary.routing&&<span><small>Route</small><b>{summary.routing}</b></span>}
      {summary.validUntil&&<span><small>Valid until</small><b>{summary.validUntil}</b></span>}
    </div>}
  </section>,headerMount)
  const composer=createPortal(<section className="rfq-chat-composer" aria-label="Vendor follow-up">
    <div className="rfq-chat-quick-actions">{QUICK_MESSAGES.map(([label,value])=><button type="button" key={label} onClick={()=>setText(value)}>{label}</button>)}</div>
    <div className="rfq-chat-compose-row">
      <textarea value={text} onChange={event=>setText(event.target.value)} placeholder={enabled?'Write a message…':'Send the RFQ first'} disabled={!enabled||sending} rows={2}/>
      <button type="button" className="rfq-chat-send" onClick={send} disabled={!enabled||sending||!text.trim()} aria-label="Send follow-up"><Send size={19}/></button>
    </div>
    <div className="rfq-chat-compose-meta"><span>{rfq.sent_to||rfq.rfq_number}</span>{feedback&&<strong role="status">{feedback}</strong>}</div>
  </section>,mount)
  return <>{header}{composer}</>
}
