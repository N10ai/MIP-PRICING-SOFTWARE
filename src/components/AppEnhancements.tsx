import {useEffect} from 'react'
import {loadFreightLocations,freightLocations} from '../data/locations'

export function AppEnhancements(){
 useEffect(()=>{
  loadFreightLocations().then(rows=>{
   if(rows!==freightLocations){freightLocations.splice(0,freightLocations.length,...rows)}
  })

  const prepareNumericInputs=(root:ParentNode=document)=>{
   root.querySelectorAll<HTMLInputElement>('input[type="number"], input[inputmode="decimal"]').forEach(input=>{
    input.step='any'
    input.inputMode='decimal'
    input.autocomplete='off'
   })
  }
  prepareNumericInputs()
  const observer=new MutationObserver(records=>{
   for(const record of records){
    record.addedNodes.forEach(node=>{
     if(node instanceof HTMLElement){
      if(node.matches('input[type="number"], input[inputmode="decimal"]'))prepareNumericInputs(node.parentNode||document)
      else prepareNumericInputs(node)
     }
    })
   }
  })
  observer.observe(document.body,{childList:true,subtree:true})

  const onClick=(event:MouseEvent)=>{
   const target=event.target as HTMLElement
   const tab=target.closest('.drawer-tabs a') as HTMLAnchorElement|null
   if(tab){
    event.preventDefault()
    event.stopPropagation()
    const id=tab.getAttribute('href')?.replace('#','')
    if(id)document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'})
    return
   }
   const rfqButton=target.closest('.drawer-actions button:first-child') as HTMLButtonElement|null
   if(rfqButton){
    const drawer=document.querySelector('.request-drawer')
    const requestNumber=drawer?.querySelector('.drawer-title small')?.textContent
    if(requestNumber){
     const rows=Array.from(document.querySelectorAll('.request-row'))
     const row=rows.find(x=>x.textContent?.includes(requestNumber)) as HTMLElement|undefined
     const requestId=row?.dataset.requestId
     if(requestId){event.preventDefault();location.hash=`#/rfq/${requestId}`}
    }
   }
  }

  const onFocus=(event:FocusEvent)=>{
   const input=event.target as HTMLInputElement
   if(input.matches('.cargo-grid input[type="number"], .cargo-grid input[inputmode="decimal"], .cargo-grid input[inputmode="numeric"]'))input.select()
  }

  document.addEventListener('click',onClick,true)
  document.addEventListener('focusin',onFocus,true)
  return()=>{observer.disconnect();document.removeEventListener('click',onClick,true);document.removeEventListener('focusin',onFocus,true)}
 },[])
 return null
}
