import { usePortfolio } from '@/context/PortfolioContext'
import { getProductColor, TYPE_LABELS, resetProductColors } from '@/lib/colors'
import { fmt } from '@/lib/parser'
import styles from './ProductBreakdown.module.css'
import statsStyles from './StatsRow.module.css'

export default function ProductBreakdown() {
  const { productStats, totalCommit, state, dispatch } = usePortfolio()

  if (!state.dataLoaded || Object.keys(productStats).length === 0) return null

  resetProductColors()

  const sorted = Object.entries(productStats).sort(([an, av], [bn, bv]) => {
    const order: Record<string, number> = { trading: 0, agric: 1, std: 2 }
    const ao = order[av.type] ?? 2
    const bo = order[bv.type] ?? 2
    if (ao !== bo) return ao - bo
    return an.localeCompare(bn)
  })

  return (
    <div className={styles.wrap}>
      <div className={statsStyles.sectionLabel}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
        Product Breakdown
      </div>
      <div className={`${statsStyles.stats} ${styles.products}`}>
        {sorted.map(([name, p]) => {
          const c = getProductColor(name, p.type)
          const pct = totalCommit > 0 ? Math.round((p.commit / totalCommit) * 100) : 0
          const filterKey = `prod__${name}`
          const isActive = state.activeFilter === filterKey

          return (
            <div
              key={name}
              className={`${statsStyles.stat} ${styles.statProduct} ${isActive ? statsStyles.active : ''}`}
              onClick={() =>
                dispatch({
                  type: 'SET_ACTIVE_FILTER',
                  filter: state.activeFilter === filterKey ? 'all' : filterKey,
                })
              }
            >
              <span className={`${styles.typeBadge} ${styles[p.type]}`}>
                {TYPE_LABELS[p.type] || p.type}
              </span>
              <div className={styles.nameLabel}>{name}</div>
              <div className={styles.countValue} style={{ color: c.color }}>{p.count}</div>
              {p.overdue > 0
                ? <div className={styles.overdueText}>⚠ {p.overdueCount} overdue · GHS {fmt(p.overdue)}</div>
                : <div className={styles.noOverdue}>✓ No overdue</div>
              }
              <div className={styles.bar}>
                <div className={styles.barFill} style={{ width: `${pct}%`, background: c.color }} />
              </div>
              <div className={styles.pctLabel}>{pct}% of portfolio commit</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
