import { Component, type ReactNode, useCallback, useRef } from 'react'
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
import Button from '@/components/shared/Button'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import errorStyles from '@/components/shared/ErrorBoundary.module.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className={errorStyles.container}>
          <div className={errorStyles.card}>
            <h2 className={errorStyles.title}>Something went wrong</h2>
            <p className={errorStyles.message}>{this.state.error?.message}</p>
            <Button variant="primary" onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}>
              Reload App
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

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

function KeyboardShortcuts() {
  const { navigateTo, showToast } = useApp()
  const searchRef = useRef<HTMLInputElement | null>(null)

  const handleSearchFocus = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('.fsi, input[placeholder*="Search"]')
    if (input) {
      input.focus()
      input.select()
    } else {
      showToast('No search field available', 'warn')
    }
  }, [showToast])

  const handleExport = useCallback(() => {
    const btn = document.querySelector<HTMLButtonElement>('[aria-label="Export"]')
    if (btn) btn.click()
    else showToast('No export available', 'warn')
  }, [showToast])

  useKeyboardShortcuts({
    onSearchFocus: handleSearchFocus,
    onExport: handleExport,
    onNavigate: (p: string) => navigateTo(p as Page),
  })

  return null
}

export default function App() {
  return (
    <AppProvider>
      <SettingsProvider>
        <PortfolioProvider>
          <CompareProvider>
            <KeyboardShortcuts />
            <VaultGateWrapper />
            <div className="app-layout">
              <Sidebar />
              <main className="app-main">
                <ErrorBoundary>
                  <PageRouter />
                </ErrorBoundary>
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
