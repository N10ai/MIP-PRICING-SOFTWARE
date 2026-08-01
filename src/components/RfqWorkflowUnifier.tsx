import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { requestWorkspaceRoute } from '../lib/pricingRoutes'

const exactText=(root:ParentNode,selector:string,value:string)=>Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(node=>node.textContent?.trim()===value)

function currentRequestId(){
  const hash=window.location.hash.replace(/^#/,'')
  const query=hash.includes('?')?hash.slice(hash.indexOf('?')+1):''
  return new URLSearchParams(query).get('request')||''
}

async function openConversation(card:HTMLElement){
  const requestId=currentRequestId()
  const rfqNumber=card.querySelector('small')?.textContent?.trim()||''
  if(!requestId||!rfqNumber)return
  const{data}=await supabase.from('vendor_rfqs').select('id').eq('quote_request_id',requestId).eq('rfq_number',rfqNumber).maybeSingle()
  if(!data?.id)return
  window.location.hash=requestWorkspaceRoute(requestId,'messages',data.id)
}

function setCopy(){
  const ratesSection=document.querySelector<HTMLElement>('.rates-workspace')
  if(ratesSection){
    const description=ratesSection.querySelector<HTMLElement>('.rates-heading p')
    if(description)description.textContent='Open a vendor conversation, add rates and shipment details, then compare the completed options.'
    const compare=ratesSection.querySelector<HTMLElement>('.rates-primary')
    if(compare)compare.textContent='Compare vendor rates'
    const another=ratesSection.querySelector<HTMLElement>('.secondary-rate-action')
    if(another)another.textContent='New vendor RFQ'
  }

  exactText(document,'button','Edit response').forEach(button=>button.textContent='Review rates')
  exactText(document,'button','Add response').forEach(button=>button.textContent='Add rates & details')
  exactText(document,'button','Save response').forEach(button=>button.textContent='Save rates')
  exactText(document,'button','Request vendor RFQ').forEach(button=>button.textContent='RFQs & conversations')
  exactText(document,'button','Compare rates').forEach(button=>button.textContent='Compare vendor rates')

  exactText(document,'small','VENDOR RESPONSE').forEach(node=>node.textContent='VENDOR RATES')
  exactText(document,'small','VENDOR RESPONSES').forEach(node=>node.textContent='VENDOR RATES')
  exactText(document,'small','RESPONSE SUMMARY').forEach(node=>node.textContent='RATE SUMMARY')
  exactText(document,'small','QUICK RESPONSE').forEach(node=>node.textContent='RATE DETAILS')
  exactText(document,'small','ENTER RESPONSE').forEach(node=>node.textContent='ADD RATES & DETAILS')
  exactText(document,'h3','Vendor responses').forEach(node=>node.textContent='RFQs & rates')

  const ratesActive=Array.from(document.querySelectorAll<HTMLElement>('.decision-tabs button')).some(button=>button.classList.contains('active')&&button.textContent?.trim()==='Rates')
  const footer=document.querySelector<HTMLElement>('.decision-actions')
  if(footer)footer.dataset.ratesActive=ratesActive?'true':'false'
}

function wireRateCards(){
  document.querySelectorAll<HTMLElement>('.rfq-decision-card').forEach(card=>{
    if(card.dataset.workflowUnified==='true')return
    card.dataset.workflowUnified='true'
    card.tabIndex=0
    card.setAttribute('role','button')
    card.setAttribute('aria-label',`Open conversation for ${card.querySelector('b')?.textContent?.trim()||'vendor RFQ'}`)

    const open=()=>void openConversation(card)
    card.addEventListener('click',event=>{
      if((event.target as HTMLElement).closest('button'))return
      open()
    })
    card.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();open()}
    })

    const footer=card.querySelector('footer')
    if(footer&&!footer.querySelector('.open-rfq-chat')){
      const button=document.createElement('button')
      button.type='button'
      button.className='open-rfq-chat'
      button.textContent='Open chat'
      button.addEventListener('click',event=>{event.stopPropagation();open()})
      footer.prepend(button)
    }
  })
}

export function RfqWorkflowUnifier(){
  useEffect(()=>{
    let queued=false
    const sync=()=>{
      if(queued)return
      queued=true
      requestAnimationFrame(()=>{
        queued=false
        setCopy()
        wireRateCards()
      })
    }
    sync()
    const observer=new MutationObserver(sync)
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']})
    window.addEventListener('hashchange',sync)
    return()=>{observer.disconnect();window.removeEventListener('hashchange',sync)}
  },[])
  return null
}
