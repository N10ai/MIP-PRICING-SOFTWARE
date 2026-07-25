import { FileText, PanelLeftClose, PanelLeftOpen, Search, Ship } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type QueueRequest = {
  id: string
  request_number: string | null
  customer_company: string | null
  contact_name: string | null
  origin_code: string | null
  origin_name: string | null
  destination_code: string | null
  destination_name: string | null
  mode: string | null
  status: string | null
  submitted_at: string
  archived_at: string | null
}

type QueueQuote = {
  id: string
  quote_number: string | null
  customer_name: string | null
  status: string | null
  quote_data: any
}

function customerName(item: QueueRequest) {
  return item.customer_company || item.contact_name || 'Guest request'
}

function routeName(item: QueueRequest) {
  return `${item.origin_code || item.origin_name || '—'} → ${item.destination_code || item.destination_name || '—'}`
}

export function DesktopWorkspaceQueue() {
  const location = useLocation()
  const navigate = useNavigate()
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [requests, setRequests] = useState<QueueRequest[]>([])
  const [quotes, setQuotes] = useState<QueueQuote[]>([])

  const section = location.pathname === '/requests' ? 'requests' : location.pathname === '/quotes' ? 'quotes' : null
  const params = new URLSearchParams(location.search)
  const selectedRequestId = params.get('request')
  const selectedQuoteId = params.get('quote')

  useEffect(() => {
    const app = document.querySelector<HTMLElement>('.app-bg')
    setHost(app)
  }, [location.pathname])

  useEffect(() => {
    if (!host) return
    host.classList.toggle('workspace-v3', Boolean(section))
    host.classList.toggle('no-context-queue', !section)
    host.classList.toggle('queue-collapsed', Boolean(section && collapsed))
    return () => {
      host.classList.remove('workspace-v3', 'no-context-queue', 'queue-collapsed')
    }
  }, [host, section, collapsed])

  const load = () => {
    if (!section) return
    Promise.all([
      supabase.from('quote_requests').select('id,request_number,customer_company,contact_name,origin_code,origin_name,destination_code,destination_name,mode,status,submitted_at,archived_at').order('submitted_at', { ascending: false }).limit(120),
      supabase.from('quotes').select('id,quote_number,customer_name,status,quote_data').order('created_at', { ascending: false }).limit(120),
    ]).then(([requestResult, quoteResult]) => {
      setRequests((requestResult.data || []) as QueueRequest[])
      setQuotes((quoteResult.data || []) as QueueQuote[])
    })
  }

  useEffect(load, [section])
  useEffect(() => {
    const refresh = () => load()
    window.addEventListener('desktop-request-changed', refresh)
    return () => window.removeEventListener('desktop-request-changed', refresh)
  }, [section])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b' && section) {
        event.preventDefault()
        setCollapsed(value => !value)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [section])

  useEffect(() => {
    setQuery('')
    setFilter('all')
  }, [section])

  const requestFilters = useMemo(() => {
    const active = requests.filter(item => !item.archived_at)
    return [
      ['all', 'All', active.length],
      ['new', 'New', active.filter(item => item.status === 'new').length],
      ['vendor_rfq', 'RFQ', active.filter(item => item.status === 'vendor_rfq').length],
      ['pricing', 'Pricing', active.filter(item => item.status === 'pricing').length],
    ] as const
  }, [requests])

  const visibleRequests = useMemo(() => requests.filter(item => {
    if (item.archived_at) return false
    if (filter !== 'all' && item.status !== filter) return false
    const value = [item.request_number, customerName(item), routeName(item), item.mode].join(' ').toLowerCase()
    return value.includes(query.trim().toLowerCase())
  }), [requests, filter, query])

  const visibleQuotes = useMemo(() => quotes.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false
    const value = [item.quote_number, item.customer_name, item.status, item.quote_data?.route].join(' ').toLowerCase()
    return value.includes(query.trim().toLowerCase())
  }), [quotes, filter, query])

  const quoteFilters = useMemo(() => {
    const values = ['draft', 'sent', 'accepted']
    return [['all', 'All', quotes.length], ...values.map(value => [value, value[0].toUpperCase() + value.slice(1), quotes.filter(item => item.status === value).length])] as Array<[string, string, number]>
  }, [quotes])

  if (!host || !section) return null

  const list = section === 'requests' ? visibleRequests : visibleQuotes
  const filters = section === 'requests' ? requestFilters : quoteFilters

  return createPortal(<>
    <aside className="desktop-context-queue" aria-label={`${section} queue`}>
      <div className="desktop-context-queue__inner">
        <header className="desktop-context-queue__header">
          <div className="desktop-context-queue__title"><small>COMMERCIAL</small><b>{section === 'requests' ? 'Requests' : 'Quotes'}</b></div>
          <button className="queue-collapse-button" onClick={() => setCollapsed(true)} aria-label="Hide queue" title="Hide queue (⌘B)"><PanelLeftClose size={17} /></button>
        </header>
        <div className="desktop-context-queue__tools">
          <label className="desktop-queue-search"><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={`Search ${section}`} /></label>
          <div className="desktop-queue-filters">{filters.map(([value, label, count]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}><span>{label}</span><b>{count}</b></button>)}</div>
        </div>
        <div className="desktop-context-queue__meta"><span>{list.length} records</span><span>Newest first</span></div>
        <div className="desktop-context-queue__list">
          {section === 'requests' ? visibleRequests.map(item => <button className={`desktop-queue-item ${selectedRequestId === item.id ? 'is-selected' : ''}`} key={item.id} onClick={() => navigate(`/requests?request=${item.id}`)}>
            <span className="desktop-queue-item__icon"><Ship size={16} /></span>
            <span className="desktop-queue-item__body"><b>{customerName(item)}</b><span>{routeName(item)}</span><small>{item.request_number || 'Request'} · {item.mode || 'Freight'}</small></span>
            <span className="desktop-queue-item__status">{String(item.status || 'new').replaceAll('_', ' ')}</span>
          </button>) : visibleQuotes.map(item => <button className={`desktop-queue-item ${selectedQuoteId === item.id ? 'is-selected' : ''}`} key={item.id} onClick={() => navigate(`/quotes?quote=${item.id}`)}>
            <span className="desktop-queue-item__icon"><FileText size={16} /></span>
            <span className="desktop-queue-item__body"><b>{item.customer_name || 'Customer'}</b><span>{item.quote_data?.route || 'Route not set'}</span><small>{item.quote_number || 'Draft quote'}</small></span>
            <span className="desktop-queue-item__status">{item.status || 'draft'}</span>
          </button>)}
          {!list.length && <div className="desktop-queue-empty">No matching records.</div>}
        </div>
      </div>
    </aside>
    {collapsed && <button className="queue-reopen-button" onClick={() => setCollapsed(false)} aria-label="Show queue" title="Show queue (⌘B)"><PanelLeftOpen size={17} /></button>}
  </>, host)
}
