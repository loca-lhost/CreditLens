import styles from './Skeleton.module.css'

interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'card'
  width?: string | number
  height?: string | number
  lines?: number
}

export default function Skeleton({ variant = 'text', width, height, lines = 1 }: SkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={styles.card}>
        <div className={`${styles.line} ${styles.w60}`} />
        <div className={`${styles.line} ${styles.w100}`} />
        <div className={`${styles.line} ${styles.w80}`} />
      </div>
    )
  }

  if (lines > 1) {
    return (
      <div className={styles.multi}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${styles.line} ${variant === 'rect' ? styles.rect : ''}`}
            style={{
              width: width ?? (i === lines - 1 ? '60%' : undefined),
              height: height,
            }}
          />
        ))}
      </div>
    )
  }

  const cls = [
    styles.line,
    variant === 'circle' ? styles.circle : '',
    variant === 'rect' ? styles.rect : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cls}
      style={{ width, height }}
    />
  )
}
