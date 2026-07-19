import { useEffect } from 'react'

const textFor=(root:Element,label:string)=>Array.from(root.querySelectorAll('.rfq-summary-grid article')).find(article=>article.querySelector('small')?.textContent?.trim().toUpperCase()===label)?.querySelector('b,pre')?.textContent?.trim()||''

export function RfqMobileBehaviorFix(){
 useEffect(()=>{
  const enhancePreview=()=>{
   const launcher=document.querySelector<HTMLButtonElement>('.pricing-workspace[data-mobile-rfq] .rfq-summary-launcher:not([data-preview-ready])')
   if(!launcher)return
   launcher.dataset.previewReady='pending'
   document.body.dataset.rfqProbe='true'
   launcher.click()
   window.setTimeout(()=>{
    const overlay=document.querySelector('.pricing-workspace[data-mobile-rfq] .rfq-summary-overlay')
    if(!overlay){delete launcher.dataset.previewReady;delete document.body.dataset.rfqProbe;return}
    const mode=textFor(overlay,'MODE')||'Freight'
    const route=textFor(overlay,'ROUTE')||launcher.querySelector('b')?.textContent?.split('·').pop()?.trim()||'Shipment'
    const total=textFor(overlay,'TOTAL')||'—'
    const volume=textFor(overlay,'VOLUME')||'—'
    const pieces=(total.match(/([\d.]+)\s*(pieces?|pallets?)/i)?.[1]||launcher.textContent?.match(/([\d.]+)\s*pieces?/i)?.[1]||'—')
    const weight=total.split('·')[0]?.trim()||'—'
    launcher.innerHTML=`<span class="rfq-preview-top"><span class="rfq-preview-mode">▱ ${mode}</span><span class="rfq-preview-chevron">⌄</span></span><strong class="rfq-preview-route">${route}</strong><span class="rfq-preview-metrics"><span><b>${pieces}</b><small>pieces</small></span><span><b>${weight}</b><small>total weight</small></span><span><b>${volume.replace(/\s*CBM/i,'')}</b><small>CBM</small></span></span>`
    launcher.dataset.previewReady='true'
    overlay.querySelector<HTMLButtonElement>('.rfq-summary-sheet>header button')?.click()
    delete document.body.dataset.rfqProbe
   },40)
  }

  const observer=new MutationObserver(enhancePreview)
  observer.observe(document.body,{childList:true,subtree:true})
  enhancePreview()

  const onClick=(event:MouseEvent)=>{
   const target=event.target as Element|null
   const add=target?.closest<HTMLButtonElement>('.pricing-workspace[data-mobile-rfq] .rfq-add-vendor')
   if(!add)return
   event.preventDefault();event.stopPropagation();event.stopImmediatePropagation()
   document.querySelector<HTMLButtonElement>('.pricing-workspace[data-mobile-rfq] .pricing-close')?.click()
   window.setTimeout(()=>{location.hash='#/vendors'},40)
  }
  document.addEventListener('click',onClick,true)
  return()=>{observer.disconnect();document.removeEventListener('click',onClick,true);delete document.body.dataset.rfqProbe}
 },[])
 return null
}
