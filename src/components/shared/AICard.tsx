import { useState, useEffect } from 'react'
import styles from './AICard.module.css'

const AI_SPARK_SVG = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2l2.09 6.26L20.18 10l-6.09 1.74L12 18l-2.09-6.26L3.82 10l6.09-1.74L12 2z" strokeLinecap="round"/>
  </svg>
)

interface AICardProps {
  content: string | null
  loading?: boolean
  error?: string | null
  onDismiss?: () => void
  onRegenerate?: () => void
}

export default function AICard({ content, loading, error, onDismiss, onRegenerate }: AICardProps) {
  const [minutes, setMinutes] = useState(0)

  useEffect(() => {
    if (!content) return
    setMinutes(0)
    const interval = setInterval(() => setMinutes(m => m + 1), 60000)
    return () => clearInterval(interval)
  }, [content])

  if (!content && !loading && !error) return null

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span style={{ color: error ? 'var(--red)' : 'var(--primary)' }}>{AI_SPARK_SVG}</span>
        <span style={{ color: error ? 'var(--red)' : undefined }}>
          {loading ? 'Generating Intelligence...' : error ? 'Analysis Failed' : 'AI Intelligence Insight'}
        </span>
      </div>

      {loading && <div className={styles.skeleton} />}

      {error && <div className={styles.error}>{error}</div>}

      {content && !loading && !error && (
        <>
          <div className={styles.body}>{content}</div>
          <div className={styles.footer}>
            <span className={styles.timestamp}>
              {minutes === 0 ? 'Just now' : minutes === 1 ? '1 min ago' : `${minutes} mins ago`}
            </span>
            {onDismiss || onRegenerate ? (
              <div>
                {onRegenerate && (
                  <button className={styles.actionBtn} onClick={onRegenerate}>Regenerate</button>
                )}
                {onDismiss && (
                  <button className={styles.actionBtn} onClick={onDismiss}>Dismiss</button>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
