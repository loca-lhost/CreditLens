import type { Loan, ScheduleData, ScheduleGroup } from '@/types'
import { daysBetween } from './date-utils'

export function getDPDPriority(dpd: number): { label: string; cls: string } {
  if (dpd > 90) return { label: 'Critical', cls: 'critical' }
  if (dpd > 30) return { label: 'High', cls: 'high' }
  return { label: 'Medium', cls: 'medium' }
}

export function generateSchedule(loans: Loan[]): ScheduleData {
  const now = new Date()

  const postDisb: ScheduleGroup[] = []
  const recovery: ScheduleGroup[] = []
  const urgentMat: ScheduleGroup[] = []
  const routine: ScheduleGroup[] = []

  loans.forEach(r => {
    const daysSinceOpen = daysBetween(r.openingDate, now)
    const daysToMat = r.maturityDate ? -(daysBetween(r.maturityDate, now) ?? 0) : null

    if (r.commit >= 10000 && daysSinceOpen !== null && daysSinceOpen >= 7 && daysSinceOpen <= 45) {
      postDisb.push({
        name: r.name, repAcct: r.repAcct, productName: r.productName,
        commit: r.commit, overdue: r.overdue, dpd: r.dpd,
        openingDate: r.openingDate, maturityDate: r.maturityDate,
        daysSinceOpen, daysToMat: 0, priority: '', priorityCls: '', type: r.type,
      })
    }

    if (r.overdue > 0) {
      const p = getDPDPriority(r.dpd)
      recovery.push({
        name: r.name, repAcct: r.repAcct, productName: r.productName,
        commit: r.commit, overdue: r.overdue, dpd: r.dpd,
        openingDate: r.openingDate, maturityDate: r.maturityDate,
        daysSinceOpen: daysSinceOpen ?? 0, daysToMat: 0,
        priority: p.label, priorityCls: p.cls, type: r.type,
      })
    }

    if (daysToMat !== null && daysToMat >= 0 && daysToMat <= 7 && r.overdue <= 0) {
      urgentMat.push({
        name: r.name, repAcct: r.repAcct, productName: r.productName,
        commit: r.commit, overdue: r.overdue, dpd: r.dpd,
        openingDate: r.openingDate, maturityDate: r.maturityDate,
        daysSinceOpen: daysSinceOpen ?? 0, daysToMat, priority: '', priorityCls: '', type: r.type,
      })
    }

    if (daysToMat !== null && daysToMat > 7 && daysToMat <= 30 && r.overdue <= 0) {
      routine.push({
        name: r.name, repAcct: r.repAcct, productName: r.productName,
        commit: r.commit, overdue: r.overdue, dpd: r.dpd,
        openingDate: r.openingDate, maturityDate: r.maturityDate,
        daysSinceOpen: daysSinceOpen ?? 0, daysToMat, priority: '', priorityCls: '', type: r.type,
      })
    }
  })

  postDisb.sort((a, b) => a.daysSinceOpen - b.daysSinceOpen)
  recovery.sort((a, b) => b.dpd - a.dpd)
  urgentMat.sort((a, b) => a.daysToMat - b.daysToMat)
  routine.sort((a, b) => a.daysToMat - b.daysToMat)

  return { postDisb, recovery, urgentMat, routine }
}
