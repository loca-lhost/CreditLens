import type { Loan, Anomaly } from '@/types'
import { fmt } from './parser'

export function detectAnomalies(loans: Loan[]): Anomaly[] {
  const anomalies: Anomaly[] = []
  const today = new Date()

  loans.forEach(r => {
    const id = r.applId || r.repAcct || r.name
    const ratio = r.commit > 0 ? r.overdue / r.commit : 0

    if (ratio > 0.5) {
      anomalies.push({ id, type: 'high_overdue_ratio', desc: `Overdue ${(ratio * 100).toFixed(0)}% of commitment` })
    }
    if (r.dpd > 180) {
      anomalies.push({ id, type: 'extreme_dpd', desc: `DPD ${r.dpd} days` })
    }
    if (r.commit < 5000 && r.overdue > 10000) {
      anomalies.push({ id, type: 'small_commit_high_overdue', desc: `GHS ${fmt(r.commit)} commit, GHS ${fmt(r.overdue)} overdue` })
    }
    if (r.maturityDate) {
      const mat = new Date(r.maturityDate)
      const daysPast = Math.ceil((today.getTime() - mat.getTime()) / (1000 * 60 * 60 * 24))
      if (daysPast > 90) {
        anomalies.push({ id, type: 'maturity_past_due', desc: `Maturity ${daysPast} days past due` })
      }
    }
    if (!r.commit || r.commit === 0) {
      anomalies.push({ id, type: 'zero_commitment', desc: 'Commitment amount is zero or missing' })
    }
  })

  return anomalies
}
