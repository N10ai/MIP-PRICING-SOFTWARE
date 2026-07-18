import { ArrowUpRight, Bell, Building2, CalendarDays, FilePlus2, FileText, Home, LayoutGrid, LayoutList, LogOut, Menu, PackagePlus, Plus, Search, Settings, Ship, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Button, EmptyState, GlassCard, SkeletonRows, StatusBadge } from './components/ui'
import { RequestWorkspace, type RequestSummary } from './components/RequestWorkspace'
import { VendorsPage } from './components/VendorWorkspace'
import { PublicRequestPortalV2 } from './components/PublicRequestPortalV2'
import { QuoteRoute } from './components/QuoteRoute'
import { WorkspaceErrorBoundary } from './components/WorkspaceErrorBoundary'

type RequestRow = RequestSummary
type SearchQuote = { id: string; quote_number: string | null; customer_name: string | null; status: string | null; quote_data: any }
type SearchVendor = { id: string; company: string; vendor_type: string | null; general_email: string | null; modes: string[] | null; countries: string[] | null }
type CustomerResult = { name: string; email: string; source: string }
type RequestView = 'list' | 'cards'
type RequestGroup = 'none' | 'status' | 'customer' | 'date'

const logo = 'https://raw.githubusercontent.com/N10ai/mip-tools/main/Untitled%20design%20-%201.png'
const navigation = [['/', 'Overview', Home], ['/requests', 'Requests', Ship], ['/quotes', 'Quotes', FileText], ['/vendors', 'Vendors', Building2], ['/customers', 'Customers', Users]] as const

function requestCustomer(item: RequestRow) {
  return item.customer_company || item.contact_name || 'Guest request'
}

function requestRoute(item: RequestRow) {
  return `${item.origin_code || item.origin_name || '—'} → ${item.destination_code || item.destination_name || '—'}`
}

function RequestItem({ item, view, onOpen }: { item: RequestRow; view: RequestView; onOpen: (request: RequestRow) => void }) {
  return <button className={`request-queue-item ${view === 'cards' ? 'is-card' : 'is-list'}`} onClick={() => onOpen(item)}>
    <div className="request-queue-primary">
      <b className="request-number">{item.request_number}</b>
      <small>{new Date(item.submitted_at).toLocaleString()}</small>
    </div>
    <div className="request-queue-customer">
      <b>{requestCustomer(item)}</b>
      <small>{item.contact_email}</small>
    </div>
    <div className="request-queue-route">
      <span>{item.mode || 'Freight'} {item.service_type || ''}</span>
      <b>{requestRoute(item)}</b>
    </div>
    <StatusBadge status={item.archived_at ? 'archived' : item.status} />
    <span className="request-open-button" aria-hidden="true"><ArrowUpRight size={20} /></span>
  </button>
}

