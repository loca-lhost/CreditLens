import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import styles from './ContextMenu.module.css'

interface ContextMenuItem {
  label: string
  icon?: ReactNode
  action: () => void
  danger?: boolean
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  children: ReactNode
}

export default function ContextMenu({ items, children }: ContextMenuProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setPos(null), [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close()
      }
    }
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [close])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPos({ x: e.clientX, y: e.clientY })
  }, [])

  const handleAction = useCallback((action: () => void) => {
    action()
    close()
  }, [close])

  return (
    <div onContextMenu={handleContextMenu}>
      {children}
      {pos && (
        <div
          ref={menuRef}
          className={styles.menu}
          style={{ left: pos.x, top: pos.y }}
        >
          {items.map((item, i) => (
            <button
              key={i}
              className={`${styles.item} ${item.danger ? styles.danger : ''}`}
              onClick={() => handleAction(item.action)}
            >
              {item.icon && <span className={styles.icon}>{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
