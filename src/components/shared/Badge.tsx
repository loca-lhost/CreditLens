import styles from './Badge.module.css'

type BadgeType =
  | 'trading' | 'agric' | 'salary' | 'property' | 'vehicle' | 'sme' | 'personal' | 'std'
  | 'recovered' | 'worsening' | 'stable' | 'new' | 'resolved'

interface BadgeProps {
  type: BadgeType | string
  children: string
}

export default function Badge({ type, children }: BadgeProps) {
  const cls = `${styles.badge} ${styles[type.toLowerCase()] || ''}`
  return <span className={cls}>{children}</span>
}
