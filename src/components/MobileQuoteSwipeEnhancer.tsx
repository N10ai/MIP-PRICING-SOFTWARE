import { useEffect } from 'react'

const interactiveSelector = 'input, textarea, select, button, a, [role="button"], .mobile-native-sheet, .mobile-library'

export function MobileQuoteSwipeEnhancer() {
  useEffect(() => {
    let cleanup: (() => void) | undefined

    const attach = () => {
      const app = document.querySelector<HTMLElement>('.mobile-quote-app')
      const body = app?.querySelector<HTMLElement>('.mobile-quote-body')
      const tabBar = app?.querySelector<HTMLElement>('.mobile-quote-tabs')
      if (!app || !body || !tabBar || body.dataset.swipeReady === 'true') return false

      body.dataset.swipeReady = 'true'
      let startX = 0
      let startY = 0
      let currentX = 0
      let tracking = false
      let horizontal = false

      const buttons = () => Array.from(tabBar.querySelectorAll<HTMLButtonElement>('button'))
      const activeIndex = () => Math.max(0, buttons().findIndex(button => button.classList.contains('active')))

      const reset = () => {
        body.style.removeProperty('--swipe-x')
        body.classList.remove('is-swiping', 'swipe-left', 'swipe-right')
        tracking = false
        horizontal = false
      }

      const onTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 1) return
        const target = event.target as HTMLElement
        if (target.closest(interactiveSelector)) return
        startX = event.touches[0].clientX
        startY = event.touches[0].clientY
        currentX = startX
        tracking = true
        horizontal = false
      }

      const onTouchMove = (event: TouchEvent) => {
        if (!tracking || event.touches.length !== 1) return
        currentX = event.touches[0].clientX
        const dx = currentX - startX
        const dy = event.touches[0].clientY - startY

        if (!horizontal && Math.abs(dx) > 10) {
          if (Math.abs(dx) <= Math.abs(dy) * 1.15) {
            tracking = false
            return
          }
          horizontal = true
          body.classList.add('is-swiping')
        }

        if (!horizontal) return
        event.preventDefault()
        const resistance = Math.max(-72, Math.min(72, dx * 0.24))
        body.style.setProperty('--swipe-x', `${resistance}px`)
      }

      const onTouchEnd = () => {
        if (!tracking || !horizontal) {
          reset()
          return
        }

        const dx = currentX - startX
        const items = buttons()
        const index = activeIndex()
        const nextIndex = dx < -52 ? Math.min(items.length - 1, index + 1) : dx > 52 ? Math.max(0, index - 1) : index

        if (nextIndex !== index) {
          body.classList.add(dx < 0 ? 'swipe-left' : 'swipe-right')
          window.setTimeout(() => {
            items[nextIndex]?.click()
            body.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
            reset()
          }, 115)
        } else {
          reset()
        }
      }

      body.addEventListener('touchstart', onTouchStart, { passive: true })
      body.addEventListener('touchmove', onTouchMove, { passive: false })
      body.addEventListener('touchend', onTouchEnd, { passive: true })
      body.addEventListener('touchcancel', reset, { passive: true })

      cleanup = () => {
        body.removeEventListener('touchstart', onTouchStart)
        body.removeEventListener('touchmove', onTouchMove)
        body.removeEventListener('touchend', onTouchEnd)
        body.removeEventListener('touchcancel', reset)
        delete body.dataset.swipeReady
      }
      return true
    }

    if (!attach()) {
      const observer = new MutationObserver(() => {
        if (attach()) observer.disconnect()
      })
      observer.observe(document.body, { childList: true, subtree: true })
      cleanup = () => observer.disconnect()
    }

    return () => cleanup?.()
  }, [])

  return null
}
