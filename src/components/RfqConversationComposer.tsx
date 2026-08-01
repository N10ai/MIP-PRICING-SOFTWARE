import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Send } from 'lucide-react'
import { supabase } from '../lib/supabase'

const QUICK_MESSAGES=[
  ['Validity','Please confirm the rate validity and expiration date.'],
  ['Inclusions','Please confirm which charges and services are included.'],
  ['Transit','Please confirm transit time, routing, and frequency.'],
  ['Revise rate','Please review the shipment and provide your best revised rate.'],
]

type ActiveRfq={id:string;rfq_number:string;status:string;sent_to:string|null}

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
  const[rfq,setRfq]=useState<ActiveRfq|null>(null)
  const[text,setText]=useState('')
  const[sending,setSending]=useState(false)
  const[feedback,setFeedback]=useState('')

  useEffect(()=>{
    let lastNumber=''
    const sync=async()=>{
      compactQuotedHistory()
      const conversation=document.querySelector<HTMLElement>('.rfq-conversation')
      if(conversation){
        let host=conversation.parentElement?.querySelector<HTMLElement>('[data-rfq-chat-composer]')||null
        if(!host){host=document.createElement('div');host.dataset.rfqChatComposer='true';conversation.insertAdjacentElement('afterend',host)}
        setMount(host)
      }else setMount(null)
      const rfqNumber=readVisibleRfqNumber()
      if(!rfqNumber||rfqNumber===lastNumber)return
      lastNumber=rfqNumber
      const{data}=await supabase.from('vendor_rfqs').select('id,rfq_number,status,sent_to').eq('rfq_number',rfqNumber).maybeSingle()
      setRfq((data||null) as ActiveRfq|null);setFeedback('');setText('')
    }
    void sync()
    const observer=new MutationObserver(()=>void sync())
    observer.observe(document.body,{childList:true,subtree:true,characterData:true})
    return()=>observer.disconnect()
  },[])

  const enabled=useMemo(()=>Boolean(rfq&&['sent','delivered','awaiting_response','responded'].includes(String(rfq.status).toLowerCase())),[rfq])
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

  if(!mount||!rfq)return null
  return createPortal(<section className="rfq-chat-composer" aria-label="Vendor follow-up">
    <div className="rfq-chat-quick-actions">{QUICK_MESSAGES.map(([label,value])=><button type="button" key={label} onClick={()=>setText(value)}>{label}</button>)}</div>
    <div className="rfq-chat-compose-row">
      <textarea value={text} onChange={event=>setText(event.target.value)} placeholder={enabled?'Write a message…':'Send the RFQ first'} disabled={!enabled||sending} rows={2}/>
      <button type="button" className="rfq-chat-send" onClick={send} disabled={!enabled||sending||!text.trim()} aria-label="Send follow-up"><Send size={19}/></button>
    </div>
    <div className="rfq-chat-compose-meta"><span>{rfq.sent_to||rfq.rfq_number}</span>{feedback&&<strong role="status">{feedback}</strong>}</div>
  </section>,mount)
}
