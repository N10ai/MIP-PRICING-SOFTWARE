import { useEffect } from 'react'

export function RfqMobileActions(){
 useEffect(()=>{
  const onClick=(event:MouseEvent)=>{
   const target=event.target as HTMLElement|null
   const addVendor=target?.closest('.rfq-add-vendor') as HTMLButtonElement|null
   if(addVendor){
    event.preventDefault()
    event.stopPropagation()
    const close=document.querySelector('.pricing-workspace[data-mobile-rfq] .pricing-close') as HTMLButtonElement|null
    close?.click()
    location.hash='#/vendors'
    return
   }
   const addRate=target?.closest('.rfq-inline-add-rate') as HTMLButtonElement|null
   if(addRate){
    event.preventDefault()
    event.stopPropagation()
    const openRates=document.querySelector('.pricing-workspace[data-mobile-rfq] .open-rate-workspace') as HTMLButtonElement|null
    openRates?.click()
   }
  }
  const enhance=()=>{
   document.querySelectorAll('.pricing-workspace[data-mobile-rfq] .submitted-rfq-message').forEach(node=>{
    if(node.querySelector('.rfq-inline-add-rate'))return
    const button=document.createElement('button')
    button.type='button'
    button.className='rfq-inline-add-rate'
    button.textContent='Add manual rate'
    node.appendChild(button)
   })
  }
  document.addEventListener('click',onClick,true)
  const observer=new MutationObserver(enhance)
  observer.observe(document.body,{childList:true,subtree:true})
  enhance()
  return()=>{document.removeEventListener('click',onClick,true);observer.disconnect()}
 },[])
 return null
}
