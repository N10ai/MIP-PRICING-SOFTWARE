import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckSquare, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'

type RfqRow={id:string;rfq_number:string;status:string;created_at:string;response_data:Record<string,unknown>|null;vendor_id:string|null;vendors?:{company?:string}|null}

function visibleRequestNumber(){
  return document.querySelector<HTMLElement>('.compact-request-head small')?.textContent?.trim()||''
}

function score(row:RfqRow){
  const status=String(row.status||'').toLowerCase()
  const hasRate=Boolean(row.response_data&&Object.keys(row.response_data).length)
  const statusScore=status==='selected'?50:['responded','received','accepted'].includes(status)?40:['sent','delivered','awaiting_response'].includes(status)?30:10
  return statusScore+(hasRate?20:0)+new Date(row.created_at).getTime()/1e13
}

export function RfqDeletionManager(){
  const[mount,setMount]=useState<HTMLElement|null>(null)
  const[open,setOpen]=useState(false)
  const[loading,setLoading]=useState(false)
  const[deleting,setDeleting]=useState(false)
  const[rows,setRows]=useState<RfqRow[]>([])
  const[selected,setSelected]=useState<string[]>([])
  const[feedback,setFeedback]=useState('')

  useEffect(()=>{
    const sync=()=>{
      const heading=document.querySelector<HTMLElement>('.rates-heading')
      if(!heading){setMount(null);return}
      let host=heading.querySelector<HTMLElement>('[data-rfq-delete-manager]')
      if(!host){host=document.createElement('div');host.dataset.rfqDeleteManager='true';heading.appendChild(host)}
      setMount(host)
    }
    sync()
    const observer=new MutationObserver(sync)
    observer.observe(document.body,{childList:true,subtree:true})
    return()=>observer.disconnect()
  },[])

  const load=async()=>{
    const requestNumber=visibleRequestNumber()
    if(!requestNumber)return
    setLoading(true);setFeedback('')
    const{data:request,error:requestError}=await supabase.from('quote_requests').select('id').eq('request_number',requestNumber).maybeSingle()
    if(requestError||!request){setFeedback(requestError?.message||'Request not found');setLoading(false);return}
    const{data,error}=await supabase.from('vendor_rfqs').select('id,rfq_number,status,created_at,response_data,vendor_id,vendors(company)').eq('quote_request_id',request.id).order('created_at',{ascending:false})
    if(error)setFeedback(error.message)
    setRows((data||[]) as unknown as RfqRow[]);setSelected([]);setLoading(false)
  }

  const duplicateIds=useMemo(()=>{
    const groups=new Map<string,RfqRow[]>()
    rows.forEach(row=>{const key=row.vendor_id||row.vendors?.company||row.id;groups.set(key,[...(groups.get(key)||[]),row])})
    const ids:string[]=[]
    groups.forEach(group=>{
      if(group.length<2)return
      const keep=[...group].sort((a,b)=>score(b)-score(a))[0]
      group.forEach(row=>{if(row.id!==keep.id)ids.push(row.id)})
    })
    return ids
  },[rows])

  const openManager=()=>{setOpen(true);void load()}
  const toggle=(id:string)=>setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id])
  const deleteSelected=async()=>{
    if(!selected.length||deleting)return
    const chosen=rows.filter(row=>selected.includes(row.id))
    const names=chosen.slice(0,5).map(row=>`${row.vendors?.company||'Vendor'} — ${row.rfq_number}`).join('\n')
    if(!confirm(`Delete ${chosen.length} RFQ${chosen.length===1?'':'s'} and their chat history?\n\n${names}${chosen.length>5?'\n…':''}`))return
    if(!confirm('This permanently removes the selected RFQs, messages, and saved vendor-rate data. Continue?'))return
    setDeleting(true);setFeedback('Deleting…')
    const{error:messageError}=await supabase.from('rfq_conversation_messages').delete().in('vendor_rfq_id',selected)
    if(messageError){setFeedback(messageError.message);setDeleting(false);return}
    const{error}=await supabase.from('vendor_rfqs').delete().in('id',selected)
    if(error){setFeedback(error.message);setDeleting(false);return}
    setFeedback(`${selected.length} RFQ${selected.length===1?'':'s'} deleted`)
    setRows(current=>current.filter(row=>!selected.includes(row.id)));setSelected([]);setDeleting(false)
    window.setTimeout(()=>location.reload(),500)
  }

  const trigger=mount?createPortal(<button type="button" className="rfq-manage-delete-button" onClick={openManager}><Trash2 size={16}/>Manage RFQs</button>,mount):null
  const modal=open?createPortal(<div className="rfq-delete-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!deleting)setOpen(false)}}><section className="rfq-delete-modal" role="dialog" aria-modal="true" aria-label="Manage RFQs">
    <header><div><small>RFQ CLEANUP</small><h2>Manage RFQs</h2><p>Select old or duplicate RFQs to remove.</p></div><button type="button" onClick={()=>setOpen(false)} disabled={deleting} aria-label="Close"><X size={20}/></button></header>
    <div className="rfq-delete-tools"><button type="button" disabled={!duplicateIds.length||deleting} onClick={()=>setSelected(duplicateIds)}><CheckSquare size={16}/>Select older duplicates ({duplicateIds.length})</button><button type="button" disabled={!selected.length||deleting} className="danger" onClick={deleteSelected}><Trash2 size={16}/>Delete selected ({selected.length})</button></div>
    {feedback&&<div className="rfq-delete-feedback" role="status">{feedback}</div>}
    <div className="rfq-delete-list">{loading?<p>Loading RFQs…</p>:rows.length?rows.map(row=><label key={row.id} className={selected.includes(row.id)?'selected':''}><input type="checkbox" checked={selected.includes(row.id)} onChange={()=>toggle(row.id)} disabled={deleting}/><span><b>{row.vendors?.company||'Vendor'}</b><small>{row.rfq_number} · {row.status} · {new Date(row.created_at).toLocaleString()}</small></span>{duplicateIds.includes(row.id)&&<em>Duplicate</em>}</label>):<p>No RFQs found.</p>}</div>
  </section></div>,document.body):null
  return <>{trigger}{modal}</>
}
