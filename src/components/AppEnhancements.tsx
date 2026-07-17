import {useEffect} from 'react'
import {loadFreightLocations,freightLocations} from '../data/locations'
import {supabase} from '../lib/supabase'

const commercialLists={
 incoterms:['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'],
 services:['Airport to Airport','Door to Airport','Airport to Door','Door to Door','Air Express','Air Charter','Ocean LCL','Ocean FCL','Ocean Breakbulk','Ocean RoRo','Ground LTL','Ground FTL','Drayage','Pickup','Delivery','Customs Clearance','Bonded Transportation','FTZ Handling','Warehousing','Cross-dock','Cargo Insurance','Packing / Crating'],
 commodities:['General Cargo','Commercial Goods','Machinery','Electronics','Furniture','Auto Parts','Textiles','Food Products','Pharmaceuticals','Cosmetics','Trade Show Materials','Household Goods','Dangerous Goods','Lithium Batteries','Perishables','Oversized Cargo'],
 packages:['Pallet','Box','Carton','Crate','Drum','Bag','Bundle','Piece','Skid','Container','Roll','Case'],
 frequencies:['Daily','Weekdays','2x weekly','3x weekly','Weekly','Biweekly','On request','Subject to space'],
 transit:['Same day','1 day','1–2 days','2–3 days','3–5 days','5–7 days','7–10 days','10–14 days','To be confirmed'],
 payment:['Prepaid','Collect','Due on receipt','Net 7','Net 15','Net 30','Net 45','Net 60'],
 vendorTypes:['Airline','GSA','Air Cargo Agent','NVOCC','Ocean Carrier','Co-loader','Trucker','Drayage Carrier','Customs Broker','Warehouse / CFS','Courier','Overseas Agent','Other Service Provider']
} as const

const setNativeValue=(element:HTMLInputElement|HTMLTextAreaElement,value:string)=>{const proto=element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;setter?.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}))}
const labelText=(input:HTMLInputElement)=>input.closest('label')?.querySelector('span')?.textContent?.trim().toLowerCase()||input.getAttribute('aria-label')?.toLowerCase()||''

function ensureDatalists(){
 Object.entries(commercialLists).forEach(([id,values])=>{
  const listId=`mip-${id}-list`;let list=document.getElementById(listId) as HTMLDataListElement|null
  if(!list){list=document.createElement('datalist');list.id=listId;document.body.appendChild(list)}
  list.innerHTML=values.map(value=>`<option value="${value.replaceAll('&','&amp;').replaceAll('"','&quot;')}"></option>`).join('')
 })
}

function connectCommercialSelectors(root:ParentNode=document){
 root.querySelectorAll<HTMLInputElement>('input').forEach(input=>{
  const label=labelText(input)
  if(label.includes('incoterm'))input.setAttribute('list','mip-incoterms-list')
  else if(label==='service'||label.includes('service type'))input.setAttribute('list','mip-services-list')
  else if(label.includes('commodity'))input.setAttribute('list','mip-commodities-list')
  else if(label==='package'||label.includes('packaging'))input.setAttribute('list','mip-packages-list')
  else if(label.includes('frequency'))input.setAttribute('list','mip-frequencies-list')
  else if(label.includes('transit'))input.setAttribute('list','mip-transit-list')
  else if(label.includes('payment terms'))input.setAttribute('list','mip-payment-list')
  else if(label.includes('vendor type'))input.setAttribute('list','mip-vendorTypes-list')
 })
}

export function AppEnhancements(){
 useEffect(()=>{
  loadFreightLocations().then(rows=>{if(rows!==freightLocations)freightLocations.splice(0,freightLocations.length,...rows)})
  ensureDatalists()
  let clauses:{title:string;body:string;modes:string[]}[]=[]
  supabase.from('quote_clauses').select('title,body,modes').eq('active',true).order('sort_order').then(({data})=>{clauses=(data||[]) as typeof clauses;enhance(document)})
  const prepareNumericInputs=(root:ParentNode=document)=>root.querySelectorAll<HTMLInputElement>('input[type="number"], input[inputmode="decimal"]').forEach(input=>{input.step='any';input.inputMode='decimal';input.autocomplete='off'})
  const enhance=(root:ParentNode)=>{
   prepareNumericInputs(root);connectCommercialSelectors(root)
   root.querySelectorAll<HTMLElement>('.quote-details label').forEach(label=>{
    if(label.querySelector('span')?.textContent?.trim().toLowerCase()!=='terms'||label.dataset.clauses)return
    const textarea=label.querySelector('textarea');if(!textarea)return;label.dataset.clauses='true'
    const bar=document.createElement('div');bar.className='clause-library-bar';const select=document.createElement('select');select.innerHTML='<option value="">Add clause from library…</option>'+clauses.map((c,i)=>`<option value="${i}">${c.title}</option>`).join('');select.addEventListener('change',()=>{const c=clauses[Number(select.value)];if(!c)return;const current=textarea.value.trim();setNativeValue(textarea,current?`${current}\n\n${c.body}`:c.body);select.value=''});bar.appendChild(select);label.insertBefore(bar,textarea)
   })
  }
  enhance(document)
  const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)enhance(node)})))
  observer.observe(document.body,{childList:true,subtree:true})
  const onClick=(event:MouseEvent)=>{const target=event.target as HTMLElement;const tab=target.closest('.drawer-tabs button') as HTMLButtonElement|null;if(tab&&tab.dataset.target){event.preventDefault();document.getElementById(tab.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'})}}
  const onFocus=(event:FocusEvent)=>{const input=event.target as HTMLInputElement;if(input.matches('.cargo-grid input[type="number"], .cargo-grid input[inputmode="decimal"], .cargo-grid input[inputmode="numeric"]'))input.select()}
  document.addEventListener('click',onClick,true);document.addEventListener('focusin',onFocus,true)
  return()=>{observer.disconnect();document.removeEventListener('click',onClick,true);document.removeEventListener('focusin',onFocus,true)}
 },[])
 return null
}
