import { useEffect } from 'react'

function buttonWithText(root: ParentNode, pattern: RegExp) {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => pattern.test(button.textContent || '')) || null
}

export function RfqActionFix() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const addVendor = target.closest<HTMLButtonElement>('.rfq-add-vendor')
      if (addVendor) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()

        const rfqClose = document.querySelector<HTMLButtonElement>('.pricing-workspace .pricing-close')
        rfqClose?.click()

        window.setTimeout(() => {
          const requestClose = document.querySelector<HTMLButtonElement>('.request-drawer .drawer-head-actions > .drawer-close:last-of-type')
          requestClose?.click()
          window.setTimeout(() => {
            window.location.hash = '#/vendors'
          }, 80)
        }, 80)
        return
      }

      const rateAction = target.closest<HTMLButtonElement>('.open-rate-workspace, .rfq-direct-rate')
      const footerRate = target.closest<HTMLButtonElement>('.mobile-rfq-footer button:last-child')
      const isRfqRateFooter = Boolean(footerRate && document.querySelector('.pricing-workspace[data-mobile-rfq="rfqs"]'))

      if (rateAction || isRfqRateFooter) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()

        const rfqClose = document.querySelector<HTMLButtonElement>('.pricing-workspace .pricing-close')
        rfqClose?.click()

        window.setTimeout(() => {
          const drawer = document.querySelector('.request-drawer')
          if (!drawer) return
          const compareRates = buttonWithText(drawer, /compare rates|open rates/i)
          compareRates?.click()
        }, 120)
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  return null
}
