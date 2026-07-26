import { useEffect } from 'react'

function installQuoteFocusUI() {
  const workspace = document.querySelector<HTMLElement>('.quote-v3 .quote-workspace')
  const shipment = document.querySelector<HTMLElement>('.quote-v3 .request-transfer')
  const commercial = document.querySelector<HTMLElement>('.quote-v3 .quote-details')
  if (!workspace || !shipment || !commercial) return

  workspace.classList.add('quote-focus-workspace')

  if (!shipment.querySelector('.quote-collapsed-head')) {
    shipment.classList.add('is-collapsed')
    const head = document.createElement('button')
    head.type = 'button'
    head.className = 'quote-collapsed-head shipment-toggle'
    head.innerHTML = '<span><small>SHIPMENT</small><b>Prefilled quote details</b><em>Customer, route, service and cargo</em></span><strong>Edit</strong>'
    head.addEventListener('click', () => {
      shipment.classList.toggle('is-collapsed')
      head.querySelector('strong')!.textContent = shipment.classList.contains('is-collapsed') ? 'Edit' : 'Done'
    })
    shipment.prepend(head)
  }

  if (!commercial.querySelector('.quote-collapsed-head')) {
    commercial.classList.add('is-collapsed')
    const head = document.createElement('button')
    head.type = 'button'
    head.className = 'quote-collapsed-head commercial-toggle'
    head.innerHTML = '<span><small>TERMS & DETAILS</small><b>Commercial conditions</b><em>Validity, carrier, transit, notes and terms</em></span><strong>Edit</strong>'
    head.addEventListener('click', () => {
      commercial.classList.toggle('is-collapsed')
      head.querySelector('strong')!.textContent = commercial.classList.contains('is-collapsed') ? 'Edit' : 'Done'
    })
    commercial.prepend(head)
  }
}

export function DesktopQuoteFocusEnhancer() {
  useEffect(() => {
    let frame = 0
    const run = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(installQuoteFocusUI)
    }
    run()
    const observer = new MutationObserver(run)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])
  return null
}
