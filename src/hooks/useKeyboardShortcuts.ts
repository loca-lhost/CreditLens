import { useEffect } from 'react'

interface ShortcutOptions {
  onSearchFocus?: () => void
  onExport?: () => void
  onNavigate?: (page: string) => void
  onShowShortcuts?: () => void
}

export function useKeyboardShortcuts({ onSearchFocus, onExport, onNavigate, onShowShortcuts }: ShortcutOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const mod = isMac ? e.metaKey : e.ctrlKey

      if (mod && e.key === 'k') {
        e.preventDefault()
        onSearchFocus?.()
      }

      if (mod && e.key === 'e') {
        e.preventDefault()
        onExport?.()
      }

      if (e.key === '?' && !mod) {
        onShowShortcuts?.()
      }

      if (e.altKey && e.key === '1') {
        e.preventDefault()
        onNavigate?.('landing')
      }

      if (e.altKey && e.key === '2') {
        e.preventDefault()
        onNavigate?.('analyze')
      }

      if (e.altKey && e.key === '3') {
        e.preventDefault()
        onNavigate?.('compare')
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onSearchFocus, onExport, onNavigate, onShowShortcuts])
}