function RequestList({ items, loading, onOpen, view, group }: { items: RequestRow[]; loading: boolean; onOpen: (request: RequestRow) => void; view: RequestView; group: RequestGroup }) {
  if (loading) return <SkeletonRows />
  if (!items.length) return <EmptyState icon={<Ship size={28} />} title="No requests found" copy="Requests matching these filters will appear here." />

  const groupLabel = (item: RequestRow) => {
    if (group === 'status') return String(item.archived_at ? 'Archived' : item.status || 'Unassigned').replaceAll('_', ' ')
    if (group === 'customer') return requestCustomer(item)
    if (group === 'date') return new Date(item.submitted_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    return ''
  }

  if (group === 'none') return <div className={`request-queue request-view-${view}`}>{items.map(item => <RequestItem key={item.id} item={item} view={view} onOpen={onOpen} />)}</div>

  const grouped = new Map<string, RequestRow[]>()
  items.forEach(item => {
    const label = groupLabel(item)
    grouped.set(label, [...(grouped.get(label) || []), item])
  })

  return <div className="request-groups">{[...grouped.entries()].map(([label, rows]) => <section className="request-group" key={label}>
    <header><b>{label}</b><span>{rows.length}</span></header>
    <div className={`request-queue request-view-${view}`}>{rows.map(item => <RequestItem key={item.id} item={item} view={view} onOpen={onOpen} />)}</div>
  </section>)}</div>
}

function Dashboard({ requests, loading, onOpen }: { requests: RequestRow[]; loading: boolean; onOpen: (r: RequestRow) => void }) {
  const active = requests.filter(r => !r.archived_at)
  const count = (status: string) => active.filter(r => r.status === status).length
  const newItems = active.filter(r => r.status === 'new').slice(0, 4)
  const cards = [
    { label: 'New', value: count('new'), copy: 'Unreviewed requests', tone: 'dark' },
    { label: 'Vendor replies', value: count('vendor_rfq'), copy: 'Waiting on rates', tone: 'blue' },
    { label: 'Pricing', value: count('pricing'), copy: 'Quotes in progress', tone: 'soft' },
    { label: 'Accepted', value: count('accepted'), copy: 'Won opportunities', tone: 'white' },
  ]
  return <div className="mobile-overview">
    <section className="overview-heading"><div><p className="eyebrow">COMMERCIAL OVERVIEW</p><h1>Today</h1><p>Pricing activity, pipeline health, and items that need attention.</p></div><NavLink to="/requests">View pipeline</NavLink></section>
    <section className="overview-analytics">{cards.map(card => <article className={`overview-metric tone-${card.tone}`} key={card.label}><span>{card.label}</span>{loading ? <div className="mini-skeleton" /> : <strong>{card.value}</strong>}<small>{card.copy}</small></article>)}</section>
    <section className="overview-panel pipeline-summary"><header><div><p className="eyebrow">PIPELINE SUMMARY</p><h2>Commercial flow</h2></div><NavLink to="/requests">Details</NavLink></header><div className="pipeline-bars"><span><b>New</b><i style={{ width: `${Math.max(8, Math.min(100, count('new') * 18))}%` }} /></span><span><b>Vendor RFQ</b><i style={{ width: `${Math.max(8, Math.min(100, count('vendor_rfq') * 18))}%` }} /></span><span><b>Pricing</b><i style={{ width: `${Math.max(8, Math.min(100, count('pricing') * 18))}%` }} /></span><span><b>Accepted</b><i style={{ width: `${Math.max(8, Math.min(100, count('accepted') * 18))}%` }} /></span></div></section>
    <section className="overview-panel new-request-panel"><header><div><p className="eyebrow">NEEDS REVIEW</p><h2>New requests</h2></div><NavLink to="/requests">View all</NavLink></header>{loading ? <SkeletonRows /> : newItems.length ? <div className="overview-request-list">{newItems.map(item => <button key={item.id} onClick={() => onOpen(item)}><span className="request-mode-icon"><Ship size={18} /></span><span className="request-summary"><b>{requestCustomer(item)}</b><small>{item.request_number}</small><em>{requestRoute(item)}</em></span><span className="request-time">{new Date(item.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></button>)}</div> : <div className="overview-clear"><b>All caught up</b><span>No unreviewed requests right now.</span></div>}</section>
  </div>
}

function Requests({ items, loading, onOpen, archived, setArchived }: { items: RequestRow[]; loading: boolean; onOpen: (r: RequestRow) => void; archived: boolean; setArchived: (v: boolean) => void }) {
  const [status, setStatus] = useState('all')
  const [customer, setCustomer] = useState('all')
  const [dateRange, setDateRange] = useState('all')
  const [group, setGroup] = useState<RequestGroup>('none')
  const [view, setView] = useState<RequestView>('list')

  const customers = useMemo(() => [...new Set(items.map(requestCustomer))].sort((a, b) => a.localeCompare(b)), [items])
  const statuses = useMemo(() => [...new Set(items.map(item => String(item.status || 'unassigned')))].sort(), [items])
  const visible = useMemo(() => items.filter(item => {
    if (status !== 'all' && String(item.status || 'unassigned') !== status) return false
    if (customer !== 'all' && requestCustomer(item) !== customer) return false
    if (dateRange !== 'all') {
      const days = Number(dateRange)
      const cutoff = Date.now() - days * 86400000
      if (new Date(item.submitted_at).getTime() < cutoff) return false
    }
    return true
  }), [items, status, customer, dateRange])

  return <>
    <section className="hero compact request-queue-hero"><div><p className="eyebrow">COMMERCIAL INTAKE</p><h1>{archived ? 'Archived requests' : 'Quote requests'}</h1><p>{archived ? 'Review requests removed from the active queue.' : 'Review, assign, request vendor rates, and create quotes.'}</p></div></section>
    <GlassCard className="request-queue-card">
      <div className="request-filter-bar">
        <div className="request-filter-scroll">
          <label><span>Status</span><select value={status} onChange={e => setStatus(e.target.value)}><option value="all">All statuses</option>{statuses.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
          <label><span>Customer</span><select value={customer} onChange={e => setCustomer(e.target.value)}><option value="all">All customers</option>{customers.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label><span>Date</span><select value={dateRange} onChange={e => setDateRange(e.target.value)}><option value="all">Any date</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></label>
          <label><span>Group</span><select value={group} onChange={e => setGroup(e.target.value as RequestGroup)}><option value="none">No grouping</option><option value="status">By status</option><option value="customer">By customer</option><option value="date">By month</option></select></label>
          <button className={archived ? 'active' : ''} onClick={() => setArchived(!archived)}>{archived ? 'Active queue' : 'Archived'}</button>
        </div>
        <div className="request-view-toggle" aria-label="Request view">
          <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')} aria-label="List view"><LayoutList size={18} /></button>
          <button className={view === 'cards' ? 'active' : ''} onClick={() => setView('cards')} aria-label="Card view"><LayoutGrid size={18} /></button>
        </div>
      </div>
      <div className="request-results-meta"><b>{visible.length} requests</b><span>{group === 'none' ? (view === 'list' ? 'List view' : 'Card view') : `Grouped by ${group}`}</span></div>
      <RequestList items={visible} loading={loading} onOpen={onOpen} view={view} group={group} />
    </GlassCard>
  </>
}

function Placeholder({ title, copy }: { title: string; copy: string }) {
  return <GlassCard className="placeholder"><FileText size={30} /><h1>{title}</h1><p>{copy}</p></GlassCard>
}

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [quotes, setQuotes] = useState<SearchQuote[]>([])
  const [vendors, setVendors] = useState<SearchVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<RequestRow | null>(null)
  const [archived, setArchived] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [actionsOpen, setActionsOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('quote_requests').select('*').order('submitted_at', { ascending: false }).limit(250),
      supabase.from('quotes').select('id,quote_number,customer_name,status,quote_data').order('created_at', { ascending: false }).limit(250),
      supabase.from('vendors').select('id,company,vendor_type,general_email,modes,countries').neq('status', 'archived').order('company').limit(250),
    ]).then(([r, q, v]) => {
      setRequests((r.data || []) as RequestRow[])
      setQuotes((q.data || []) as SearchQuote[])
      setVendors((v.data || []) as SearchVendor[])
      setLoading(false)
    })
  }, [refresh])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setActionsOpen(false)
    setAccountOpen(false)
    setSearchOpen(false)
  }, [location.pathname, location.search])

  const filtered = useMemo(() => requests.filter(r => Boolean(r.archived_at) === archived && [r.request_number, r.customer_company, r.contact_email, r.origin_code, r.destination_code].join(' ').toLowerCase().includes(search.toLowerCase())), [requests, search, archived])
  const customerResults = useMemo(() => {
    const map = new Map<string, CustomerResult>()
    for (const r of requests) {
      const name = (r.customer_company || r.contact_name || '').trim()
      if (name && !map.has(name.toLowerCase())) map.set(name.toLowerCase(), { name, email: r.contact_email || '', source: 'Request customer' })
    }
    for (const q of quotes) {
      const name = (q.customer_name || '').trim()
      if (name && !map.has(name.toLowerCase())) map.set(name.toLowerCase(), { name, email: '', source: 'Quote customer' })
    }
    return [...map.values()]
  }, [requests, quotes])
  const query = search.trim().toLowerCase()
  const searchResults = useMemo(() => ({
    requests: query ? requests.filter(r => [r.request_number, r.customer_company, r.contact_name, r.contact_email, r.origin_code, r.destination_code, r.mode, r.service_type].join(' ').toLowerCase().includes(query)).slice(0, 5) : [],
    quotes: query ? quotes.filter(q => [q.quote_number, q.customer_name, q.status, q.quote_data?.route].join(' ').toLowerCase().includes(query)).slice(0, 5) : [],
    vendors: query ? vendors.filter(v => [v.company, v.vendor_type, v.general_email, ...(v.modes || []), ...(v.countries || [])].join(' ').toLowerCase().includes(query)).slice(0, 5) : [],
    customers: query ? customerResults.filter(c => [c.name, c.email].join(' ').toLowerCase().includes(query)).slice(0, 5) : [],
  }), [query, requests, quotes, vendors, customerResults])
  const resultCount = searchResults.requests.length + searchResults.quotes.length + searchResults.vendors.length + searchResults.customers.length

  if (location.pathname === '/request') return <PublicRequestPortalV2 />
  const quoteParams = new URLSearchParams(location.search)
  const quoteWorkspaceOpen = location.pathname === '/quotes' && (quoteParams.has('request') || quoteParams.has('quote'))
  if (quoteWorkspaceOpen) return <WorkspaceErrorBoundary title="The Quote Workspace could not be opened."><QuoteRoute /></WorkspaceErrorBoundary>

  const changed = () => setRefresh(v => v + 1)
  const displayName = String(user?.user_metadata?.full_name || user?.user_metadata?.name || 'Pricing Team')
  const initials = displayName.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase() || 'PT'
  const signOut = async () => { await supabase.auth.signOut(); setAccountOpen(false) }
  const chooseRequest = (r: RequestRow) => { setSelected(r); setSearch(''); setSearchOpen(false) }
  const chooseQuote = (q: SearchQuote) => { setSearch(''); setSearchOpen(false); navigate(`/quotes?quote=${q.id}`) }
  const chooseVendor = (v: SearchVendor) => { setSearch(v.company); setSearchOpen(false); navigate('/vendors') }
  const chooseCustomer = (c: CustomerResult) => { setSearch(c.name); setSearchOpen(false); navigate('/requests') }

  return <div className="app-bg">
    <div className="orb one" /><div className="orb two" />
    <aside className="sidebar"><div className="brand"><img src={logo} /><div><b>MIP Pricing OS</b><span>Commercial Operations</span></div></div><nav>{navigation.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'}><Icon size={18} /><span>{label}</span></NavLink>)}</nav><footer><div className="avatar">{initials}</div><div><b>{displayName}</b><span>{user?.email || 'MIP Cargo Express'}</span></div></footer></aside>
    <header className="topbar">
      <button className="mobile-brand" onClick={() => setAccountOpen(v => !v)} aria-label="Open account menu"><span className="mobile-logo-wrap"><img src={logo} /></span><div><b>MIP Cargo Express</b><span>Pricing OS</span></div></button>
      <button className="mobile-menu"><Menu size={20} /></button>
      <label className={`global-search ${searchOpen ? 'active' : ''}`}><Search size={18} /><input aria-label="Global search" placeholder="Search everything" value={search} onFocus={() => setSearchOpen(true)} onChange={e => { setSearch(e.target.value); setSearchOpen(true) }} /><kbd>⌘ K</kbd>{search && <button type="button" className="search-clear" onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}</label>
      <div><button className="icon"><Bell size={18} /></button><NavLink to="/request"><Button><Plus size={17} />New</Button></NavLink></div>
      {accountOpen && <div className="account-popover"><header><span>{initials}</span><div><b>{displayName}</b><small>{user?.email || 'Signed in'}</small></div></header><div className="account-company"><b>MIP Cargo Express</b><span>Commercial Pricing Workspace</span></div><button onClick={signOut}><LogOut size={17} />Sign out</button></div>}
      {searchOpen && query && <><button className="global-search-backdrop" onClick={() => setSearchOpen(false)} aria-label="Close search" /><section className="global-search-results"><header><div><small>UNIVERSAL SEARCH</small><b>{resultCount ? `${resultCount} matching records` : 'No records found'}</b></div><button onClick={() => setSearchOpen(false)}><X size={17} /></button></header>{searchResults.requests.length > 0 && <div className="search-result-group"><small>REQUESTS</small>{searchResults.requests.map(r => <button key={r.id} onClick={() => chooseRequest(r)}><span><Ship size={17} /></span><div><b>{r.request_number}</b><small>{requestCustomer(r)} · {requestRoute(r)}</small></div></button>)}</div>}{searchResults.quotes.length > 0 && <div className="search-result-group"><small>QUOTES</small>{searchResults.quotes.map(q => <button key={q.id} onClick={() => chooseQuote(q)}><span><FileText size={17} /></span><div><b>{q.quote_number || 'Draft quote'}</b><small>{q.customer_name || 'Customer'} · {q.quote_data?.route || q.status || 'Quote'}</small></div></button>)}</div>}{searchResults.vendors.length > 0 && <div className="search-result-group"><small>VENDORS</small>{searchResults.vendors.map(v => <button key={v.id} onClick={() => chooseVendor(v)}><span><Building2 size={17} /></span><div><b>{v.company}</b><small>{(v.vendor_type || 'Service provider').replaceAll('_', ' ')} · {v.general_email || 'No email'}</small></div></button>)}</div>}{searchResults.customers.length > 0 && <div className="search-result-group"><small>CUSTOMERS</small>{searchResults.customers.map(c => <button key={c.name} onClick={() => chooseCustomer(c)}><span><Users size={17} /></span><div><b>{c.name}</b><small>{c.email || c.source}</small></div></button>)}</div>}{resultCount === 0 && <div className="search-empty"><Search size={24} /><b>No matching records</b><span>Try a quote number, request, customer, vendor, route, or email.</span></div>}</section></>}
    </header>
    <main className="workspace"><Routes><Route path="/" element={<Dashboard requests={requests} loading={loading} onOpen={setSelected} />} /><Route path="/requests" element={<Requests items={filtered} loading={loading} onOpen={setSelected} archived={archived} setArchived={setArchived} />} /><Route path="/quotes" element={<WorkspaceErrorBoundary title="Quotes could not be loaded."><QuoteRoute /></WorkspaceErrorBoundary>} /><Route path="/vendors" element={<VendorsPage />} /><Route path="/customers" element={<Placeholder title="Customers" copy="Customer profiles and commercial history." />} /></Routes></main>
    <div className={`mobile-action-sheet ${actionsOpen ? 'open' : ''}`} aria-hidden={!actionsOpen}><button className="mobile-action-backdrop" onClick={() => setActionsOpen(false)} aria-label="Close actions" /><section><header><div><small>MENU & ACTIONS</small><h2>What do you need?</h2></div><button onClick={() => setActionsOpen(false)}><X size={18} /></button></header><div className="mobile-action-group"><small>CREATE</small><NavLink to="/request"><span><Ship size={20} /></span><div><b>Freight request</b><small>Start a customer pricing request</small></div></NavLink><NavLink to="/quotes"><span><FilePlus2 size={20} /></span><div><b>New quote</b><small>Create or continue a quotation</small></div></NavLink><NavLink to="/vendors"><span><Building2 size={20} /></span><div><b>Add vendor</b><small>Create a service provider</small></div></NavLink></div><div className="mobile-action-group"><small>WORKSPACES</small><NavLink to="/requests"><span><PackagePlus size={20} /></span><div><b>Requests</b><small>Review customer submissions</small></div></NavLink><NavLink to="/quotes"><span><FileText size={20} /></span><div><b>Quotes</b><small>Manage drafts and sent quotes</small></div></NavLink><NavLink to="/vendors"><span><Building2 size={20} /></span><div><b>Vendors</b><small>Rates and provider records</small></div></NavLink><NavLink to="/customers"><span><Users size={20} /></span><div><b>Customers</b><small>Profiles and commercial history</small></div></NavLink></div><div className="mobile-action-group"><small>TOOLS</small><NavLink to="/"><span><CalendarDays size={20} /></span><div><b>Activity</b><small>Dashboard and current priorities</small></div></NavLink><NavLink to="/"><span><Settings size={20} /></span><div><b>Settings</b><small>Workspace preferences</small></div></NavLink></div></section></div>
    <div className="mobile-dock"><nav className="bottom-nav">{navigation.slice(0, 4).map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'}><Icon size={19} /><span>{label}</span></NavLink>)}</nav><button className={`mobile-action-trigger ${actionsOpen ? 'open' : ''}`} onClick={() => setActionsOpen(v => !v)} aria-label="Open quick actions"><Plus size={23} /></button></div>
    <RequestWorkspace request={selected} onClose={() => setSelected(null)} onChanged={changed} />
  </div>
}
