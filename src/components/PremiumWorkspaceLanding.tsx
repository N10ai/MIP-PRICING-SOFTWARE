import { ArrowRight, FilePlus2, FileText, Ship, Sparkles } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

type WorkspaceLandingProps = {
  requestCount: number
  quoteCount: number
  newCount: number
  rfqCount: number
  pricingCount: number
}

export function PremiumWorkspaceLanding({ requestCount, quoteCount, newCount, rfqCount, pricingCount }: WorkspaceLandingProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const isRequests = location.pathname === '/requests'

  return <section className="premium-workspace-landing">
    <div className="premium-workspace-landing__mark"><Sparkles size={18} /></div>
    <p className="premium-workspace-landing__eyebrow">COMMERCIAL WORKSPACE</p>
    <h1>{isRequests ? 'Choose a request to begin' : 'Choose a quote to continue'}</h1>
    <p className="premium-workspace-landing__copy">
      {isRequests
        ? 'Select a request from the queue to review shipment details, request vendor pricing, and build the customer quote without leaving this workspace.'
        : 'Select a quote from the queue to continue pricing, refine charges, and review the live customer document.'}
    </p>

    <div className="premium-workspace-landing__metrics" aria-label="Workspace summary">
      {isRequests ? <>
        <article><strong>{requestCount}</strong><span>Active requests</span></article>
        <article><strong>{newCount}</strong><span>Need review</span></article>
        <article><strong>{rfqCount}</strong><span>Vendor RFQ</span></article>
        <article><strong>{pricingCount}</strong><span>In pricing</span></article>
      </> : <>
        <article><strong>{quoteCount}</strong><span>Total quotes</span></article>
        <article><strong>{pricingCount}</strong><span>Pricing now</span></article>
      </>}
    </div>

    <div className="premium-workspace-landing__actions">
      <button className="premium-primary-action" onClick={() => navigate(isRequests ? '/request' : '/quotes?new=1')}>
        {isRequests ? <Ship size={17} /> : <FilePlus2 size={17} />}
        {isRequests ? 'Create request' : 'Create quote'}
        <ArrowRight size={16} />
      </button>
      <button className="premium-secondary-action" onClick={() => navigate(isRequests ? '/quotes' : '/requests')}>
        {isRequests ? <FileText size={17} /> : <Ship size={17} />}
        {isRequests ? 'Open quotes' : 'Open requests'}
      </button>
    </div>
  </section>
}
