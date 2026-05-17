import { useApp } from '@/context/AppContext'
import { usePortfolio } from '@/context/PortfolioContext'
import { useSettings } from '@/context/SettingsContext'
import { getProductColor, TYPE_LABELS, TYPE_PALETTES } from '@/lib/colors'
import styles from './LandingPage.module.css'

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem('creditlens_last_session') || 'null')
  } catch { return null }
}

export default function LandingPage() {
  const { navigateTo } = useApp()
  const { state } = usePortfolio()
  const { hasKey, providerLabel } = useSettings()

  const session = loadSession()
  const hasActiveData = state.loans.length > 0

  const totalLoans = hasActiveData ? state.loans.length : (session?.loanCount || 0)
  const arrearsCount = hasActiveData
    ? state.loans.filter(l => (l.dpd || 0) > 0).length
    : (session?.arrearsCount || 0)
  const avgDPD = hasActiveData
    ? Math.round(state.loans.reduce((sum, l) => sum + (l.dpd || 0), 0) / (state.loans.length || 1))
    : (session?.avgDPD || 0)
  const scheduleCount = Object.values(state.scheduleData || {}).reduce((sum, arr) => sum + (arr?.length || 0), 0)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Portfolio oversight and recovery intelligence.</p>
      </header>

      <div className={styles.ctaGrid}>
        <button
          className={styles.ctaCard}
          onClick={() => navigateTo('analyze')}
        >
          <div className={styles.ctaIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
          <div>
            <div className={styles.ctaTitle}>New Analysis</div>
            <div className={styles.ctaDesc}>Upload and process a loan portfolio</div>
          </div>
        </button>

        <button
          className={`${styles.ctaCard} ${styles.ctaSecondary}`}
          onClick={() => navigateTo('compare')}
        >
          <div className={styles.ctaIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M16 3l4 4-4 4M8 21l-4-4 4-4M20 7H4M4 17h16"/>
            </svg>
          </div>
          <div>
            <div className={styles.ctaTitle}>Comparison Engine</div>
            <div className={styles.ctaDesc}>Track period-over-period recovery</div>
          </div>
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Loans</div>
          <div className={styles.statValue}>{totalLoans.toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>In Arrears</div>
          <div className={styles.statValue}>{arrearsCount.toLocaleString()}</div>
          {totalLoans > 0 && (
            <div className={styles.statTrend}>
              {Math.round((arrearsCount / totalLoans) * 100)}% of portfolio
            </div>
          )}
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Avg Days Overdue</div>
          <div className={styles.statValue}>{avgDPD}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Schedules</div>
          <div className={styles.statValue}>{scheduleCount}</div>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.recentActivity}>
          <h3 className={styles.sectionTitle}>Recent Activity</h3>
          {session ? (
            <div className={styles.sessionInfo}>
              <div className={styles.sessionDate}>
                Last processed: {new Date(session.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              {session.byType && (
                <div className={styles.typeBreakdown}>
                  {Object.entries(session.byType as Record<string, number>)
                    .filter(([, v]) => v > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([t, v]) => {
                      const c = (TYPE_PALETTES[t as keyof typeof TYPE_PALETTES] || TYPE_PALETTES.std)[0]
                      return (
                        <span
                          key={t}
                          className={styles.typeBadge}
                          style={{ background: c.bg, color: c.color }}
                        >
                          {TYPE_LABELS[t as keyof typeof TYPE_LABELS] || t}: {v}
                        </span>
                      )
                    })}
                </div>
              )}
            </div>
          ) : (
            <p className={styles.emptyText}>No recent analysis data found. Upload a portfolio to get started.</p>
          )}
        </section>

        <section className={styles.aiStatus}>
          <h3 className={styles.sectionTitle}>AI Status</h3>
          <div className={`${styles.statusIndicator} ${hasKey ? styles.statusActive : styles.statusInactive}`}>
            <span className={styles.statusDot} />
            {hasKey ? 'Operational' : 'Inactive'}
          </div>
          <p className={styles.statusDesc}>
            Provider: {providerLabel} {hasKey ? '(connected)' : '(no API key)'}
          </p>
        </section>
      </div>

      <section className={styles.infraSection}>
        <h3 className={styles.sectionTitle}>System</h3>
        <div className={styles.infraGrid}>
          <div className={styles.infraCard}>
            <div className={styles.infraLabel}>Security</div>
            <div className={styles.infraValue}>
              <span className={styles.statusDotSmall} />
              AES-256 Encryption
            </div>
          </div>
          <div className={styles.infraCard}>
            <div className={styles.infraLabel}>Processing</div>
            <div className={styles.infraValue}>Client-side, no data leaves your browser</div>
          </div>
          <div className={styles.infraCard}>
            <div className={styles.infraLabel}>Intelligence</div>
            <div className={styles.infraValue}>{providerLabel}</div>
          </div>
        </div>
      </section>
    </div>
  )
}
