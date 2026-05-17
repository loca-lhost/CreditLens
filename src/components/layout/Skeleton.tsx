import styles from './Skeleton.module.css'

interface SkeletonProps {
  variant?: 'card' | 'table-row' | 'chart' | 'text' | 'circle'
  width?: string
  height?: string
  count?: number
}

export default function Skeleton({ variant = 'text', width, height, count = 1 }: SkeletonProps) {
  const items = Array.from({ length: count })

  if (variant === 'card') {
    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={`${styles.bar} ${styles.w40}`} />
        </div>
        <div className={styles.cardBody}>
          <div className={`${styles.bar} ${styles.w60}`} />
          <div className={`${styles.bar} ${styles.w80}`} />
          <div className={`${styles.bar} ${styles.w50}`} />
        </div>
      </div>
    )
  }

  if (variant === 'table-row') {
    return (
      <div className={styles.tableRow}>
        {items.map((_, i) => (
          <div key={i} className={`${styles.bar} ${styles.cell}`} />
        ))}
      </div>
    )
  }

  if (variant === 'chart') {
    return (
      <div className={styles.chart} style={{ width, height }}>
        <div className={styles.chartInner} />
      </div>
    )
  }

  if (variant === 'circle') {
    return (
      <div
        className={styles.circle}
        style={{ width: width || '40px', height: height || '40px' }}
      />
    )
  }

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={styles.bar}
          style={{ width: width || '100%', height: height || '16px' }}
        />
      ))}
    </>
  )
}
