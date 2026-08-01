export type PricingWorkspaceView = 'summary' | 'vendors' | 'messages' | 'rates'

export function requestWorkspaceRoute(requestId: string, view: PricingWorkspaceView = 'summary', rfqId?: string) {
  const params = new URLSearchParams({ request: requestId, view })
  if (rfqId) params.set('rfq', rfqId)
  return `/requests?${params.toString()}`
}

export function quoteBuilderRoute(requestId: string) {
  return `/quotes?request=${encodeURIComponent(requestId)}`
}

export function readRequestWorkspace(search: string) {
  const params = new URLSearchParams(search)
  const rawView = params.get('view')
  const view: PricingWorkspaceView = rawView === 'vendors' || rawView === 'messages' || rawView === 'rates' ? rawView : 'summary'
  return { requestId: params.get('request'), view, rfqId: params.get('rfq') }
}
