import { useState, useEffect } from 'react'
import { useApp } from '@/context/AppContext'
import HistoryPanel from '@/components/settings/HistoryPanel'
import styles from './Sidebar.module.css'
import type { Page } from '@/types'

const pages: { id: Page; label: string; icon: string }[] = [
  { id: 'landing', label: 'Home', icon: 'home' },
  { id: 'analyze', label: 'Analyze', icon: 'analyze' },
  { id: 'compare', label: 'Compare', icon: 'compare' },
]

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
      <path d="M9 21V12h6v9"/>
    </svg>
  )
}

function AnalyzeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  )
}

function CompareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8"/>
      <line x1="4" y1="20" x2="21" y2="3"/>
      <polyline points="21 16 21 21 16 21"/>
      <line x1="15" y1="15" x2="21" y2="21"/>
    </svg>
  )
}

function HistoryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9"/>
      <polyline points="12 7 12 12 15 15"/>
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="1.8"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  )
}

const iconMap: Record<string, React.FC> = {
  home: HomeIcon,
  analyze: AnalyzeIcon,
  compare: CompareIcon,
}

export default function Sidebar() {
  const { page, navigateTo } = useApp()
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHistoryOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
            <line x1="22" y1="22" x2="28" y2="28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="2.5"/>
            <rect x="9" y="16" width="2.5" height="4" rx="0.5" fill="currentColor" opacity="0.4"/>
            <rect x="13" y="13" width="2.5" height="7" rx="0.5" fill="currentColor" opacity="0.6"/>
            <rect x="17" y="10" width="2.5" height="10" rx="0.5" fill="currentColor"/>
          </svg>
          <span className={styles.logoText}>CreditLens</span>
        </div>

        <nav className={styles.nav}>
          {pages.map(p => {
            const Icon = iconMap[p.icon]
            return (
              <button
                key={p.id}
                onClick={() => navigateTo(p.id)}
                className={`${styles.navItem} ${page === p.id ? styles.active : ''}`}
                aria-label={p.label}
              >
                <Icon />
                <span className={styles.navLabel}>{p.label}</span>
              </button>
            )
          })}
        </nav>

        <div className={styles.bottomNav}>
          <button
            onClick={() => setHistoryOpen(true)}
            className={styles.navItem}
            aria-label="Upload History"
          >
            <HistoryIcon />
            <span className={styles.navLabel}>History</span>
          </button>
          <button
            onClick={() => navigateTo('settings')}
            className={`${styles.navItem} ${page === 'settings' ? styles.active : ''}`}
            aria-label="Settings"
          >
            <SettingsIcon />
            <span className={styles.navLabel}>Settings</span>
          </button>
        </div>
      </aside>

      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  )
}
