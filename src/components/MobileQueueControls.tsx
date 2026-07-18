import { useEffect } from 'react'

const FILTER_ICON = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'

export function MobileQueueControls() {
  useEffect(() => {
    if (!window.matchMedia('(max-width: 760px)').matches) return

    let disposed = false
    const timers: number[] = []

    const setup = () => {
      if (disposed || !window.location.hash.includes('/requests')) return
      const card = document.querySelector<HTMLElement>('.request-queue-card')
      const filters = card?.querySelector<HTMLElement>('.request-filter-bar')
      const viewToggle = card?.querySelector<HTMLElement>('.request-view-toggle')
      if (!card || !filters || !viewToggle || card.querySelector('.request-compact-tools')) return

      const tools = document.createElement('div')
      tools.className = 'request-compact-tools'

      const filterButton = document.createElement('button')
      filterButton.type = 'button'
      filterButton.className = 'request-filter-trigger'
      filterButton.setAttribute('aria-expanded', 'false')
      filterButton.innerHTML = `${FILTER_ICON}<span>Filters</span>`
      filterButton.addEventListener('click', () => {
        const open = card.classList.toggle('request-filters-open')
        filterButton.setAttribute('aria-expanded', String(open))
        filterButton.querySelector('span')!.textContent = open ? 'Done' : 'Filters'
      })

      tools.append(filterButton, viewToggle)
      card.insertBefore(tools, filters)
    }

    const schedule = () => {
      timers.forEach(window.clearTimeout)
      timers.length = 0
      ;[0, 80, 250, 700].forEach(delay => timers.push(window.setTimeout(setup, delay)))
    }

    schedule()
    window.addEventListener('hashchange', schedule)
    return () => {
      disposed = true
      timers.forEach(window.clearTimeout)
      window.removeEventListener('hashchange', schedule)
    }
  }, [])

  return null
}
