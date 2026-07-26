import { Building2, FileText, Home, Search, Ship, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { QuotesPage } from './QuoteWorkspace'

type QuoteItem = {
  id: string
  quote_number: string | null
  customer_name: string | null
  status: string | null
  quote_data: any
  created_at: string | null
}

const nav = [
  ['/', 'Overview', Home],
  ['/requests', 'Requests', Ship],
  ['/quotes', 'Quotes', FileText],
  ['/vendors', 'Vendors', Building2],
  ['/customers', 'Customers', Users],
] as const

const logo = 'https://raw.githubusercontent.com/N10ai/mip-tools/main/Untitled%20design%20-%201.png'

function routeText(item: QuoteItem) {
  return item.quote_data?.route || item.quote_data?.routing || 'Route not set'
}

export function AppleQuoteDesktopWorkspace() {
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('quote')
  const [quotes, setQuotes] = useState<QuoteItem[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    supabase
      .from('quotes')
      .select('id,quote_number,customer_name,status,quote_data,created_at')
      .order('created_at', { ascending: false })
      .limit(160)
      .then(({ data }) => setQuotes((data || []) as QuoteItem[]))
  }, [selectedId])

  const filters = useMemo(() => {
    const count = (status: string) => quotes.filter(item => item.status === status).length
    return [
      ['all', 'All', quotes.length],
      ['draft', 'Draft', count('draft')],
      ['sent', 'Sent', count('sent')],
      ['accepted', 'Accepted', count('accepted')],
    ] as const
  }, [quotes])

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    return quotes.filter(item => {
      if (filter !== 'all' && item.status !== filter) return false
      return [item.quote_number, item.customer_name, routeText(item), item.status]
        .join(' ')
        .toLowerCase()
        .includes(term)
    })
  }, [quotes, query, filter])

  return <div className={`apple-quote-shell ${selectedId ? 'quote-editor-selected' : ''}`}>
    <aside className="apple-quote-rail">
      <img src={logo} alt="MIP" />
      <nav>{nav.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} aria-label={label} title={label}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
    </aside>

    <aside className="apple-quote-queue">
      <header><div><small>COMMERCIAL</small><h1>Quotes</h1></div><b>{quotes.length}</b></header>
      <label className="apple-quote-search"><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search quotes" /></label>
      <div className="apple-quote-filters">{filters.map(([value, label, count]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}><span>{label}</span><b>{count}</b></button>)}</div>
      <div className="apple-quote-meta"><span>{visible.length} records</span><span>Newest first</span></div>
      <div className="apple-quote-list">{visible.map(item => <button key={item.id} className={selectedId === item.id ? 'active' : ''} onClick={() => setParams({ quote: item.id })}>
        <span className="apple-quote-icon"><FileText size={16} /></span>
        <span className="apple-quote-copy"><b>{item.customer_name || 'Customer'}</b><small>{routeText(item)}</small><em>{item.quote_number || 'Draft quote'}</em></span>
        <span className="apple-quote-status">{item.status || 'draft'}</span>
      </button>)}</div>
    </aside>

    <main className="apple-quote-editor"><QuotesPage /></main>
  </div>
}