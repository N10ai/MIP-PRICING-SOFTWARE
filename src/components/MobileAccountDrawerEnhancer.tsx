import { useEffect } from 'react'

export function MobileAccountDrawerEnhancer(){
  useEffect(()=>{
    const sync=()=>{
      const drawer=document.querySelector<HTMLElement>('.account-popover')
      const existingBackdrop=document.querySelector<HTMLElement>('.account-drawer-backdrop')
      if(!drawer){
        existingBackdrop?.remove()
        return
      }

      if(!existingBackdrop){
        const backdrop=document.createElement('button')
        backdrop.type='button'
        backdrop.className='account-drawer-backdrop'
        backdrop.setAttribute('aria-label','Close account menu')
        backdrop.addEventListener('click',()=>{
          document.querySelector<HTMLButtonElement>('.mobile-brand')?.click()
        })
        document.body.appendChild(backdrop)
      }

      if(!drawer.querySelector('.account-drawer-close')){
        const close=document.createElement('button')
        close.type='button'
        close.className='account-drawer-close'
        close.setAttribute('aria-label','Close account menu')
        close.innerHTML='<span aria-hidden="true">×</span>'
        close.addEventListener('click',()=>{
          document.querySelector<HTMLButtonElement>('.mobile-brand')?.click()
        })
        drawer.appendChild(close)
      }
    }

    const observer=new MutationObserver(sync)
    observer.observe(document.body,{childList:true,subtree:true})
    sync()
    return()=>{
      observer.disconnect()
      document.querySelector('.account-drawer-backdrop')?.remove()
    }
  },[])
  return null
}
