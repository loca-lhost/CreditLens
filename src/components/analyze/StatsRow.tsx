import { usePortfolio } from '@/context/PortfolioContext'
import { fmt } from '@/lib/parser'
import Tooltip from '@/components/shared/Tooltip'
import styles from './StatsRow.module.css'

export default function StatsRow() {
  const { state, stats, dispatch } = usePortfolio()

  const cards = [
    {
      filter: 'all',
      label: 'Total Loans',
      value: stats.total.toString(),
      className: styles.cv,
      sub: null,
      tooltip: 'Total number of active loans in portfolio',
    },
    {
      filter: 'overdue',
      label: 'Accounts in Arrears',
      value: stats.overdueCount.toString(),
      className: styles.dv,
      sub: `GHS ${fmt(stats.totalOverdue)}`,
      tooltip: `${stats.overdueCount} accounts with overdue payments totaling GHS ${fmt(stats.totalOverdue)}`,
    },
    {
      filter: 'dpd',
      label: 'Avg. Days Overdue',
      value: stats.avgDPD > 0 ? String(stats.avgDPD) : '—',
      className: styles.dv,
      sub: null,
      tooltip: 'Average days past due across all overdue accounts',
    },
  ]

  return (
    <div className={styles.stats}>
      {cards.map(card => (
        <Tooltip key={card.filter} text={card.tooltip} position="bottom">
          <div
            className={`${styles.stat} ${state.activeFilter === card.filter ? styles.active : ''}`}
            onClick={() => dispatch({
              type: 'SET_ACTIVE_FILTER',
              filter: state.activeFilter === card.filter ? 'all' : card.filter,
            })}
          >
            <div className={styles.label}>{card.label}</div>
            <div className={`${styles.value} ${card.className}`}>{card.value}</div>
            {card.sub && <div className={styles.sub}>{card.sub}</div>}
          </div>
        </Tooltip>
      ))}
    </div>
  )
}
