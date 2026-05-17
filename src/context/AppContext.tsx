import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Theme, Page } from '@/types'

interface ToastState {
  message: string
  type: 'ok' | 'fail' | 'warn'
}

interface AppContextValue {
  theme: Theme
  page: Page
  toast: ToastState | null
  loading: boolean
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  navigateTo: (p: Page) => void
  showToast: (message: string, type?: 'ok' | 'fail' | 'warn') => void
  showSpinner: () => void
  hideSpinner: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

function getInitialTheme(): Theme {
  const saved = localStorage.getItem('creditlens_theme')
  if (saved === 'dark') return 'dark'
  if (saved === 'midnight') return 'midnight'
  return 'light'
}

function applyTheme(theme: Theme) {
  if (theme === 'dark' || theme === 'midnight') {
    document.documentElement.setAttribute('data-theme', theme)
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

const TOAST_TIMEOUT = 3800

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const [page, setPage] = useState<Page>('landing')
  const [toast, setToast] = useState<ToastState | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('creditlens_theme', theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'midnight'
      return 'light'
    })
  }, [])

  const navigateTo = useCallback((p: Page) => {
    setPage(p)
    window.scrollTo(0, 0)
  }, [])

  const showToast = useCallback((message: string, type: 'ok' | 'fail' | 'warn' = 'ok') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), TOAST_TIMEOUT)
  }, [])

  const showSpinner = useCallback(() => setLoading(true), [])
  const hideSpinner = useCallback(() => setLoading(false), [])

  return (
    <AppContext.Provider value={{
      theme, page, toast, loading,
      setTheme, toggleTheme, navigateTo, showToast, showSpinner, hideSpinner,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
