import { useState, useRef, useEffect, useCallback } from 'react'
import { usePortfolio } from '@/context/PortfolioContext'
import { useApp } from '@/context/AppContext'
import { generateXLSX, generateXLSXWithSummary, generateCSVText, downloadText, getExportFilename } from '@/lib/export'
import { generateSchedule as genSchedule } from '@/lib/schedule'
import { generateExportSummary } from '@/lib/ai/insights'
import { openPrintSummary } from '@/lib/print'
import Button from '@/components/shared/Button'
import Dialog from '@/components/layout/Dialog'
import styles from './Toolbar.module.css'

type ExportFormat = 'xlsx' | 'csv' | 'text'

export default function Toolbar() {
  const { state, dispatch, filteredLoans } = usePortfolio()
  const { showToast } = useApp()
  const [exportFiltered, setExportFiltered] = useState(true)
  const [includeAISummary, setIncludeAISummary] = useState(false)
  const [colDropdownOpen, setColDropdownOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('xlsx')
  const [formatOpen, setFormatOpen] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const colRef = useRef<HTMLDivElement>(null)
  const formatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colRef.current && !colRef.current.contains(e.target as Node)) {
        setColDropdownOpen(false)
      }
      if (formatRef.current && !formatRef.current.contains(e.target as Node)) {
        setFormatOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleExport = useCallback(async () => {
    if (exporting) return
    const rows = exportFiltered ? filteredLoans : state.loans
    if (!rows.length) { showToast('No rows selected', 'fail'); return }
    setExporting(true)

    if (exportFormat === 'xlsx') {
      const filename = getExportFilename('CreditLens_Arrangements')
      if (includeAISummary) {
        showToast('Generating AI summary…', 'ok')
        try {
          await new Promise<void>((resolve) => {
            generateExportSummary(
              rows,
              async (summary) => {
                await generateXLSXWithSummary(rows, summary, filename)
                dispatch({ type: 'ADD_LOG', message: `Exported with AI summary: ${filename}`, level: 'ok' })
                showToast(`${rows.length} rows + AI summary → ${filename}`, 'ok')
                resolve()
              },
              async () => {
                await generateXLSX(rows, filename)
                dispatch({ type: 'ADD_LOG', message: `Exported (no AI summary): ${filename}`, level: 'warn' })
                showToast(`${rows.length} rows → ${filename}`, 'warn')
                resolve()
              }
            )
          })
        } catch {
          await generateXLSX(rows, filename)
          dispatch({ type: 'ADD_LOG', message: `Exported: ${filename}`, level: 'ok' })
          showToast(`${rows.length} rows → ${filename}`, 'ok')
        }
      } else {
        await generateXLSX(rows, filename)
        dispatch({ type: 'ADD_LOG', message: `Exported: ${filename}`, level: 'ok' })
        showToast(`${rows.length} rows → ${filename}`, 'ok')
      }
    } else if (exportFormat === 'csv') {
      const text = generateCSVText(rows)
      const d = new Date()
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      downloadText(text, `Portfolio_Export_${stamp}.csv`)
      showToast(`${rows.length} rows → Portfolio_Export_${stamp}.csv`, 'ok')
    } else {
      const text = generateCSVText(rows, true)
      const d = new Date()
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
      downloadText(text, `Portfolio_Export_${stamp}.txt`)
      showToast(`${rows.length} rows → Portfolio_Export_${stamp}.txt`, 'ok')
    }
    setExporting(false)
  }, [exporting, exportFormat, exportFiltered, includeAISummary, filteredLoans, state.loans, showToast, dispatch])

  const handleGenerateSchedule = useCallback(() => {
    if (!state.loans.length) { showToast('No data loaded', 'fail'); return }
    const data = genSchedule(state.loans)
    dispatch({ type: 'SET_SCHEDULE', data })
  }, [state.loans, dispatch, showToast])

  const handleReset = useCallback(() => {
    setShowResetDialog(true)
  }, [])

  const confirmReset = useCallback(() => {
    dispatch({ type: 'CLEAR_DATA' })
    setShowResetDialog(false)
    showToast('Application reset', 'ok')
  }, [dispatch, showToast])

  const handlePrint = useCallback(() => {
    openPrintSummary(exportFiltered ? filteredLoans : state.loans)
  }, [exportFiltered, filteredLoans, state.loans])

  const toggleCol = useCallback((key: string) => {
    dispatch({ type: 'TOGGLE_COL', key })
    localStorage.setItem('creditlens_visible_cols', JSON.stringify([...state.visibleCols]))
  }, [dispatch, state.visibleCols])

  if (!state.dataLoaded) return null

  const formatLabels: Record<ExportFormat, string> = { xlsx: 'XLSX', csv: 'CSV', text: 'Text' }

  return (
    <div className={styles.er}>
      <div className={styles.erLeft}>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={exportFiltered}
            onChange={e => setExportFiltered(e.target.checked)}
          />
          Export current view only
        </label>
        {exportFormat === 'xlsx' && (
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={includeAISummary}
              onChange={e => setIncludeAISummary(e.target.checked)}
            />
            Include AI Summary
          </label>
        )}
        <div className={styles.colToggle} ref={colRef}>
          <button className={styles.colToggleBtn} onClick={() => setColDropdownOpen(!colDropdownOpen)} aria-label="Toggle columns">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.375-9.375z"/></svg>
            Columns
          </button>
          <div className={`${styles.colDropdown} ${colDropdownOpen ? styles.open : ''}`}>
            {state.columns.map(col => (
              <label key={col.k}>
                <input
                  type="checkbox"
                  checked={state.visibleCols.has(col.k)}
                  onChange={() => toggleCol(col.k)}
                />
                {col.l}
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.exportGroup}>
        <Button variant="primary" onClick={handleExport} disabled={exporting} aria-label="Export">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export <span className={styles.bcnt}>{filteredLoans.length}</span>
        </Button>
        <div className={styles.formatWrap} ref={formatRef}>
          <button className={styles.formatBtn} onClick={() => setFormatOpen(!formatOpen)} aria-label="Export format">
            {formatLabels[exportFormat]}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div className={`${styles.formatDropdown} ${formatOpen ? styles.open : ''}`}>
            {(['xlsx', 'csv', 'text'] as ExportFormat[]).map(f => (
              <button
                key={f}
                className={`${styles.formatItem} ${f === exportFormat ? styles.active : ''}`}
                onClick={() => { setExportFormat(f); setFormatOpen(false) }}
              >
                {formatLabels[f]}
                {f === 'xlsx' && <span className={styles.formatHint}>Multi-sheet</span>}
                {f === 'csv' && <span className={styles.formatHint}>Comma-separated</span>}
                {f === 'text' && <span className={styles.formatHint}>Plain text</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Button variant="secondary" onClick={handleGenerateSchedule} aria-label="Schedule">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Schedule
      </Button>
      <Button variant="secondary" onClick={handlePrint} aria-label="Print Summary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Print
      </Button>
      <Button variant="danger" onClick={handleReset} aria-label="Reset">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 12a9 9 0 109-9M3 3v4h4"/></svg>
        Reset
      </Button>
      <Dialog
        open={showResetDialog}
        title="Confirm Reset"
        message="This will clear all data including Analyze and Compare. Continue?"
        confirmLabel="Reset"
        onConfirm={confirmReset}
        onCancel={() => setShowResetDialog(false)}
      />
    </div>
  )
}
