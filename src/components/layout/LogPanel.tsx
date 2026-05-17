import { useState } from 'react'
import type { LogEntry } from '@/context/PortfolioContext'
import styles from './LogPanel.module.css'

interface LogPanelProps {
  entries: LogEntry[]
}

export default function LogPanel({ entries }: LogPanelProps) {
  const [collapsed, setCollapsed] = useState(true)

  return (
    <div className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header} onClick={() => setCollapsed(!collapsed)}>
        <span>Activity Log</span>
        <span>
          {entries.length} entries
          <span className={styles.arrow}>▾</span>
        </span>
      </div>
      <div className={styles.body}>
        {entries.map(entry => (
          <div key={entry.id} className={styles[entry.type]}>{entry.message}</div>
        ))}
        {entries.length === 0 && <div className={styles.info}>No entries</div>}
      </div>
    </div>
  )
}
