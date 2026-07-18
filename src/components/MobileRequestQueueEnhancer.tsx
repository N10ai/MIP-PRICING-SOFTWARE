import { useEffect } from 'react'

function relativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return 'Received just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `Received ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Received ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `Received ${days}d ago`
  return `Received ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

export function MobileRequestQueueEnhancer() {
  useEffect(() => {
    if (!window.matchMedia('(max-width: 760px)').matches) return

    let filterOpen = false

    const enhance = () => {
      if (!location.hash.includes('/requests')) return
      const card = document.querySelector<HTMLElement>('.request-queue-card')
      const filterBar = card?.querySelector<HTMLElement>('.request-filter-bar')
      if (!card || !filterBar) return

      if (!card.querySelector('.request-filter-summary')) {
        const summary = document.createElement('div')
        summary.className = 'request-filter-summary'
        summary.innerHTML = '<div><b>Request queue</b><span>Newest received first</span></div><button type="button" aria-expanded="false">Filters</button>'
        const button = summary.querySelector('button')!
        button.addEventListener('click', () => {
          filterOpen = !filterOpen
          card.classList.toggle('filters-open', filterOpen)
          button.setAttribute('aria-expanded', String(filterOpen))
          button.textContent = filterOpen ? 'Done' : 'Filters'
        })
        card.insertBefore(summary, filterBar)
      }

      card.querySelectorAll<HTMLElement>('.request-queue-primary small').forEach(el => {
        const original = el.dataset.absoluteDate || el.textContent?.trim() || ''
        if (!original) return
        el.dataset.absoluteDate = original
        el.title = original
        el.textContent = relativeTime(original)
      })
    }

    enhance()
    const observer = new MutationObserver(enhance)
    observer.observe(document.body, { childList: true, subtree: true })
    const timer = window.setInterval(enhance, 30000)
    return () => {
      observer.disconnect()
      window.clearInterval(timer)
    }
  }, [])

  return null
}
