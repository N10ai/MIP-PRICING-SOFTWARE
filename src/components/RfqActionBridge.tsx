import { useEffect } from 'react'

function findButton(root: ParentNode, pattern: RegExp) {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find(button => pattern.test(button.textContent || '')) || null
}

function retry(action: () => boolean, attempts = 8, delay = 100) {
  let count = 0
  const run = () => {
    count += 1
    if (action() || count >= attempts) return
    window.setTimeout(run, delay)
  }
  run()
}

export function RfqActionBridge() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const addVendor = target.closest<HTMLButtonElement>('.rfq-add-vendor')
      if (addVendor) {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()

        document.querySelector<HTMLButtonElement>('.pricing-workspace .pricing-close')?.click()

        retry(() => {
          const requestClose = document.querySelector<HTMLButtonElement>('.request-drawer .drawer-head-actions > .drawer-close:last-of-type')
          if (!requestClose) return false
          requestClose.click()
          window.setTimeout(() => {
            window.location.hash = '#/vendors'
          }, 80)
          return true
        })
        return
      }

      const directRate = target.closest<HTMLButtonElement>('.open-rate-workspace, .rfq-direct-rate')
      const footerRate = target.closest<HTMLButtonElement>('.pricing-workspace[data-mobile-rfq="rfqs"] .mobile-rfq-footer button:last-child')
      if (!directRate && !footerRate) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()

      document.querySelector<HTMLButtonElement>('.pricing-workspace .pricing-close')?.click()

      retry(() => {
        if (document.querySelector('.mvr-shell')) return true
        const drawer = document.querySelector('.pricing-decision-workspace')
        if (!drawer) return false
        const rateButton = findButton(drawer, /compare rates|open rates/i)
        if (!rateButton) return false
        rateButton.click()
        return Boolean(document.querySelector('.mvr-shell'))
      }, 12, 120)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
