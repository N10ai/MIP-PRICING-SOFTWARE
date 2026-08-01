import { useEffect } from 'react'

function routeState(){
  const hash=window.location.hash
  const params=new URLSearchParams(hash.includes('?')?hash.slice(hash.indexOf('?')+1):'')
  const view=params.get('view')||''
  const rfq=params.get('rfq')||''
  return {view,rfq,isChat:view==='messages'&&Boolean(rfq),isNewRfq:view==='vendors'||(view==='messages'&&!rfq)}
}

function applyState(){
  const state=routeState()
  document.body.classList.toggle('rfq-route-chat',state.isChat)
  document.body.classList.toggle('rfq-route-new',state.isNewRfq)

  document.querySelectorAll<HTMLElement>('.pricing-workspace').forEach(workspace=>{
    workspace.classList.toggle('rfq-route-chat-workspace',state.isChat)
    workspace.classList.toggle('rfq-route-new-workspace',state.isNewRfq)

    const tabs=workspace.querySelectorAll<HTMLButtonElement>('.mobile-rfq-tabs button')
    tabs.forEach(button=>{
      const label=button.textContent?.trim().toLowerCase()||''
      if(label==='messages')button.querySelector('span')!.textContent='Template'
      if(label==='summary')button.dataset.routeHidden='true'
    })

    if(state.isNewRfq){
      const target=state.view==='messages'?'message':'vendors'
      workspace.dataset.mobileRfq=target
    }
  })
}

export function RfqRouteStateEnforcer(){
  useEffect(()=>{
    let frame=0
    const sync=()=>{
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(applyState)
    }
    sync()
    const observer=new MutationObserver(sync)
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','data-mobile-rfq']})
    window.addEventListener('hashchange',sync)
    return()=>{
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('hashchange',sync)
      document.body.classList.remove('rfq-route-chat','rfq-route-new')
    }
  },[])
  return null
}
