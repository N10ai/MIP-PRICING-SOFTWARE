import { useEffect } from 'react'

function findButton(root: ParentNode, text: string) {
  return Array.from(root.querySelectorAll('button')).find(button => button.textContent?.toLowerCase().includes(text.toLowerCase())) as HTMLButtonElement | undefined
}

export function RfqActionBridge() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const addVendor = target.closest('.rfq-add-vendor')
      if (addVendor) {
        event.preventDefault()
        event.stopPropagation()
        const close = document.querySelector('.pricing-workspace .pricing-close') as HTMLButtonElement | null
        close?.click()
        window.setTimeout(() => {
          window.location.hash = '/vendors'
          window.dispatchEvent(new HashChangeEvent('hashchange'))
        }, 80)
        return
      }

      const directRate = target.closest('.open-rate-workspace, .rfq-direct-rate')
      const footerRate = target.closest('.pricing-workspace[data-mobile-rfq="rfqs"] .mobile-rfq-footer button:last-child')
      if (directRate || footerRate) {
        event.preventDefault()
        event.stopPropagation()
        const close = document.querySelector('.pricing-workspace .pricing-close') as HTMLButtonElement | null
        close?.click()
        window.setTimeout(() => {
          const requestDrawer = document.querySelector('.pricing-decision-workspace')
          const compareRates = requestDrawer ? findButton(requestDrawer, 'compare rates') : undefined
          const openRates = requestDrawer ? findButton(requestDrawer, 'open rates') : undefined
          const rateButton = compareRates || openRates
          rateButton?.click()
        }, 120)
      }
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
