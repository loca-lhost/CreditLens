import { useState, useCallback } from 'react'
import type { Loan, ColumnDef } from '@/types'
import { usePortfolio, BUILTIN_COLS } from '@/context/PortfolioContext'
import { getDPDBand } from '@/lib/filters'
import { fmt } from '@/lib/parser'
import { generateXLSX } from '@/lib/export'
import Drawer from '@/components/layout/Drawer'
import Badge from '@/components/shared/Badge'
import EmptyState from '@/components/shared/EmptyState'
import ContextMenu from '@/components/shared/ContextMenu'
import Pagination from '@/components/shared/Pagination'
import styles from './LoanTable.module.css'

const PAGE_SIZE = 50

const COL_DESCRIPTIONS: Record<string, string> = {
  name: 'Borrower full name',
  repAcct: 'Repayment account number',
  productName: 'Loan product type',
  openingDate: 'Date loan was disbursed',
  maturityDate: 'Loan end date',
  termMo: 'Loan term in months',
  commit: 'Total loan amount',
  rate: 'Annual interest rate',
  overdue: 'Outstanding arrears amount',
  dpd: 'Days past due',
  daysToNext: 'Days until next instalment',
  officer: 'Assigned loan officer',
  daily: 'Daily repayment amount',
  weekly: 'Weekly repayment amount',
  monthly: 'Monthly repayment amount',
  bullet: 'Bullet (lump sum) payment',
}

function getCellValue(row: Loan, key: string): string | number {
  return (row as unknown as Record<string, string | number>)[key] ?? ''
}

export default function LoanTable() {
  const { state, dispatch, filteredLoans } = usePortfolio()
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null)

  const colsToShow = state.columns.filter(c => state.visibleCols.has(c.k))
  const totalPages = Math.max(1, Math.ceil(filteredLoans.length / PAGE_SIZE))
  const page = Math.min(state.page, totalPages)
  const start = (page - 1) * PAGE_SIZE
  const slice = filteredLoans.slice(start, start + PAGE_SIZE)

  const handleSort = useCallback((col: ColumnDef) => {
    if (state.sortCol === col.k) {
      dispatch({ type: 'SET_SORT', col: col.k, asc: !state.sortAsc })
    } else {
      dispatch({ type: 'SET_SORT', col: col.k, asc: true })
    }
  }, [state.sortCol, state.sortAsc, dispatch])

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
    }
  }, [])

  const handleExportRow = useCallback(async (row: Loan) => {
    generateXLSX([row], `CreditLens_${row.repAcct || row.name}_${Date.now()}.xlsx`)
  }, [])

  if (!state.dataLoaded) return null

  return (
    <>
      <div className={styles.pw}>
        <div className={styles.ph}>
          <div className={styles.pt}><div className={styles.ptb} />Loan Portfolio</div>
          <span className={styles.rl}>{filteredLoans.length} rows</span>
        </div>
        <div className={styles.ts}>
          <table className={styles.tbl}>
            <thead>
              <tr>
                {colsToShow.map(col => (
                  <th key={col.k} title={COL_DESCRIPTIONS[col.k] || col.l} onClick={() => handleSort(col)}>
                    {col.l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={colsToShow.length || 1}>
                    <EmptyState
                      message="No matching records found."
                      hint="Try adjusting your filters."
                    />
                  </td>
                </tr>
              ) : (
                slice.map((row, i) => {
                  const band = getDPDBand(row.dpd)
                  const loanAnomalies = state.anomalies.filter(
                    a => a.id === (row.applId || row.repAcct || row.name)
                  )

                  const ctxItems = [
                    { label: 'View Details', action: () => setSelectedLoan(row) },
                    { label: 'Copy Account No.', action: () => handleCopy(row.repAcct || '') },
                    { label: 'Copy Name', action: () => handleCopy(row.name) },
                    { label: 'Export This Row', action: () => handleExportRow(row) },
                  ]

                  return (
                    <ContextMenu key={row.applId || row.repAcct || `${row.name}-${i}`} items={ctxItems}>
                      <tr
                        {...(band ? { 'data-dpd-band': band } : {})}
                        onClick={() => setSelectedLoan(row)}
                      >
                        {colsToShow.map(col => {
                          if (col.k.startsWith('dyn_')) {
                            const idx = parseInt(col.k.split('_')[1])
                            return (
                              <td key={col.k} className={styles.mn}>
                                {row._cells?.[idx] || ''}
                              </td>
                            )
                          }

                          const v = getCellValue(row, col.k)

                          if (col.daysCol) {
                            const n = typeof v === 'number' ? v : null
                            if (n === null || v === undefined) {
                              return <td key={col.k} className={styles.dash}>—</td>
                            }
                            if (n < 0) {
                              return <td key={col.k} style={{ color: 'var(--red)', fontWeight: 700 }}>{Math.abs(n)}d overdue</td>
                            }
                            if (n === 0) {
                              return <td key={col.k} style={{ color: 'var(--red)', fontWeight: 700 }}>Today</td>
                            }
                            if (n <= 7) {
                              return <td key={col.k} style={{ color: 'var(--orange)', fontWeight: 600 }}>{n}d</td>
                            }
                            return <td key={col.k} className={styles.mn}>{n}d</td>
                          }

                          if (col.badge) {
                            return <td key={col.k}><Badge type={row.type}>{String(v || '—')}</Badge></td>
                          }

                          if (col.num) {
                            const n = typeof v === 'number' ? v : 0
                            if (n > 0) return <td key={col.k} className={styles[col.cls || '']}>{fmt(n)}</td>
                            return <td key={col.k} className={styles.dash}>—</td>
                          }

                          if (col.k === 'name') {
                            return (
                              <td key={col.k} className={styles.mn}>
                                {v || '—'}
                                {loanAnomalies.length > 0 && (
                                  <span className={styles.anomalyBadge} title={loanAnomalies.map(a => a.desc).join(' | ')}>
                                    {loanAnomalies.length > 1 ? loanAnomalies.length : '⚠'}
                                  </span>
                                )}
                              </td>
                            )
                          }

                          return <td key={col.k} className={styles[col.cls || 'mn']}>{v || '—'}</td>
                        })}
                      </tr>
                    </ContextMenu>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={filteredLoans.length}
          pageSize={PAGE_SIZE}
          onPageChange={p => dispatch({ type: 'SET_PAGE', page: p })}
        />
      </div>
      <Drawer loan={selectedLoan} onClose={() => setSelectedLoan(null)} />
    </>
  )
}
