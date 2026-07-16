import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AppEnhancements } from './components/AppEnhancements'
import './design-system/tokens.css'
import './design-system/components.css'
import './styles.css'
import './premium.css'
import './request-workspace.css'
import './vendor-workspace.css'
import './public-portal.css'
import './public-portal-v2.css'
import './public-portal-cargo-premium.css'
import './stability-fixes.css'
import './rfq-composer.css'
import './pricing-workspace.css'
import './rfq-template-builder.css'
import './template-field-editor.css'
import './vendor-rate-workspace.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AppEnhancements />
      <App />
    </HashRouter>
  </React.StrictMode>,
)