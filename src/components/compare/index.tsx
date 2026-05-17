import { useState, useCallback, useEffect } from 'react'
import { useCompare } from '@/context/CompareContext'
import { useApp } from '@/context/AppContext'
import { parseFileContent, processRawData } from '@/lib/parser'
import { detectColumns } from '@/lib/column-detector'
import { aiColumnFallback } from '@/lib/ai/nlq'
import { fmt } from '@/lib/parser'
import { exportComparisonXLSX, getExportFilename } from '@/lib/export'
import PipelineSteps from '@/components/layout/PipelineSteps'
import LogPanel from '@/components/layout/LogPanel'
import Button from '@/components/shared/Button'
import Badge from '@/components/shared/Badge'
import EmptyState from '@/components/shared/EmptyState'
import AICard from '@/components/shared/AICard'
import Pagination from '@/components/shared/Pagination'
import { generateComparisonInsight } from '@/lib/ai/insights'
import dropStyles from '../analyze/FileDropZone.module.css'
import styles from './ComparePage.module.css'
import type { LogEntry } from '@/context/PortfolioContext'

const MAX_FILE_SIZE_MB = 10
const COMP_PAGE_SIZE = 50

const PIPELINE_STEPS = [
  { id: 'p1', label: 'Parse Baseline' },
  { id: 'p2', label: 'Parse Current' },
  { id: 'p3', label: 'Match Loans' },
  { id: 'p4', label: 'Calculate Deltas' },
  { id: 'p5', label: 'Export' },
]

const STATUS_COLORS: Record<string, string> = {
  Recovered: 'var(--green)',
  Worsening: 'var(--red)',
  Stable: 'var(--accent)',
  New: 'var(--primary)',
  Resolved: 'var(--orange)',
}

const STATUS_TRENDS: Record<string, string> = {
  Recovered: '▼ Improvement',
  Worsening: '▲ At Risk',
  Stable: '— No Change',
  New: '+ Portfolio Growth',
  Resolved: '✓ Fully Paid',
  All: 'Across Portfolio',
}

interface CompCol {
  l: string
  k: keyof import('@/types').ComparisonResult
  delta?: boolean
}

const COMP_COLS: CompCol[] = [
  { l: 'Borrower Name', k: 'name' },
  { l: 'Account No.', k: 'repAcct' },
  { l: 'Loan Type', k: 'productName' },
  { l: 'Baseline Overdue', k: 'baselineOverdue' },
  { l: 'Current Overdue', k: 'currentOverdue' },
  { l: 'Δ Arrears', k: 'overdueDelta', delta: true },
  { l: 'Prev. DPD', k: 'baselineDPD' },
  { l: 'Curr. DPD', k: 'currentDPD' },
  { l: 'Δ DPD', k: 'dpdDelta', delta: true },
  { l: 'Status', k: 'status' },
]

let _logCounter = 0

