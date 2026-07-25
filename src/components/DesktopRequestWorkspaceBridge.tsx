import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { RequestWorkspace, type RequestSummary } from './RequestWorkspace'

export function DesktopRequestWorkspaceBridge() {
  const location = useLocation()
  const navigate = useNavigate()
  const [host, setHost] = useState<HTMLElement | null>(null)
  const [request, setRequest] = useState<RequestSummary | null>(null)
  const requestId = location.pathname === '/requests' ? new URLSearchParams(location.search).get('request') : null

  useEffect(() => {
    setHost(document.querySelector<HTMLElement>('.workspace'))
  }, [location.pathname])

  useEffect(() => {
    if (!requestId) {
      setRequest(null)
      return
    }
    supabase.from('quote_requests').select('*').eq('id', requestId).maybeSingle().then(({ data }) => {
      setRequest((data || null) as RequestSummary | null)
    })
  }, [requestId])

  useEffect(() => {
    const app = document.querySelector<HTMLElement>('.app-bg')
    app?.classList.toggle('request-workspace-open', Boolean(requestId))
    return () => app?.classList.remove('request-workspace-open')
  }, [requestId])

  if (!host || !requestId || !request) return null

  return createPortal(
    <div className="embedded-request-workspace">
      <RequestWorkspace
        request={request}
        onClose={() => navigate('/requests')}
        onChanged={() => window.dispatchEvent(new CustomEvent('desktop-request-changed'))}
      />
    </div>,
    host,
  )
}
