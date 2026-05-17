import { useState, useCallback, useEffect, useRef } from 'react'
import { usePortfolio } from '@/context/PortfolioContext'
import { exportScheduleXLSX, getExportFilename } from '@/lib/export'
import { fmt } from '@/lib/parser'
import Button from '@/components/shared/Button'
import AICard from '@/components/shared/AICard'
import { generateScheduleSummary, generateVisitTalkingPoints } from '@/lib/ai/insights'
import styles from './ScheduleSection.module.css'

export default function ScheduleSection() {
  const { state } = usePortfolio()
  const sd = state.scheduleData

  const [aiContent, setAiContent] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [tpContent, setTpContent] = useState<string | null>(null)
  const [tpLoading, setTpLoading] = useState(false)
  const [tpError, setTpError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [scheduleTime, setScheduleTime] = useState<Date | null>(null)
  const [relativeTime, setRelativeTime] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const generateSummary = useCallback(() => {
    if (!sd) return
    setAiLoading(true)
    setAiError(null)
    setAiContent(null)
    generateScheduleSummary(
      sd.postDisb.length,
      sd.recovery.length,
      sd.urgentMat.length,
      sd.routine.length,
      (content) => { setAiContent(content); setAiLoading(false) },
      (msg) => { setAiError(msg); setAiLoading(false) }
    )
  }, [sd])

  const generateTalkingPoints = useCallback(() => {
    if (!sd || sd.recovery.length === 0) return
    setTpLoading(true)
    setTpError(null)
    setTpContent(null)
    generateVisitTalkingPoints(
      sd.recovery,
      (content) => { setTpContent(content); setTpLoading(false) },
      (msg) => { setTpError(msg); setTpLoading(false) }
    )
  }, [sd])

  useEffect(() => {
    if (sd) {
      setScheduleTime(new Date())
      generateSummary()
      if (sd.recovery.length > 0) {
        generateTalkingPoints()
      }
    }
  }, [sd, generateSummary, generateTalkingPoints])

  useEffect(() => {
    if (!scheduleTime) return
    const update = () => {
      const diff = Math.floor((Date.now() - scheduleTime.getTime()) / 1000)
      if (diff < 60) setRelativeTime('just now')
      else if (diff < 3600) setRelativeTime(`${Math.floor(diff / 60)} min ago`)
      else setRelativeTime(`${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`)
    }
    update()
    intervalRef.current = setInterval(update, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [scheduleTime])

  if (!sd) return null

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    const fn = getExportFilename('CreditLens_Schedule')
    await exportScheduleXLSX(sd, fn)
    setExporting(false)
  }

  const renderTable = (
    title: string,
    type: 'post' | 'recovery' | 'urgent' | 'routine',
    rows: { name: string; productName: string }[],
    columns: string[],
    renderRow: (r: any) => React.ReactNode
  ) => (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <span className={styles.groupTitle}>{title}</span>
        <span className={`${styles.groupCount} ${styles[type]}`}>{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div className={styles.empty}>No loans qualify this period</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>{columns.map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>{renderRow(r)}</tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  return (
    <div className={styles.section}>
      <AICard
        content={aiContent}
        loading={aiLoading}
        error={aiError}
        onDismiss={() => { setAiContent(null); setAiError(null) }}
        onRegenerate={generateSummary}
      />
      {sd.recovery.length > 0 && (
        <AICard
          content={tpContent}
          loading={tpLoading}
          error={tpError}
          onDismiss={() => { setTpContent(null); setTpError(null) }}
          onRegenerate={generateTalkingPoints}
        />
      )}
      <div className={styles.header}>
        <div className={styles.stamp}>Schedule generated {relativeTime}</div>
        <Button variant="secondary" onClick={handleExport} disabled={exporting}>Export Schedule</Button>
      </div>

      {renderTable('Post-Disbursement Visits', 'post', sd.postDisb,
        ['Borrower', 'Loan Type', 'Loan Amount', 'Days Since Disbursement', 'Opening Date'],
        r => <>
          <td>{r.name}</td><td>{r.productName}</td>
          <td>{fmt(r.commit)}</td><td>{r.daysSinceOpen} days</td>
          <td>{r.openingDate}</td>
        </>
      )}

      {renderTable('Field Recovery Visits', 'recovery', sd.recovery,
        ['Borrower', 'Loan Type', 'Arrears (GHS)', 'Days Overdue', 'Priority', 'Loan Amount'],
        r => <>
          <td>{r.name}</td><td>{r.productName}</td>
          <td>{fmt(r.overdue)}</td><td>{r.dpd}</td>
          <td><span className={`${styles.priority} ${styles[`p${r.priority}`] || ''}`}>{r.priority}</span></td>
          <td>{fmt(r.commit)}</td>
        </>
      )}

      {renderTable('Maturing Soon', 'urgent', sd.urgentMat,
        ['Borrower', 'Loan Type', 'Loan Amount', 'End Date', 'Days To Maturity'],
        r => <>
          <td>{r.name}</td><td>{r.productName}</td>
          <td>{fmt(r.commit)}</td><td>{r.maturityDate}</td>
          <td>{r.daysToMat} days</td>
        </>
      )}

      {renderTable('Routine Monitoring', 'routine', sd.routine,
        ['Borrower', 'Loan Type', 'Loan Amount', 'End Date', 'Days To Maturity'],
        r => <>
          <td>{r.name}</td><td>{r.productName}</td>
          <td>{fmt(r.commit)}</td><td>{r.maturityDate}</td>
          <td>{r.daysToMat} days</td>
        </>
      )}
    </div>
  )
}
