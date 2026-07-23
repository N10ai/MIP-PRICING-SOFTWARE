import { useEffect } from 'react'

export function RfqActionBridge() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return

      const addVendor = target.closest('.rfq-add-vendor')
      if (!addVendor) return

      event.preventDefault()
      event.stopPropagation()

      const rfqClose = document.querySelector('.pricing-workspace .pricing-close') as HTMLButtonElement | null
      rfqClose?.click()

      window.setTimeout(() => {
        const requestClose = document.querySelector('.pricing-decision-workspace .drawer-head .drawer-close:last-of-type') as HTMLButtonElement | null
        requestClose?.click()
        window.setTimeout(() => {
          window.location.hash = '#/vendors?new=1'
        }, 80)
      }, 80)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
