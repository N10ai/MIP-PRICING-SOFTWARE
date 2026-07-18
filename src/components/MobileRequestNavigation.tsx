import { useEffect } from 'react'

export function MobileRequestNavigation() {
  useEffect(() => {
    if (!window.matchMedia('(max-width: 760px)').matches) return

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest<HTMLAnchorElement>('a')
      if (!anchor) return

      const href = anchor.getAttribute('href') || ''
      const isRequestsLink = href === '#/requests' || href.endsWith('/requests') || href.includes('#/requests?')
      if (!isRequestsLink) return

      event.preventDefault()
      const searchInput = document.querySelector<HTMLInputElement>('.global-search input')
      if (searchInput?.value) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
        setter?.call(searchInput, '')
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      }
      window.location.hash = '#/requests'
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
