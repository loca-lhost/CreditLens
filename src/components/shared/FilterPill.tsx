import type { ReactNode } from 'react'
import styles from './FilterPill.module.css'

interface FilterPillProps {
  active: boolean
  onClick: () => void
  count?: number
  children: ReactNode
}

export default function FilterPill({ active, onClick, count, children }: FilterPillProps) {
  return (
    <div className={`${styles.pill} ${active ? styles.on : ''}`} onClick={onClick}>
      <span className={styles.check}>
        <svg className={styles.checkIcon} width="8" height="8" viewBox="0 0 8 8">
          <path d="M1.5 4l2 2 3-3" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      {children}
      {count !== undefined && ` (${count})`}
    </div>
  )
}
