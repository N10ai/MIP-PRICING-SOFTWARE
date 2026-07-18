import { useEffect } from 'react'

export function MobileAccountDrawerEnhancer() {
  useEffect(() => {
    if (!window.matchMedia('(max-width: 760px)').matches) return

    const ensureCloseButton = () => {
      const menu = document.querySelector<HTMLElement>('.account-popover')
      if (!menu || menu.querySelector('.account-drawer-close')) return

      const close = document.createElement('button')
      close.type = 'button'
      close.className = 'account-drawer-close'
      close.setAttribute('aria-label', 'Close account menu')
      close.innerHTML = '<span aria-hidden="true">×</span>'
      close.addEventListener('click', event => {
        event.stopPropagation()
        document.querySelector<HTMLButtonElement>('.mobile-brand')?.click()
      })
      menu.appendChild(close)
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const brand = target.closest('.mobile-brand')
      const menu = target.closest('.account-popover')

      if (brand) {
        window.requestAnimationFrame(ensureCloseButton)
        return
      }

      if (!menu && document.querySelector('.account-popover')) {
        document.querySelector<HTMLButtonElement>('.mobile-brand')?.click()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && document.querySelector('.account-popover')) {
        document.querySelector<HTMLButtonElement>('.mobile-brand')?.click()
      }
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKeyDown)
      document.querySelector('.account-drawer-backdrop')?.remove()
    }
  }, [])

  return null
}
