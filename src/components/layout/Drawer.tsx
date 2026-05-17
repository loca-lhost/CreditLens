import { useState, useEffect, useCallback } from 'react'
import type { Loan } from '@/types'
import { usePortfolio } from '@/context/PortfolioContext'
import { getProductColor, TYPE_LABELS } from '@/lib/colors'
import { fmt } from '@/lib/parser'
import Badge from '@/components/shared/Badge'
import styles from './Drawer.module.css'

interface DrawerProps {
  loan: Loan | null
  onClose: () => void
}

export default function Drawer({ loan, onClose }: DrawerProps) {
  const { state, dispatch } = usePortfolio()
  const open = loan !== null

  const currentOfficer = loan
    ? (state.officerMap[loan.repAcct || loan.applId] || loan.officer || '')
    : ''

  const [officerInput, setOfficerInput] = useState(currentOfficer)

  useEffect(() => {
    if (loan) setOfficerInput(currentOfficer)
  }, [loan, currentOfficer])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  const handleOfficerChange = useCallback((val: string) => {
    if (!loan) return
    const officerKey = loan.repAcct || loan.applId || ''
    setOfficerInput(val)
    dispatch({ type: 'SET_OFFICER', officerKey, officerName: val.trim() })
  }, [loan, dispatch])

  if (!loan) return null

  const c = getProductColor(loan.productName, loan.type)
  const loanId = loan.applId || loan.repAcct || loan.name
  const loanAnomalies = state.anomalies.filter(a => a.id === loanId)

  const fields: [string, string][] = [
    ['Account No.', loan.repAcct || '—'],
    ['Opening Date', loan.openingDate || '—'],
    ['Maturity Date', loan.maturityDate || '—'],
    ['Term (Mo.)', String(loan.termMo || 0)],
    ['Loan Amount', `GHS ${fmt(loan.commit)}`],
    ['Rate (%)', String(loan.rate || 0)],
    ['Overdue', loan.overdue > 0 ? `GHS ${fmt(loan.overdue)}` : '—'],
    ['DPD', loan.dpd > 0 ? `${loan.dpd} days` : '—'],
    ['Daily Rep.', loan.daily > 0 ? `GHS ${fmt(loan.daily)}` : '—'],
    ['Weekly Rep.', loan.weekly > 0 ? `GHS ${fmt(loan.weekly)}` : '—'],
    ['Monthly Rep.', loan.monthly > 0 ? `GHS ${fmt(loan.monthly)}` : '—'],
    ['Bullet Payment', loan.bullet > 0 ? `GHS ${fmt(loan.bullet)}` : '—'],
  ]

  return (
    <div className={`${styles.drawer} ${open ? styles.open : ''}`}>
      <div className={styles.header}>
        <button className={styles.close} onClick={onClose}>✕</button>
      </div>

      <div className={styles.subHeader}>
        <div className={styles.subName}>{loan.name || 'Unknown Customer'}</div>
        <div className={styles.subMeta}>
          <span style={{
            padding: '3px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            background: c.bg, color: c.color,
          }}>
            {TYPE_LABELS[loan.type] || loan.type}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>{loan.productName || ''}</span>
          {loan.applId && (
            <span style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
              #{loan.applId}
            </span>
          )}
        </div>
      </div>

      <div className={styles.fields}>
        {loan.daysToNext != null && (
          <>
            {(() => {
              const n = loan.daysToNext
              let color = 'var(--green)', label = `${n} days`
              if (n < 0) { color = 'var(--red)'; label = `${Math.abs(n)} days overdue` }
              else if (n === 0) { color = 'var(--red)'; label = 'Due today' }
              else if (n <= 7) { color = 'var(--orange)'; label = `${n} days` }
              return (
                <div className={styles.instalmentBanner} style={{ borderLeftColor: color, background: `${color}18` }}>
                  <dt className={styles.fieldLabel} style={{ color }}>Next Instalment</dt>
                  <dd style={{ fontSize: 13, fontWeight: 800, color, margin: 0 }}>{label}</dd>
                </div>
              )
            })()}
          </>
        )}

        {fields.map(([label, value]) => (
          <div key={label} className={styles.field}>
            <dt className={styles.fieldLabel}>{label}</dt>
            <dd className={styles.fieldValue}>{value}</dd>
          </div>
        ))}

        <div className={styles.field}>
          <dt className={styles.fieldLabel}>Assigned Officer</dt>
          <input
            className={styles.officerInput}
            type="text"
            value={officerInput}
            onChange={e => handleOfficerChange(e.target.value)}
            placeholder="Type officer name…"
          />
        </div>

        {loanAnomalies.length > 0 && (
          <div className={styles.anomalyBox}>
            <div className={styles.anomalyTitle}>
              ⚠ {loanAnomalies.length} Anomal{loanAnomalies.length > 1 ? 'ies' : 'y'}
            </div>
            {loanAnomalies.map((a, i) => (
              <div key={i} className={styles.anomalyItem}>• {a.desc}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
