import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { MessageSquare, Send } from 'lucide-react'
import { supabase } from '../lib/supabase'

const QUICK_MESSAGES=[
  ['Confirm validity','Please confirm the rate validity and any applicable expiration date.'],
  ['Confirm inclusions','Please confirm which surcharges and services are included in your quoted rate.'],
  ['Ask transit time','Please confirm the transit time, routing, and service frequency.'],
  ['Request revised rate','Please review the shipment details and provide your best revised rate.'],
]

type ActiveRfq={id:string;rfq_number:string;status:string;sent_to:string|null}

function readVisibleRfqNumber(){
  const summary=document.querySelector('.rfq-summary')
  if(!summary)return ''
  const rows=Array.from(summary.querySelectorAll(':scope > div'))
  for(const row of rows){
    const label=row.querySelector('span')?.textContent?.trim().toLowerCase()
    if(label==='rfq')return row.querySelector('strong')?.textContent?.trim()||''
  }
  return ''
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
      setRfq((data||null) as ActiveRfq|null)
      setFeedback('')
      setText('')
    }
    void sync()
    const observer=new MutationObserver(()=>void sync())
    observer.observe(document.body,{childList:true,subtree:true,characterData:true})
    return()=>observer.disconnect()
  },[])

  const enabled=useMemo(()=>Boolean(rfq&&['sent','delivered','awaiting_response','responded'].includes(String(rfq.status).toLowerCase())),[rfq])

  const send=async()=>{
    if(!rfq||!text.trim()||sending||!enabled)return
    setSending(true);setFeedback('Sending follow-up…')
    try{
      const{data,error}=await supabase.functions.invoke<{status?:string;error?:string}>('send-rfq-followup',{body:{vendor_rfq_id:rfq.id,message:text.trim()}})
      if(error)throw error
      if(data?.error)throw new Error(data.error)
      setText('');setFeedback('Follow-up sent. It will appear in the thread automatically.')
    }catch(error){
      setFeedback(error instanceof Error?error.message:'Unable to send follow-up')
    }finally{setSending(false)}
  }

  if(!mount||!rfq)return null
  return createPortal(
    <section className="rfq-chat-composer" aria-label="Vendor follow-up">
      <div className="rfq-chat-quick-actions">
        {QUICK_MESSAGES.map(([label,value])=><button type="button" key={label} onClick={()=>setText(value)}>{label}</button>)}
      </div>
      <div className="rfq-chat-compose-row">
        <MessageSquare size={19}/>
        <textarea value={text} onChange={event=>setText(event.target.value)} placeholder={enabled?'Message vendor…':'Send the original RFQ before starting a conversation.'} disabled={!enabled||sending} rows={2}/>
        <button type="button" className="rfq-chat-send" onClick={send} disabled={!enabled||sending||!text.trim()} aria-label="Send follow-up message">
          <Send size={18}/><span>{sending?'Sending…':'Send'}</span>
        </button>
      </div>
      <div className="rfq-chat-compose-meta">
        <span>Continuing {rfq.rfq_number}{rfq.sent_to?` with ${rfq.sent_to}`:''}</span>
        {feedback&&<strong role="status">{feedback}</strong>}
      </div>
    </section>,
    mount,
  )
}
