import { useEffect } from 'react'

const text=(node:Element)=>node.textContent?.trim().toLowerCase()||''
const tabSelector='.mobile-rfq-tabs,.pricing-mobile-tabs'

function configureSummary(){
  document.querySelectorAll<HTMLElement>('.decision-body').forEach(body=>{
    const decision=body.querySelector<HTMLElement>('.pricing-decision-card')
    if(decision&&body.firstElementChild!==decision)body.prepend(decision)
  })

  document.querySelectorAll<HTMLElement>('.decision-actions').forEach(footer=>{
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
  })
}

function configureNewRfq(){
  document.querySelectorAll<HTMLElement>('.pricing-workspace').forEach(workspace=>{
    const hasConversation=Boolean(workspace.querySelector('.rfq-conversation'))
    const hasChatHeader=Boolean(workspace.querySelector('.rfq-chat-focus-header'))
    if(hasConversation||hasChatHeader||workspace.classList.contains('rfq-chat-focus-mode')){
      workspace.classList.remove('rfq-new-request-mode')
      delete workspace.dataset.rfqStep
      return
    }

    const tabs=workspace.querySelector<HTMLElement>(tabSelector)
    if(!tabs)return
    workspace.classList.add('rfq-new-request-mode')
    const buttons=Array.from(tabs.querySelectorAll<HTMLButtonElement>('button'))
    let activeStep:'vendors'|'template'='vendors'

    buttons.forEach((button,index)=>{
      const label=text(button)
      delete button.dataset.rfqHiddenTab
      delete button.dataset.rfqStep
      const labelNode=button.querySelector<HTMLElement>('span')||button
      if(label==='messages'||label==='template'||index===1){
        labelNode.textContent='Template'
        button.dataset.rfqStep='template'
        if(button.classList.contains('active'))activeStep='template'
      }else if(label==='vendors'||label==='vendor'||index===0){
        labelNode.textContent='Vendors'
        button.dataset.rfqStep='vendors'
        if(button.classList.contains('active'))activeStep='vendors'
      }else{
        button.dataset.rfqHiddenTab='true'
      }
    })

    workspace.dataset.rfqStep=activeStep
    const vendorPanel=workspace.querySelector<HTMLElement>('.pricing-vendors')
    const messagePanel=workspace.querySelector<HTMLElement>('.pricing-message')
    if(vendorPanel)vendorPanel.dataset.rfqPanel='vendors'
    if(messagePanel)messagePanel.dataset.rfqPanel='template'
    workspace.querySelectorAll<HTMLElement>('.pricing-existing,.pricing-notice,.empty-conversation,.conversation-empty').forEach(node=>node.dataset.rfqAuxiliary='true')

    buttons.forEach(button=>{
      if(button.dataset.rfqBound==='true')return
      button.dataset.rfqBound='true'
      button.addEventListener('click',()=>{
        const step=button.dataset.rfqStep
        if(step==='vendors'||step==='template')workspace.dataset.rfqStep=step
      })
    })
  })
}

function configureChat(){
  const visibleHeader=document.querySelector<HTMLElement>('.rfq-chat-focus-header')
  const focused=visibleHeader?.closest<HTMLElement>('.pricing-workspace')||document.querySelector<HTMLElement>('.pricing-workspace.rfq-chat-focus-mode')
  const open=Boolean(visibleHeader&&focused)
  document.body.classList.toggle('rfq-chat-open',open)

  document.querySelectorAll<HTMLElement>(tabSelector).forEach(tabs=>{
    const belongsToChat=Boolean(open&&focused&&tabs.closest('.pricing-workspace')===focused)
    tabs.classList.toggle('rfq-hidden-for-chat',belongsToChat)
    if(belongsToChat)tabs.setAttribute('aria-hidden','true')
    else tabs.removeAttribute('aria-hidden')
  })

  document.querySelectorAll<HTMLElement>('.pricing-workspace.rfq-chat-focus-mode').forEach(workspace=>{
    if(workspace!==focused)workspace.classList.remove('rfq-chat-focus-mode')
  })
  if(focused&&open){
    focused.classList.add('rfq-chat-focus-mode')
    focused.classList.remove('rfq-new-request-mode')
    focused.setAttribute('aria-label','Vendor conversation')
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
    observer.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','data-rfq-chat-header']})
    window.addEventListener('hashchange',sync)
    return()=>{
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('hashchange',sync)
      document.body.classList.remove('rfq-chat-open')
      document.querySelectorAll('.rfq-hidden-for-chat').forEach(node=>node.classList.remove('rfq-hidden-for-chat'))
    }
  },[])
  return null
}
