import { useState, useEffect, useCallback } from 'react'
import { useSettings } from '@/context/SettingsContext'
import { useApp } from '@/context/AppContext'
import { usePortfolio } from '@/context/PortfolioContext'
import { secureGet, secureDel, secureSet, SNAP_INDEX_KEY } from '@/lib/vault'
import type { SnapshotMeta, Loan, ProductMeta } from '@/types'
import Button from '@/components/shared/Button'
import styles from './HistoryPanel.module.css'

interface HistoryPanelProps {
  open: boolean
  onClose: () => void
}

export default function HistoryPanel({ open, onClose }: HistoryPanelProps) {
  const { vaultStatus } = useSettings()
  const { showToast, navigateTo } = useApp()
  const { dispatch } = usePortfolio()
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([])
  const [loading, setLoading] = useState(true)

  const loadSnapshots = useCallback(async () => {
    setLoading(true)
    try {
      const index = await secureGet<SnapshotMeta[]>(SNAP_INDEX_KEY) || []
      setSnapshots(index)
    } catch {
      setSnapshots([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (open) loadSnapshots()
  }, [open, loadSnapshots])

  const handleRestore = useCallback(async (id: string) => {
    try {
      const snap = await secureGet<{
        data: Loan[]
        meta: Record<string, ProductMeta>
        headers: string[]
        fileName: string
      }>('snap:' + id)
      if (!snap?.data) { showToast('Snapshot not found', 'fail'); return }
      dispatch({
        type: 'RESTORE_SNAPSHOT',
        loans: snap.data,
        meta: snap.meta,
        headers: snap.headers,
        fileName: snap.fileName,
      })
      showToast('Snapshot restored', 'ok')
      onClose()
      navigateTo('analyze')
    } catch {
      showToast('Failed to restore snapshot', 'fail')
    }
  }, [showToast, dispatch, onClose, navigateTo])

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

  if (vaultStatus !== 'unlocked') return null

  const fmt2 = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <>
      <div className={`${styles.panel} ${open ? styles.open : ''}`}>
        <div className={styles.topBar}>
          <div>
            <div className={styles.topTitle}>Upload History</div>
            <div className={styles.topSub}>Encrypted snapshots · 90-day retention</div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.list}>
          {loading ? (
            <div className={styles.empty}>Loading…</div>
          ) : snapshots.length === 0 ? (
            <div className={styles.empty}>
              No snapshots yet.<br />
              Upload a portfolio file to create the first snapshot.
            </div>
          ) : (
            snapshots.map((s, i) => {
              const d = new Date(s.timestamp)
              const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
              const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={s.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.badge}>#{snapshots.length - i}</span>
                    <div style={{ flex: 1 }}>
                      <div className={styles.filename}>{s.filename}</div>
                      <div className={styles.date}>{dateStr} · {timeStr}</div>
                    </div>
                  </div>
                  <div className={styles.meta}>
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
                  <div className={styles.cardActions}>
                    <Button variant="primary" style={{ flex: 1, padding: 8, fontSize: 12 }} onClick={() => handleRestore(s.id)}>Restore</Button>
                    <Button variant="outline" style={{ padding: '8px 14px', fontSize: 12 }} onClick={() => handleDelete(s.id)}>Delete</Button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
