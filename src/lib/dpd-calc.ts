import type { ProductType } from '@/types'
import { countWorkingDays } from './date-utils'
import { WEEKS_PER_MONTH } from './product-classifier'

export function calculateDPD(
  openingDate: string | null,
  maturityDate: string | null,
  overdue: number,
  type: ProductType,
  daily: number,
  monthly: number,
  _termMo: number
): number {
  if (overdue <= 0 || !openingDate) return 0

  const opening = new Date(openingDate)
  if (isNaN(opening.getTime())) return 0

  const today = new Date()

  // Grace period: repayment starts one month after opening
  const repaymentStart = new Date(opening)
  repaymentStart.setMonth(repaymentStart.getMonth() + 1)
  if (today < repaymentStart) return 0

  if (type === 'trading') {
    const workingDaysSinceStart = countWorkingDays(repaymentStart, today)
    if (daily > 0) {
      const estimatedWorkingDays = Math.round(overdue / daily)
      return Math.min(workingDaysSinceStart, estimatedWorkingDays)
    }
    return workingDaysSinceStart
  }

  if (type === 'agric') {
    if (!maturityDate) return 0
    const maturity = new Date(maturityDate)
    if (isNaN(maturity.getTime())) return 0
    const daysPast = Math.ceil((today.getTime() - maturity.getTime()) / (1000 * 60 * 60 * 24))
    return daysPast > 0 ? daysPast : 0
  }

  if (type === 'sme') {
    const weeklyRep = monthly / WEEKS_PER_MONTH
    if (weeklyRep > 0) {
      const weeksOverdue = overdue / weeklyRep
      const workingDays = countWorkingDays(repaymentStart, today)
      return Math.min(workingDays, Math.round(weeksOverdue * 5))
    }
  }

  // salary, property, vehicle, personal, std — calendar-day monthly repayment
  if (monthly > 0) {
    const monthsOverdue = overdue / monthly
    const estimatedDays = Math.round(monthsOverdue * 30)
    const daysSinceStart = Math.ceil((today.getTime() - repaymentStart.getTime()) / (1000 * 60 * 60 * 24))
    return Math.min(daysSinceStart, estimatedDays)
  }

  return Math.ceil((today.getTime() - repaymentStart.getTime()) / (1000 * 60 * 60 * 24))
}
