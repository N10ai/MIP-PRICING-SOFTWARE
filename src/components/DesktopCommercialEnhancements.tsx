import { Building2, FileText, Mail, Search, Ship, Users } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

type RequestCustomer = {
  id: string
  customer_company: string | null
  contact_name: string | null
  contact_email: string | null
  origin_code: string | null
  destination_code: string | null
  status: string | null
  submitted_at: string
}

type QuoteCustomer = {
  id: string
  customer_name: string | null
  quote_number: string | null
  status: string | null
  quote_data: any
}

type CustomerRecord = {
  key: string
  name: string
  email: string
  requestCount: number
  quoteCount: number
  lastActivity: string | null
  routes: string[]
}

export function DesktopCommercialEnhancements() {
  const location = useLocation()
  const navigate = useNavigate()
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [requests, setRequests] = useState<RequestCustomer[]>([])
  const [quotes, setQuotes] = useState<QuoteCustomer[]>([])
  const [query, setQuery] = useState('')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    setHost(document.querySelector<HTMLElement>('.workspace'))
  }, [location.pathname])

  useEffect(() => {
    if (location.pathname !== '/customers') return
    Promise.all([
      supabase.from('quote_requests').select('id,customer_company,contact_name,contact_email,origin_code,destination_code,status,submitted_at').order('submitted_at', { ascending: false }).limit(300),
      supabase.from('quotes').select('id,customer_name,quote_number,status,quote_data').order('created_at', { ascending: false }).limit(300),
    ]).then(([requestResult, quoteResult]) => {
      setRequests((requestResult.data || []) as RequestCustomer[])
      setQuotes((quoteResult.data || []) as QuoteCustomer[])
    })
  }, [location.pathname])

  const customers = useMemo(() => {
    const map = new Map<string, CustomerRecord>()
    requests.forEach(item => {
      const name = (item.customer_company || item.contact_name || 'Guest customer').trim()
      const key = name.toLowerCase()
      const current = map.get(key) || { key, name, email: '', requestCount: 0, quoteCount: 0, lastActivity: null, routes: [] }
      current.requestCount += 1
      if (!current.email && item.contact_email) current.email = item.contact_email
      if (!current.lastActivity || new Date(item.submitted_at) > new Date(current.lastActivity)) current.lastActivity = item.submitted_at
      const route = `${item.origin_code || '—'} → ${item.destination_code || '—'}`
      if (!current.routes.includes(route)) current.routes.push(route)
      map.set(key, current)
    })
    quotes.forEach(item => {
      const name = (item.customer_name || 'Customer').trim()
      const key = name.toLowerCase()
      const current = map.get(key) || { key, name, email: '', requestCount: 0, quoteCount: 0, lastActivity: null, routes: [] }
      current.quoteCount += 1
      const route = item.quote_data?.route
      if (route && !current.routes.includes(route)) current.routes.push(route)
      map.set(key, current)
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [requests, quotes])

  const visible = useMemo(() => customers.filter(customer => [customer.name, customer.email, ...customer.routes].join(' ').toLowerCase().includes(query.toLowerCase())), [customers, query])
  const selected = customers.find(customer => customer.key === selectedKey) || null

  if (!host || location.pathname !== '/customers') return null

  return createPortal(<section className="customer-workspace-v7">
    <aside className="customer-directory-v7">
      <header>
        <div><small>COMMERCIAL</small><h1>Customers</h1></div>
        <span>{customers.length}</span>
      </header>
      <label><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search customers" /></label>
      <div className="customer-directory-list-v7">
        {visible.map(customer => <button key={customer.key} className={selectedKey === customer.key ? 'active' : ''} onClick={() => setSelectedKey(customer.key)}>
          <span className="customer-avatar-v7">{customer.name.slice(0, 2).toUpperCase()}</span>
          <span><b>{customer.name}</b><small>{customer.email || `${customer.requestCount + customer.quoteCount} commercial records`}</small></span>
          <em>{customer.quoteCount}</em>
        </button>)}
      </div>
    </aside>
    <main className="customer-detail-v7">
      {selected ? <>
        <header className="customer-detail-head-v7">
          <div className="customer-detail-icon-v7"><Building2 size={22} /></div>
          <div><small>CUSTOMER PROFILE</small><h2>{selected.name}</h2><p>{selected.email || 'No email recorded'}</p></div>
        </header>
        <section className="customer-stats-v7">
          <article><Ship size={18} /><strong>{selected.requestCount}</strong><span>Requests</span></article>
          <article><FileText size={18} /><strong>{selected.quoteCount}</strong><span>Quotes</span></article>
          <article><Mail size={18} /><strong>{selected.email ? 'Yes' : 'No'}</strong><span>Email available</span></article>
        </section>
        <section className="customer-routes-v7"><small>RECENT ROUTES</small>{selected.routes.length ? selected.routes.slice(0, 8).map(route => <div key={route}>{route}</div>) : <p>No routes recorded yet.</p>}</section>
        <div className="customer-actions-v7"><button onClick={() => navigate('/requests')}>Open requests</button><button className="primary" onClick={() => navigate('/quotes?new=1')}>Create quote</button></div>
      </> : <div className="customer-empty-v7"><Users size={24} /><h2>Select a customer</h2><p>Choose a customer to review request volume, quotes, contact details, and commonly used routes.</p></div>}
    </main>
  </section>, host)
}
