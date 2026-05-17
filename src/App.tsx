import { AppProvider, useApp } from '@/context/AppContext'
import { PortfolioProvider } from '@/context/PortfolioContext'
import { CompareProvider } from '@/context/CompareContext'
import { SettingsProvider, useSettings } from '@/context/SettingsContext'
import Toast from '@/components/layout/Toast'
import Spinner from '@/components/layout/Spinner'
import Sidebar from '@/components/layout/Sidebar'
import AnalyzePage from '@/components/analyze'
import ComparePage from '@/components/compare'
import LandingPage from '@/components/pages/LandingPage'
import SettingsPage from '@/components/settings/SettingsPage'
import VaultGate from '@/components/settings/VaultGate'
import type { Page } from '@/types'

function PageRouter() {
  const { page } = useApp()

  switch (page) {
    case 'landing': return <LandingPage />
    case 'analyze': return <AnalyzePage />
    case 'compare': return <ComparePage />
    case 'settings': return <SettingsPage />
    default: return <LandingPage />
  }
}

function VaultGateWrapper() {
  const { vaultStatus } = useSettings()
  if (vaultStatus === 'unlocked') return null
  return <VaultGate />
}

export default function App() {
  return (
    <AppProvider>
      <SettingsProvider>
        <PortfolioProvider>
          <CompareProvider>
            <VaultGateWrapper />
            <div className="app-layout">
              <Sidebar />
              <main className="app-main">
                <PageRouter />
              </main>
              <Toast />
              <Spinner />
            </div>
          </CompareProvider>
        </PortfolioProvider>
      </SettingsProvider>
    </AppProvider>
  )
}