export default function ComparePage() {
  const { showToast, showSpinner, hideSpinner } = useApp()
  const {
    baseline, current, results, filter, searchTerm, pipelineSteps,
    setBaseline, setCurrent, runCompare, setFilter,
    setSearchTerm, clearCompare, getFilteredResults,
  } = useCompare()

  const [aiContent, setAiContent] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [exporting, setExporting] = useState(false)
  const [compExportFiltered, setCompExportFiltered] = useState(true)
  const [compPage, setCompPage] = useState(1)

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    setLogEntries(prev => [...prev, { message, type, id: ++_logCounter }])
  }, [])

  const generateInsight = useCallback(() => {
    if (results.length === 0) return
    setAiLoading(true)
    setAiError(null)
    setAiContent(null)
    generateComparisonInsight(
      results,
      (content) => { setAiContent(content); setAiLoading(false) },
      (msg) => { setAiError(msg); setAiLoading(false) }
    )
  }, [results])

  useEffect(() => {
    if (results.length > 0) {
      generateInsight()
    }
  }, [results.length])

  const handleFile = useCallback(async (file: File, type: 'baseline' | 'current') => {
    if (!file?.name.match(/\.(html|htm|csv)$/i)) {
      showToast('Please select an HTML or CSV file', 'fail')
      return
    }
    if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
      showToast('File too large', 'fail')
      return
    }

    showSpinner()
    const stepId = type === 'baseline' ? 'p1' : 'p2'
    addLog(`Parsing ${type} file…`, 'info')

    try {
      const parsed = await parseFileContent(file)
      let detected = detectColumns(parsed.headers)
      addLog(`Column detection: ${Object.keys(detected).length} columns mapped`, 'ok')

      detected = await aiColumnFallback(parsed.headers, detected)
      const aiCount = Object.keys(detected).length - Object.keys(detectColumns(parsed.headers)).length
      if (aiCount > 0) {
        addLog(`AI assisted: ${aiCount} additional columns mapped`, 'ok')
      }

      const result = processRawData(parsed.headers, parsed.rows, {
        log: (msg, lvl) => addLog(msg, lvl || 'info'),
        ci: detected,
      })

      if (type === 'baseline') {
        setBaseline(result.data)
      } else {
        setCurrent(result.data)
      }

      addLog(`${type === 'baseline' ? 'Baseline' : 'Current'} file loaded: ${result.data.length} records`, 'ok')
      showToast(`${result.data.length} records loaded`, 'ok')
    } catch (err) {
      addLog(err instanceof Error ? err.message : String(err), 'err')
      showToast(err instanceof Error ? err.message : String(err), 'fail')
    }
    hideSpinner()
  }, [showToast, showSpinner, hideSpinner, setBaseline, setCurrent, addLog])

  const handleRunComparison = useCallback(() => {
    runCompare()
    showToast('Comparison complete', 'ok')
  }, [runCompare, showToast])

  const handleExport = useCallback(async () => {
    if (exporting) return
    const rows = compExportFiltered ? getFilteredResults() : results
    if (!rows.length) { showToast('No data', 'fail'); return }
    const fn = getExportFilename('CreditLens_Comparison')
    setExporting(true)
    await exportComparisonXLSX(rows, fn)
    setExporting(false)
    showToast(`${rows.length} rows → ${fn}`, 'ok')
  }, [exporting, compExportFiltered, getFilteredResults, results, showToast])

  const filtered = getFilteredResults()
  const compTotalPages = Math.max(1, Math.ceil(filtered.length / COMP_PAGE_SIZE))
  const compPageSafe = Math.min(compPage, compTotalPages)
  const compStart = (compPageSafe - 1) * COMP_PAGE_SIZE
  const compSlice = filtered.slice(compStart, compStart + COMP_PAGE_SIZE)
  const bothLoaded = baseline.length > 0 && current.length > 0

  useEffect(() => { setCompPage(1) }, [filter, searchTerm])

  useEffect(() => {
    if (baseline.length > 0 && current.length > 0) {
      runCompare()
    }
  }, [baseline.length, current.length, runCompare])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Comparative Intelligence</h1>
        <p className={styles.subtitle}>Analyze recovery deltas between two portfolio snapshots.</p>
      </header>

      <div className={styles.compareGrid}>
        <div>
          <div className={styles.compareLabel}>Baseline (T-1)</div>
          <FileDropCompare label="Drop Baseline File" onFile={f => handleFile(f, 'baseline')} />
        </div>
        <div>
          <div className={styles.compareLabel}>Current (T)</div>
          <FileDropCompare label="Drop Current File" onFile={f => handleFile(f, 'current')} />
        </div>
      </div>

      {!bothLoaded && (
        <div className={styles.stepGuide}>
          {[
            { title: "Upload Baseline", desc: "Drop last month's portfolio export into the left zone (T-1)." },
            { title: "Upload Current", desc: "Drop this month's export into the right zone (T)." },
            { title: "Compare", desc: "Click Compare to see what recovered, worsened, or is new." },
          ].map((s, i) => (
            <div key={i} className={styles.stepCard}>
              <div className={styles.stepNumber}>{i + 1}</div>
              <div className={styles.stepText}>
                <strong>{s.title}</strong>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      )}

      {bothLoaded && (
        <>
          <div className={styles.steps}>
            <PipelineSteps steps={PIPELINE_STEPS} statuses={pipelineSteps} />
          </div>

          <div className={styles.statusGrid}>
            {(['Recovered', 'Worsening', 'Stable', 'New', 'Resolved', 'All'] as const).map(s => {
              const count = s === 'All' ? results.length : results.filter(r => r.status === s).length
              const isActive = filter === s
              return (
                <div
                  key={s}
                  className={`${styles.statusCard} ${isActive ? styles.active : ''}`}
                  onClick={() => setFilter(isActive ? 'All' : s)}
                >
                  <div className={styles.statusLabel}>{s === 'All' ? 'Total Impact' : s}</div>
                  <div className={styles.statusValue} style={{ color: s === 'All' ? 'var(--text)' : STATUS_COLORS[s] }}>{count}</div>
                  <div className={styles.statusTrend}>{STATUS_TRENDS[s]}</div>
                </div>
              )
            })}
          </div>

          <AICard
            content={aiContent}
            loading={aiLoading}
            error={aiError}
            onDismiss={() => { setAiContent(null); setAiError(null) }}
            onRegenerate={generateInsight}
          />

          {results.length > 0 && (
            <div className={styles.searchWrap}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by borrower name..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          )}

          <div className={styles.tableWrap}>
            <div className={styles.tableHeader}>
              <div className={styles.tableTitle}>
                <div className={styles.tableTitleBar} />
                Comparison Results
              </div>
              <span className={styles.tableCount}>{filtered.length} loans</span>
            </div>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {COMP_COLS.map(c => (
                      <th key={c.k}>{c.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compSlice.length === 0 ? (
                    <tr><td colSpan={10}><EmptyState message="No results" /></td></tr>
                  ) : (
                    compSlice.map(row => (
                      <tr key={row.repAcct || row.name}>
                        {COMP_COLS.map(c => {
                          const v = row[c.k]
                          if (c.delta) {
                            const n = typeof v === 'number' ? v : 0
                            if (n > 0) return <td key={c.k} className={styles.deltaPositive}>+{fmt(n)}</td>
                            if (n < 0) return <td key={c.k} className={styles.deltaNegative}>{fmt(n)}</td>
                            return <td key={c.k} className={styles.deltaZero}>—</td>
                          }
                          if (typeof v === 'number') {
                            if (v > 0) return <td key={c.k}>{fmt(v)}</td>
                            return <td key={c.k} className={styles.deltaZero}>—</td>
                          }
                          if (c.k === 'status') {
                            return <td key={c.k}><Badge type={(v as string).toLowerCase()}>{v as string}</Badge></td>
                          }
                          return <td key={c.k}>{v || '—'}</td>
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination
            page={compPageSafe}
            totalPages={compTotalPages}
            totalItems={filtered.length}
            pageSize={COMP_PAGE_SIZE}
            onPageChange={setCompPage}
          />

          <div className={styles.toolbar}>
            <label className={styles.exportFilterCheck}>
              <input
                type="checkbox"
                checked={compExportFiltered}
                onChange={e => setCompExportFiltered(e.target.checked)}
              />
              Export current view only
            </label>
            <Button variant="primary" onClick={handleExport} disabled={exporting}>
              Export Comparison
              <span className={styles.toolbarCount}>{filtered.length}</span>
            </Button>
            <Button variant="danger" onClick={clearCompare}>Reset</Button>
          </div>
        </>
      )}

      <LogPanel entries={logEntries} />
    </div>
  )
}

function FileDropCompare({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length) onFile(e.dataTransfer.files[0])
  }

  return (
    <div
      className={`${dropStyles.dz} ${dropStyles.small}`}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.html,.htm,.csv'
        input.onchange = () => { if (input.files?.[0]) onFile(input.files[0]) }
        input.click()
      }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click() } }}
      role="button"
      tabIndex={0}
    >
      <div className={dropStyles.smallTitle}>{label}</div>
      <div className={dropStyles.smallSub}>or <b>browse</b></div>
    </div>
  )
}
