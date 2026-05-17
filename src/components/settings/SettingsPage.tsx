import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/context/AppContext'
import { useSettings } from '@/context/SettingsContext'
import { usePortfolio } from '@/context/PortfolioContext'
import { secureGet, secureDel, secureSet, SNAP_INDEX_KEY } from '@/lib/vault'
import type { SnapshotMeta, Theme, Loan, ProductMeta } from '@/types'
import Button from '@/components/shared/Button'
import styles from './SettingsPage.module.css'

const THEMES: { id: Theme; label: string; bg: string; card: string; border: string }[] = [
  { id: 'light', label: 'Light', bg: '#FAFBFC', card: '#FFFFFF', border: '#E2E8F0' },
  { id: 'dark', label: 'Dark', bg: '#0B1121', card: '#1F2937', border: '#1E293B' },
  { id: 'midnight', label: 'Midnight', bg: '#000000', card: '#111111', border: '#1A1A1A' },
]

const fmt2 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

export default function SettingsPage() {
  const { theme, setTheme, showToast, navigateTo } = useApp()
  const { dispatch } = usePortfolio()
  const {
    provider, setProvider, key, hasKey, saveKey, clearKey,
    providerLabel, providerPlaceholder, providerHint,
  } = useSettings()
  const [inputKey, setInputKey] = useState('')
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([])
  const [loadingSnapshots, setLoadingSnapshots] = useState(false)

  const loadSnapshots = useCallback(async () => {
    setLoadingSnapshots(true)
    try {
      const index = await secureGet<SnapshotMeta[]>(SNAP_INDEX_KEY) || []
      setSnapshots(index)
    } catch {
      setSnapshots([])
    }
    setLoadingSnapshots(false)
  }, [])

  useEffect(() => {
    loadSnapshots()
  }, [loadSnapshots])

  const handleSaveKey = () => {
    const trimmed = inputKey.trim()
    if (!trimmed) return
    saveKey(trimmed)
    showToast('API key saved', 'ok')
  }

  const handleClearKey = () => {
    clearKey()
    setInputKey('')
    showToast('API key cleared', 'ok')
  }

  const handleRestore = async (id: string) => {
    try {
      const snap = await secureGet<{
        data: Loan[]
        meta: Record<string, ProductMeta>
        headers: string[]
        fileName: string
        officerMap?: Record<string, string>
      }>('snap:' + id)
      if (!snap?.data) { showToast('Snapshot not found', 'fail'); return }
      dispatch({
        type: 'RESTORE_SNAPSHOT',
        loans: snap.data,
        meta: snap.meta,
        headers: snap.headers,
        fileName: snap.fileName,
        officerMap: snap.officerMap,
      })
      showToast('Snapshot restored', 'ok')
      navigateTo('analyze')
    } catch {
      showToast('Failed to restore snapshot', 'fail')
    }
  }

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this snapshot? This cannot be undone.')) return
    try {
      await secureDel('snap:' + id)
      const index = await secureGet<SnapshotMeta[]>(SNAP_INDEX_KEY) || []
      const updated = index.filter(s => s.id !== id)
      await secureSet(SNAP_INDEX_KEY, updated)
      setSnapshots(updated)
      showToast('Snapshot deleted', 'ok')
    } catch {
      showToast('Delete failed', 'fail')
    }
  }, [showToast])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Configure appearance, AI integration, and preferences.</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Upload History</h2>
        <p className={styles.sectionDesc}>Encrypted snapshots &middot; 90-day retention</p>

        {loadingSnapshots ? (
          <div className={styles.empty}>Loading&hellip;</div>
        ) : snapshots.length === 0 ? (
          <div className={styles.empty}>
            No snapshots yet. Upload a portfolio file to create the first snapshot.
          </div>
        ) : (
          <div className={styles.snapshotList}>
            {snapshots.map((s, i) => {
              const d = new Date(s.timestamp)
              const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={s.id} className={styles.snapshotCard}>
                  <div className={styles.snapshotHeader}>
                    <span className={styles.snapshotBadge}>#{snapshots.length - i}</span>
                    <div style={{ flex: 1 }}>
                      <div className={styles.snapshotFilename}>{s.filename}</div>
                      <div className={styles.snapshotDate}>{dateStr} &middot; {timeStr}</div>
                    </div>
                  </div>
                  <div className={styles.snapshotMeta}>
                    <div>
                      <div className={styles.metaLabel}>Loans</div>
                      <div className={styles.metaValue}>{s.loanCount}</div>
                    </div>
                    <div>
                      <div className={styles.metaLabel}>In Arrears</div>
                      <div className={styles.metaValue}>{s.overdueCount}</div>
                    </div>
                    <div>
                      <div className={styles.metaLabel}>Total Arrears</div>
                      <div className={styles.metaValue}>GHS {fmt2(s.totalArrears)}</div>
                    </div>
                    <div>
                      <div className={styles.metaLabel}>Avg. Days Overdue</div>
                      <div className={styles.metaValue}>{s.avgDPD}d</div>
                    </div>
                  </div>
                  <div className={styles.snapshotActions}>
                    <Button variant="primary" style={{ flex: 1, padding: 8, fontSize: 12 }} onClick={() => handleRestore(s.id)}>Restore</Button>
                    <Button variant="outline" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => handleDelete(s.id)}>Delete</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className={styles.divider} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.themeGrid}>
          {THEMES.map(t => (
            <button
              key={t.id}
              className={`${styles.themeCard} ${theme === t.id ? styles.themeActive : ''}`}
              onClick={() => setTheme(t.id)}
            >
              <div className={styles.themeSwatch} style={{ background: t.bg, borderColor: t.border }}>
                <div className={styles.themeSwatchInner} style={{ background: t.card, borderColor: t.border }} />
              </div>
              <span className={styles.themeLabel}>{t.label}</span>
              <span className={`${styles.themeDot} ${theme === t.id ? styles.themeDotActive : ''}`} />
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>AI Integration</h2>
        <div className={styles.field}>
          <label className={styles.label}>Provider</label>
          <select
            className={styles.select}
            value={provider}
            onChange={e => { setProvider(e.target.value as 'gemini' | 'groq'); setInputKey('') }}
          >
            <option value="gemini">Google Gemini (Flash Lite)</option>
            <option value="groq">Groq (Llama 3.3 70B)</option>
            <option value="openrouter">OpenRouter (Multiple Free Models)</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>API Key</label>
          <input
            type="password"
            className={styles.input}
            placeholder={providerPlaceholder}
            value={inputKey || key}
            onChange={e => setInputKey(e.target.value)}
            autoComplete="off"
          />
          <div className={`${styles.status} ${hasKey ? styles.statusOk : styles.statusNone}`}>
            <span className={styles.statusDot} />
            <span>{hasKey ? `${providerLabel} key configured` : 'No key configured'}</span>
          </div>
          <div className={styles.hint} dangerouslySetInnerHTML={{ __html: providerHint }} />
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClearKey}>Clear</Button>
          <Button variant="primary" onClick={handleSaveKey}>Save Key</Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Privacy</h2>
        <div className={styles.info}>
          <strong>Data anonymization is always on.</strong> Customer names are replaced with aliases (e.g. Customer_001). Account numbers and IDs are never sent to the AI. Aggregate features send only totals and counts.
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={styles.info}>
          <strong>CreditLens</strong> &mdash; Loan Portfolio Analysis Tool<br />
          Supports: Gemini Flash Lite &amp; Groq Llama 3<br />
          Both providers offer generous free tiers
        </div>
      </section>
    </div>
  )
}
