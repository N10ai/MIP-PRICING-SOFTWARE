import { Building2, FileText, Home, Ship, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { QuoteWorkspaceV5 } from './QuoteWorkspaceV5'
import { QuotesPageV2 } from './QuotesPageV2'

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

export function AppleQuoteDesktopWorkspace() {
  const [params, setParams] = useSearchParams()
  const selectedId = params.get('quote')
  const [quotes, setQuotes] = useState<QuoteItem[]>([])

  useEffect(() => {
    supabase
      .from('quotes')
      .select('id,quote_number,customer_name,status,quote_data,created_at')
      .order('created_at', { ascending: false })
      .limit(300)
      .then(({ data }) => setQuotes((data || []) as QuoteItem[]))
  }, [selectedId])

  return <div className="quotes-app-shell">
    <aside className="apple-quote-rail">
      <img src={logo} alt="MIP" />
      <nav>{nav.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} aria-label={label} title={label}><Icon size={19} /><span>{label}</span></NavLink>)}</nav>
    </aside>
    <main className="quotes-app-main">
      {selectedId
        ? <QuoteWorkspaceV5 />
        : <QuotesPageV2 quotes={quotes} onNew={() => setParams({ quote: 'new' })}/>} 
    </main>
  </div>
}
