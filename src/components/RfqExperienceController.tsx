import { useEffect } from 'react'

const text=(node:Element)=>node.textContent?.trim().toLowerCase()||''

function configureSummary(){
  const body=document.querySelector<HTMLElement>('.decision-body')
  const decision=body?.querySelector<HTMLElement>('.pricing-decision-card')
  const facts=body?.querySelector<HTMLElement>('.compact-shipment-facts')
  if(body&&decision&&facts&&decision.nextElementSibling!==facts){
    body.insertBefore(decision,facts)
  }

  const footer=document.querySelector<HTMLElement>('.decision-actions')
  if(!footer)return
  footer.classList.add('rfq-summary-actions')
  const buttons=Array.from(footer.querySelectorAll<HTMLButtonElement>('button'))
  buttons.forEach(button=>{
    delete button.dataset.rfqPrimaryAction
    delete button.dataset.quotePrimaryAction
    const label=text(button)
    if(label.includes('rfq')||label.includes('conversation')||label.includes('vendor rate')){
      button.dataset.rfqPrimaryAction='true'
      button.textContent='Request a vendor rate'
      return
    }
    if(label.includes('open q-')||label.includes('open quote')){
      button.dataset.quotePrimaryAction='true'
      button.textContent='Open quote'
      return
    }
    if(label.includes('create quote')||label.includes('build quote')){
      button.dataset.quotePrimaryAction='true'
      button.textContent='Create quote'
    }
  })
}

function configureNewRfq(){
  document.querySelectorAll<HTMLElement>('.pricing-workspace').forEach(workspace=>{
    if(workspace.classList.contains('rfq-chat-focus-mode'))return
    const tabs=workspace.querySelector<HTMLElement>('.pricing-mobile-tabs')
    if(!tabs)return
    workspace.classList.add('rfq-new-request-mode')
    Array.from(tabs.querySelectorAll<HTMLButtonElement>('button')).forEach(button=>{
      const label=text(button)
      if(label==='messages')button.textContent='Template'
      if(label==='summary')button.dataset.rfqHiddenTab='true'
    })
  })
}

function configureChat(){
  const focused=document.querySelector<HTMLElement>('.pricing-workspace.rfq-chat-focus-mode')
  document.body.classList.toggle('rfq-chat-open',Boolean(focused))
  if(focused){
    focused.setAttribute('aria-label','Vendor conversation')
    focused.scrollTop=0
  }
}

export function RfqExperienceController(){
  useEffect(()=>{
    let frame=0
    const sync=()=>{
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(()=>{
        configureChat()
        configureSummary()
        configureNewRfq()
      })
    }
    sync()
    const observer=new MutationObserver(sync)
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class']})
    window.addEventListener('hashchange',sync)
    return()=>{
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('hashchange',sync)
      document.body.classList.remove('rfq-chat-open')
    }
  },[])
  return null
}
