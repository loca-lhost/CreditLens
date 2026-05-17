import { useApp } from '@/context/AppContext'
import styles from './Spinner.module.css'

export default function Spinner() {
  const { loading } = useApp()
  if (!loading) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.ring} />
    </div>
  )
}
