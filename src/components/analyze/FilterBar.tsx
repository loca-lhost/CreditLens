import { useState, useCallback, useRef, useEffect } from 'react'
import { usePortfolio, BUILTIN_COLS } from '@/context/PortfolioContext'
import { useApp } from '@/context/AppContext'
import { parseNaturalQuery } from '@/lib/ai/nlq'
import { getProductColor } from '@/lib/colors'
import FilterPill from '@/components/shared/FilterPill'
import styles from './FilterBar.module.css'

export default function FilterBar() {
  const { state, dispatch, filteredLoans, productStats } = usePortfolio()
  const { showToast } = useApp()
  const [nlqText, setNlqText] = useState('')
  const [nlqLoading, setNlqLoading] = useState(false)
  const [colDropdownOpen, setColDropdownOpen] = useState(false)
  const colRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colRef.current && !colRef.current.contains(e.target as Node)) {
        setColDropdownOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_SEARCH', term: e.target.value })
  }, [dispatch])

  const handleProductChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({ type: 'SET_PRODUCT', product: e.target.value })
  }, [dispatch])

  const handleNLQ = useCallback(async () => {
    if (!nlqText.trim()) return
    setNlqLoading(true)
    try {
      const filters = await parseNaturalQuery(nlqText)
      if (filters) {
        dispatch({ type: 'SET_NLQ_FILTERS', filters })
        showToast('AI filter applied', 'ok')
      }
    } catch (e) {
      showToast((e as Error).message || 'Could not parse query', 'fail')
    } finally {
      setNlqLoading(false)
    }
  }, [nlqText, dispatch, showToast])

  const toggleMaturity = useCallback(() => {
    dispatch({ type: 'TOGGLE_MATURITY' })
  }, [dispatch])

  const dueSoonCount = state.loans.filter(
    r => r.daysToNext !== null && r.daysToNext >= 0 && r.daysToNext <= 7
  ).length

  const toggleDueWeek = useCallback(() => {
    dispatch({
      type: 'SET_ACTIVE_FILTER',
      filter: state.activeFilter === '__due7' ? 'all' : '__due7',
    })
  }, [dispatch, state.activeFilter])

  const toggleAnomaly = useCallback(() => {
    dispatch({ type: 'TOGGLE_ANOMALY' })
  }, [dispatch])

  const clearAllFilters = useCallback(() => {
    dispatch({ type: 'SET_SEARCH', term: '' })
    dispatch({ type: 'SET_PRODUCT', product: '__ALL__' })
    dispatch({ type: 'SET_ACTIVE_FILTER', filter: 'all' })
    dispatch({ type: 'SET_NLQ_FILTERS', filters: {
      product: null, minCommit: null, maxCommit: null, minDPD: null, maxDPD: null,
      overdueOnly: false, maturityDays: null, maturityMonths: null,
      maturityThisMonth: false, maturityNextMonth: false,
      minOverdue: null, maxOverdue: null, officer: null,
      maxDaysToNext: null, instalmentOverdue: false,
      openedAfter: null, openedBefore: null, loanClass: null, borrowerName: null,
    }})
    dispatch({ type: 'SET_OFFICER_FILTER', officer: '' })
    setNlqText('')
  }, [dispatch])

  const hasActiveFilters = state.searchTerm || state.activeFilter !== 'all' ||
    state.selectedProduct !== '__ALL__' || state.approachingMaturity ||
    state.anomalyFilter || state.officerFilter ||
    Object.values(state.nlqFilters).some(v => v !== null && v !== false)

  const officerOptions = [...new Set(state.loans.map(r => r.officer || '').filter(Boolean))].sort()

  const builtinKeys = BUILTIN_COLS.map(c => c.k)

  const byProd: Record<string, number> = {}
  filteredLoans.forEach(r => {
    const k = r.productName || 'Unknown'
    byProd[k] = (byProd[k] || 0) + 1
  })
  const prodParts = Object.entries(byProd)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, cnt]) => {
      const meta = productStats[name]
      const col = meta ? getProductColor(name, meta.type).color : 'var(--text-faint)'
      return `<span style="color:${col}">${cnt} ${name}</span>`
    })

  return (
    <div className={styles.fb}>
      <div className={styles.fbh}>
        <div className={styles.fbt}>
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x=".5" y=".5" width="11" height="11" rx="2.5" stroke="currentColor"/><path d="M3 6h6M3 4h6M3 8h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/></svg>
          Filter & Search
        </div>
        <input
          type="text"
          className={styles.fsi}
          placeholder="Search by name, account, product, or officer..."
          value={state.searchTerm}
          onChange={handleSearch}
        />
        <div className={styles.nlqWrap}>
          <span className={styles.nlqPrefix}>✦ AI</span>
          <input
            type="text"
            className={styles.nlqInput}
            placeholder="e.g. 'salary loans with arrears above 5000'"
            value={nlqText}
            onChange={e => setNlqText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleNLQ()}
          />
          <button
            className={`${styles.nlqBtn} ${nlqLoading ? styles.loading : ''}`}
            onClick={handleNLQ}
            disabled={nlqLoading}
          >
            <span className={styles.nlqSpinner} />
            <span className={styles.nlqLabel}>Filter</span>
          </button>
        </div>
        <select className={styles.fselect} value={state.selectedProduct} onChange={handleProductChange}>
          <option value="__ALL__">All Loan Types</option>
          {Object.keys(state.meta).sort().map(name => (
            <option key={name} value={name}>{name} ({state.meta[name].count})</option>
          ))}
        </select>
        {officerOptions.length > 0 && (
          <select
            className={styles.fselect}
            value={state.officerFilter}
            onChange={e => dispatch({ type: 'SET_OFFICER_FILTER', officer: e.target.value })}
          >
            <option value="">All Officers</option>
            {officerOptions.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        )}
      </div>

      <div className={styles.fps}>
        <FilterPill active={state.approachingMaturity} onClick={toggleMaturity}>
          Maturity ≤30d & Overdue
        </FilterPill>
        {dueSoonCount > 0 && (
          <FilterPill active={state.activeFilter === '__due7'} onClick={toggleDueWeek} count={dueSoonCount}>
            Due ≤7 Days
          </FilterPill>
        )}
        {state.anomalies.length > 0 && (
          <FilterPill active={state.anomalyFilter} onClick={toggleAnomaly} count={state.anomalies.length}>
            Anomalies
          </FilterPill>
        )}
        {hasActiveFilters && (
          <button className={styles.clearAllBtn} onClick={clearAllFilters}>
            Clear All
          </button>
        )}
      </div>

      <div className={styles.fsum}>
        Showing <span className={styles.fn}>{filteredLoans.length}</span> of{' '}
        <span className={styles.fn}>{state.loans.length}</span> borrowers ·{' '}
        <span dangerouslySetInnerHTML={{ __html: prodParts.join(' · ') || '—' }} />
      </div>
    </div>
  )
}
