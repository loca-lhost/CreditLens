import type { ReactNode } from 'react'
import styles from './EmptyState.module.css'

interface EmptyStateProps {
  message: string
  hint?: string
  action?: ReactNode
}

export default function EmptyState({ message, hint, action }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.3}>
        <circle cx="11" cy="11" r="8"/>
        <path d="m21 21-4.35-4.35M11 8v3M11 14h.01"/>
      </svg>
      <div className={styles.text}>
        <strong>{message}</strong>
        {hint && <><br/><span style={{ opacity: 0.7 }}>{hint}</span></>}
      </div>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  )
}
