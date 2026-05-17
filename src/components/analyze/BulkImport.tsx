import { useState, useRef, useCallback } from 'react'
import { usePortfolio } from '@/context/PortfolioContext'
import { useApp } from '@/context/AppContext'
import Button from '@/components/shared/Button'
import styles from './BulkImport.module.css'

interface BulkImportProps {
  open: boolean
  onClose: () => void
}

function parseCSVLine(line: string): string[] {
  const cols: string[] = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  cols.push(cur.trim())
  return cols
}

export default function BulkImport({ open, onClose }: BulkImportProps) {
  const { dispatch, state } = usePortfolio()
  const { showToast } = useApp()
  const [text, setText] = useState('')
  const [status, setStatus] = useState<React.ReactNode>('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleRun = useCallback(() => {
    const raw = text.trim()
    if (!raw) { setStatus(<span style={{ color: 'var(--red)' }}>Nothing to import.</span>); return }

    const lines = raw.split(/\r?\n/).filter(l => l.trim())
    const dataLines = lines[0].toLowerCase().replace(/^"/, '').startsWith('account') ? lines.slice(1) : lines
    if (!dataLines.length) { setStatus(<span style={{ color: 'var(--red)' }}>No data rows found.</span>); return }

    const acctMap = new Map<string, number>()
    state.loans.forEach((r, i) => {
      const k1 = (r.repAcct || '').trim().toLowerCase()
      if (k1) acctMap.set(k1, i)
      const k2 = (r.applId || '').trim().toLowerCase()
      if (k2 && !acctMap.has(k2)) acctMap.set(k2, i)
    })

    let matched = 0, skipped = 0, unmatched = 0
    const updates: Array<{ acct: string; arrears: number; dpd: number }> = []

    for (const line of dataLines) {
      if (!line.trim()) { skipped++; continue }
      const cols = parseCSVLine(line)
      const acct = (cols[0] || '').replace(/^,+|,+$/g, '').toLowerCase()
      const arrears = parseFloat(cols[2]) || 0
      const dpd = parseInt(cols[3], 10) || 0
      if (!acct) { skipped++; continue }
      if (!acctMap.has(acct)) { unmatched++; continue }
      updates.push({ acct, arrears, dpd })
      matched++
    }

    if (matched > 0) {
      dispatch({ type: 'BULK_UPDATE', updates })
      dispatch({ type: 'ADD_LOG', message: `Bulk import: ${matched} rows updated, ${unmatched} unmatched`, level: 'ok' })
      showToast(`${matched} arrears record${matched !== 1 ? 's' : ''} updated`, 'ok')
      setTimeout(onClose, 1400)
    }

    const statusColor = matched > 0 ? 'var(--green)' : 'var(--red)'
    setStatus(
      <span>
        <span style={{ color: statusColor, fontWeight: 700 }}>{matched} row{matched !== 1 ? 's' : ''} updated</span>
        {unmatched > 0 && <> &nbsp;·&nbsp; <span style={{ color: 'var(--orange)' }}>{unmatched} unmatched</span></>}
        {skipped > 0 && <> &nbsp;·&nbsp; <span style={{ color: 'var(--text-faint)' }}>{skipped} skipped</span></>}
      </span>
    )
  }, [text, state.loans, dispatch, showToast, onClose])

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Bulk Import Arrears</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>
        <p className={styles.desc}>
          Paste comma-separated data: <code>Account, Name, Arrears, DPD</code> (one per line).
          Rows are matched by account number.
        </p>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder={`ACC001, John Doe, 1250.00, 14\nACC002, Jane Smith, 500.00, 7\n...`}
          rows={10}
          autoFocus
        />
        <div className={styles.status}>{status}</div>
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleRun}>Import</Button>
        </div>
      </div>
    </div>
  )
}
