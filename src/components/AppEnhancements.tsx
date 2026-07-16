import {useEffect} from 'react'
import {loadFreightLocations,freightLocations} from '../data/locations'
import {supabase} from '../lib/supabase'

const incoterms=['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP']
const setNativeValue=(element:HTMLInputElement|HTMLTextAreaElement,value:string)=>{const proto=element instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;const setter=Object.getOwnPropertyDescriptor(proto,'value')?.set;setter?.call(element,value);element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}))}

export function AppEnhancements(){
 useEffect(()=>{
  loadFreightLocations().then(rows=>{if(rows!==freightLocations)freightLocations.splice(0,freightLocations.length,...rows)})
  let clauses:{title:string;body:string;modes:string[]}[]=[]
  supabase.from('quote_clauses').select('title,body,modes').eq('active',true).order('sort_order').then(({data})=>{clauses=(data||[]) as typeof clauses;enhance(document)})
  const prepareNumericInputs=(root:ParentNode=document)=>root.querySelectorAll<HTMLInputElement>('input[type="number"], input[inputmode="decimal"]').forEach(input=>{input.step='any';input.inputMode='decimal';input.autocomplete='off'})
  const enhance=(root:ParentNode)=>{
   prepareNumericInputs(root)
   root.querySelectorAll<HTMLElement>('.quote-editor-info label').forEach(label=>{
    if(label.querySelector('span')?.textContent?.trim().toLowerCase()!=='incoterm')return
    const input=label.querySelector('input');if(!input||input.dataset.enhanced)return
    input.dataset.enhanced='true';input.setAttribute('list','mip-incoterms')
    if(!document.getElementById('mip-incoterms')){const list=document.createElement('datalist');list.id='mip-incoterms';list.innerHTML=incoterms.map(x=>`<option value="${x}"></option>`).join('');document.body.appendChild(list)}
   })
   root.querySelectorAll<HTMLElement>('.quote-details label').forEach(label=>{
    if(label.querySelector('span')?.textContent?.trim().toLowerCase()!=='terms'||label.dataset.clauses)return
    const textarea=label.querySelector('textarea');if(!textarea)return;label.dataset.clauses='true'
    const bar=document.createElement('div');bar.className='clause-library-bar';const select=document.createElement('select');select.innerHTML='<option value="">Add clause from library…</option>'+clauses.map((c,i)=>`<option value="${i}">${c.title}</option>`).join('');select.addEventListener('change',()=>{const c=clauses[Number(select.value)];if(!c)return;const current=textarea.value.trim();setNativeValue(textarea,current?`${current}\n\n${c.body}`:c.body);select.value=''});bar.appendChild(select);label.insertBefore(bar,textarea)
   })
  }
  enhance(document)
  const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node instanceof HTMLElement)enhance(node)})))
  observer.observe(document.body,{childList:true,subtree:true})
  const onClick=(event:MouseEvent)=>{const target=event.target as HTMLElement;const tab=target.closest('.drawer-tabs button') as HTMLButtonElement|null;if(tab){event.preventDefault();return}}
  const onFocus=(event:FocusEvent)=>{const input=event.target as HTMLInputElement;if(input.matches('.cargo-grid input[type="number"], .cargo-grid input[inputmode="decimal"], .cargo-grid input[inputmode="numeric"]'))input.select()}
  document.addEventListener('click',onClick,true);document.addEventListener('focusin',onFocus,true)
  return()=>{observer.disconnect();document.removeEventListener('click',onClick,true);document.removeEventListener('focusin',onFocus,true)}
 },[])
 return null
}
