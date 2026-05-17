import type { ReactNode } from 'react'
import styles from './Tooltip.module.css'

interface TooltipProps {
  text: string
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  return (
    <span className={styles.wrapper}>
      {children}
      <span className={`${styles.tip} ${styles[position]}`}>{text}</span>
    </span>
  )
}
