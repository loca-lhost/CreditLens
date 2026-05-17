import type { ReactNode } from 'react'
import styles from './Dialog.module.css'
import Button from '@/components/shared/Button'

interface DialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
  children?: ReactNode
}

export default function Dialog({
  open, title, message,
  confirmLabel = 'Confirm', onConfirm, onCancel, children,
}: DialogProps) {
  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.content} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>{title}</h3>
          <button className={styles.close} onClick={onCancel}>✕</button>
        </div>
        <div className={styles.message}>{message}</div>
        {children}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}
