import {useEffect} from 'react'

export function PremiumMobileInteractions(){
 useEffect(()=>{
  const prepared=new WeakSet<Element>()
  const prepareQuote=(root:Element)=>{
   if(prepared.has(root))return
   prepared.add(root)
   const tabs=[...root.querySelectorAll<HTMLButtonElement>('.mobile-quote-tabs button')]
   const preview=tabs.find(button=>button.textContent?.trim().toLowerCase()==='preview')
   if(preview)setTimeout(()=>preview.click(),30)
   root.addEventListener('click',event=>{
    const target=event.target as HTMLElement
    const card=target.closest<HTMLElement>('.mobile-charge')
    if(!card||target.closest('input,select,textarea,.mobile-charge-title button'))return
    root.querySelectorAll('.mobile-charge.expanded').forEach(item=>{if(item!==card)item.classList.remove('expanded')})
    card.classList.toggle('expanded')
   })
  }
  const prepareRfq=(root:HTMLElement)=>{
   if(prepared.has(root))return
   prepared.add(root)
   root.dataset.mobileRfq='shipment'
   const labels=['Shipment','Vendors','Message']
   const tabs=document.createElement('nav')
   tabs.className='mobile-rfq-tabs premium-tabs'
   labels.forEach((label,index)=>{
    const button=document.createElement('button')
    button.type='button'
    button.textContent=label
    button.className=index===0?'active':''
    button.onclick=()=>{
     root.dataset.mobileRfq=label.toLowerCase()
     tabs.querySelectorAll('button').forEach(item=>item.classList.toggle('active',item===button))
     root.querySelector('.pricing-grid')?.scrollTo({top:0,behavior:'smooth'})
    }
    tabs.appendChild(button)
   })
   root.querySelector('.pricing-head')?.after(tabs)
   const footer=document.createElement('footer')
   footer.className='mobile-rfq-footer premium-footer'
   const back=document.createElement('button');back.type='button';back.textContent='Back'
   const next=document.createElement('button');next.type='button';next.textContent='Continue'
   const order=['shipment','vendors','message']
   back.onclick=()=>{const current=order.indexOf(root.dataset.mobileRfq||'shipment');if(current<=0)return;(tabs.children[current-1] as HTMLButtonElement).click()}
   next.onclick=()=>{const current=order.indexOf(root.dataset.mobileRfq||'shipment');if(current<order.length-1){(tabs.children[current+1] as HTMLButtonElement).click();return}const create=[...root.querySelectorAll<HTMLButtonElement>('.pricing-preview button')].find(button=>/create/i.test(button.textContent||''));create?.click()}
   footer.append(back,next);root.appendChild(footer)
   const templateButton=[...root.querySelectorAll<HTMLButtonElement>('.template-toolbar button')].find(button=>/template fields/i.test(button.textContent||''))
   if(templateButton)templateButton.textContent='Customize message'
  }
  const scan=()=>{
   if(matchMedia('(max-width:760px)').matches){document.querySelectorAll('.mobile-quote-app').forEach(prepareQuote);document.querySelectorAll<HTMLElement>('.pricing-workspace').forEach(prepareRfq)}
  }
  scan()
  const observer=new MutationObserver(scan)
  observer.observe(document.body,{childList:true,subtree:true})
  return()=>observer.disconnect()
 },[])
 return null
}
