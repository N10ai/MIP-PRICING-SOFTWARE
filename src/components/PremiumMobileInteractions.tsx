import {useEffect} from 'react'

export function PremiumMobileInteractions(){
 useEffect(()=>{
  const prepared=new WeakSet<Element>()
  const cleanups:Array<()=>void>=[]

  const prepareQuote=(root:Element)=>{
   if(prepared.has(root))return
   prepared.add(root)
   const handler=(event:Event)=>{
    const target=event.target as HTMLElement
    const card=target.closest<HTMLElement>('.mobile-charge')
    if(!card||target.closest('input,select,textarea,button'))return
    root.querySelectorAll('.mobile-charge.expanded').forEach(item=>{if(item!==card)item.classList.remove('expanded')})
    card.classList.toggle('expanded')
   }
   root.addEventListener('click',handler)
   cleanups.push(()=>root.removeEventListener('click',handler))
  }

  const prepareRfq=(root:HTMLElement)=>{
   if(prepared.has(root)||root.querySelector('.mobile-rfq-tabs'))return
   prepared.add(root)
   const labels=['Shipment','Vendors','Message']
   const order=labels.map(x=>x.toLowerCase())
   root.dataset.mobileRfq=order[0]
   const tabs=document.createElement('nav')
   tabs.className='mobile-rfq-tabs'
   const footer=document.createElement('footer')
   footer.className='mobile-rfq-footer'
   const back=document.createElement('button')
   const next=document.createElement('button')
   back.type=next.type='button'
   back.textContent='Back'
   next.textContent='Continue'

   const select=(index:number)=>{
    const safe=Math.max(0,Math.min(index,order.length-1))
    root.dataset.mobileRfq=order[safe]
    tabs.querySelectorAll('button').forEach((item,i)=>item.classList.toggle('active',i===safe))
    back.disabled=safe===0
    next.textContent=safe===order.length-1?'Send RFQ':'Continue'
    root.querySelector<HTMLElement>('.pricing-grid')?.scrollTo({top:0,behavior:'smooth'})
   }

   labels.forEach((label,index)=>{
    const button=document.createElement('button')
    button.type='button'
    button.textContent=label
    button.onclick=()=>select(index)
    tabs.appendChild(button)
   })
   back.onclick=()=>select(order.indexOf(root.dataset.mobileRfq||order[0])-1)
   next.onclick=()=>{
    const current=order.indexOf(root.dataset.mobileRfq||order[0])
    if(current<order.length-1){select(current+1);return}
    const create=[...root.querySelectorAll<HTMLButtonElement>('.pricing-preview button,.pricing-preview .ui-button')].find(button=>/create|send/i.test(button.textContent||''))
    create?.click()
   }
   footer.append(back,next)
   root.querySelector('.pricing-head')?.after(tabs)
   root.appendChild(footer)
   const templateButton=[...root.querySelectorAll<HTMLButtonElement>('.template-toolbar button')].find(button=>/template fields/i.test(button.textContent||''))
   if(templateButton)templateButton.textContent='Customize message'
   select(0)
  }

  const scan=()=>{
   if(!matchMedia('(max-width:760px)').matches)return
   document.querySelectorAll('.mobile-quote-app').forEach(prepareQuote)
   document.querySelectorAll<HTMLElement>('.pricing-workspace').forEach(prepareRfq)
  }
  scan()
  const observer=new MutationObserver(scan)
  observer.observe(document.body,{childList:true,subtree:true})
  return()=>{observer.disconnect();cleanups.forEach(fn=>fn())}
 },[])
 return null
}
