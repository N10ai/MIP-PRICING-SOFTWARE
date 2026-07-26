import { useEffect } from 'react'

function installChargeScroll() {
  const shell = document.querySelector<HTMLElement>('.qw5-shell')
  const section = shell?.querySelector<HTMLElement>('.qw5-charges')
  const scroll = section?.querySelector<HTMLElement>('.qw4-charge-scroll')
  const actions = section?.querySelector<HTMLElement>('.qw4-section-head > div:last-child')
  if (!shell || !section || !scroll || !actions) return

  if (!actions.querySelector('.qw7-focus-button')) {
    const focus = document.createElement('button')
    focus.type = 'button'
    focus.className = 'qw7-focus-button'
    focus.innerHTML = '<span aria-hidden="true">↗</span><b>Focus charges</b>'
    focus.addEventListener('click', () => {
      shell.classList.toggle('qw7-charge-focus')
      const active = shell.classList.contains('qw7-charge-focus')
      focus.innerHTML = active
        ? '<span aria-hidden="true">↙</span><b>Show all</b>'
        : '<span aria-hidden="true">↗</span><b>Focus charges</b>'
      requestAnimationFrame(() => scroll.focus({ preventScroll: true }))
    })
    actions.prepend(focus)
  }

  if (!section.querySelector('.qw7-scroll-tools')) {
    const tools = document.createElement('div')
    tools.className = 'qw7-scroll-tools'
    tools.innerHTML = '<button type="button" data-edge="top" aria-label="First charge">↑</button><span>Scroll charges</span><button type="button" data-edge="bottom" aria-label="Last charge">↓</button>'
    tools.addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-edge]')
      if (!button) return
      scroll.scrollTo({ top: button.dataset.edge === 'top' ? 0 : scroll.scrollHeight, behavior: 'smooth' })
    })
    section.append(tools)
  }

  if (scroll.dataset.appleScrollInstalled !== 'true') {
    scroll.dataset.appleScrollInstalled = 'true'
    scroll.tabIndex = 0

    scroll.addEventListener('wheel', event => {
      const target = event.target as HTMLElement
      if (!target.closest('input[type="number"], select')) return
      event.preventDefault()
      scroll.scrollBy({ top: event.deltaY, behavior: 'auto' })
    }, { passive: false })

    scroll.addEventListener('keydown', event => {
      if (event.key === 'PageDown') {
        event.preventDefault()
        scroll.scrollBy({ top: scroll.clientHeight * .8, behavior: 'smooth' })
      }
      if (event.key === 'PageUp') {
        event.preventDefault()
        scroll.scrollBy({ top: -scroll.clientHeight * .8, behavior: 'smooth' })
      }
    })
  }
}

export function QuoteChargeScrollEnhancer() {
  useEffect(() => {
    let frame = 0
    const run = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(installChargeScroll)
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
