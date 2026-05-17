import styles from './PipelineSteps.module.css'

interface PipelineStep {
  id: string
  label: string
}

interface PipelineStepsProps {
  steps: PipelineStep[]
  statuses: Record<string, string>
}

export default function PipelineSteps({ steps, statuses }: PipelineStepsProps) {
  return (
    <div className={styles.pipeline}>
      {steps.map((step, i) => {
        const status = statuses[step.id] || ''
        return (
          <div key={step.id} className={`${styles.step} ${styles[status] || ''}`}>
            <span className={styles.dot} />
            {String(i + 1).padStart(2, '0')} {step.label}
          </div>
        )
      })}
    </div>
  )
}
