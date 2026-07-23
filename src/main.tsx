import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AppEnhancements } from './components/AppEnhancements'
import { PremiumMobileInteractions } from './components/PremiumMobileInteractions'
import { MobileAccountDrawerEnhancer } from './components/MobileAccountDrawerEnhancer'
import { MobileQueueControls } from './components/MobileQueueControls'
import { MobileRequestNavigation } from './components/MobileRequestNavigation'
import { RfqActionBridge } from './components/RfqActionBridge'
import { AuthGate } from './components/AuthGate'
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
import './quote-workspace.css'
import './quote-workspace-v2.css'
import './auth-gate.css'
import './quote-workspace-layout-fix.css'
import './workspace-stability.css'
import './quote-management.css'
import './quote-output-and-rate-basis.css'
import './pricing-usability-fixes.css'
import './quote-mobile-workspace.css'
import './controlled-pricing-and-print.css'
import './final-ui-stabilization.css'
import './universal-selector.css'
import './mobile-stability-final.css'
import './mobile-system-v2.css'
import './mobile-quote-app.css'
import './mobile-vendor-rate.css'
import './mobile-public-request.css'
import './premium-mobile-v3.css'
import './mobile-quote-tabs-fix.css'
import './mobile-rebuild.css'
import './mobile-native-v1.css'
import './mobile-native-v2.css'
import './mobile-native-v3.css'
import './mobile-native-v4.css'
import './mobile-overview-v1.css'
import './mobile-native-v5.css'
import './mobile-global-search.css'
import './mobile-account-v2.css'
import './mobile-account-menu-fix.css'
import './mobile-account-drawer.css'
import './mobile-account-drawer-native.css'
import './mobile-request-queue-v2.css'
import './mobile-request-queue-v3.css'
import './mobile-request-queue-compact.css'
import './mobile-request-queue-v4.css'
import './mobile-request-account-final.css'
import './mobile-quote-queue-v1.css'
import './request-decision-workspace.css'
import './mobile-rfq-composer.css'
import './rfq-mobile-exact.css'
import './rfq-mobile-interactions.css'
import './rfq-mobile-final-tuning.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthGate>
        <AppEnhancements />
        <PremiumMobileInteractions />
        <MobileAccountDrawerEnhancer />
        <MobileQueueControls />
        <MobileRequestNavigation />
        <RfqActionBridge />
        <App />
      </AuthGate>
    </HashRouter>
  </React.StrictMode>,
)
