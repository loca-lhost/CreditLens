import { useState, useCallback, useEffect } from 'react'
import { usePortfolio } from '@/context/PortfolioContext'
import FileDropZone from './FileDropZone'
import PipelineSteps from '@/components/layout/PipelineSteps'
import StatsRow from './StatsRow'
import ProductBreakdown from './ProductBreakdown'
import LogPanel from '@/components/layout/LogPanel'
import FilterBar from './FilterBar'
import LoanTable from './LoanTable'
import Toolbar from './Toolbar'
import BulkImport from './BulkImport'
import ScheduleSection from './ScheduleSection'
import AICard from '@/components/shared/AICard'
import { generatePortfolioInsight } from '@/lib/ai/insights'
import styles from './AnalyzePage.module.css'

const PIPELINE_STEPS = [
  { id: 'p1', label: 'Reading File' },
  { id: 'p2', label: 'Borrower Names' },
  { id: 'p3', label: 'Loan Terms' },
  { id: 'p4', label: 'Repayments' },
  { id: 'p5', label: 'Arrears' },
  { id: 'p6', label: 'Export' },
]

export default function AnalyzePage() {
  const { state } = usePortfolio()
  const [aiContent, setAiContent] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)

  const generateInsight = useCallback(() => {
    setAiLoading(true)
    setAiError(null)
    setAiContent(null)
    generatePortfolioInsight(
      state.loans,
      (content) => { setAiContent(content); setAiLoading(false) },
      (msg) => { setAiError(msg); setAiLoading(false) }
    )
  }, [state.loans])

  useEffect(() => {
    if (state.dataLoaded && state.loans.length > 0) {
      generateInsight()
    }
  }, [state.dataLoaded, state.loans.length])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Portfolio Intelligence</h1>
        <p className={styles.subtitle}>Securely analyse your loan portfolio from your EM system export.</p>
      </header>

      <FileDropZone />

      {state.dataLoaded && (
        <>
          <PipelineSteps steps={PIPELINE_STEPS} statuses={state.pipelineSteps} />
          <StatsRow />
          <ProductBreakdown />
          <AICard
            content={aiContent}
            loading={aiLoading}
            error={aiError}
            onDismiss={() => { setAiContent(null); setAiError(null) }}
            onRegenerate={generateInsight}
          />
          <LogPanel entries={state.logEntries} />
          <FilterBar />
          <LoanTable />
          <Toolbar onBulkImport={() => setBulkOpen(true)} />
          <BulkImport open={bulkOpen} onClose={() => setBulkOpen(false)} />
          <ScheduleSection />
        </>
      )}
    </div>
  )
}
