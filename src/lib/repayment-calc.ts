import type { ProductType } from '@/types'
import { WORKING_DAYS_PER_MONTH, WEEKS_PER_MONTH } from './product-classifier'

export interface RepaymentResult {
  daily: number
  weekly: number
  monthly: number
  bullet: number
}

export function computeRep(
  principal: number,
  rate: number,
  termMo: number,
  type: ProductType
): RepaymentResult {
  if (principal <= 0 || termMo <= 0) return { daily: 0, weekly: 0, monthly: 0, bullet: 0 }

  const interest = principal * (rate / 100) * (termMo / 12)
  const total = principal + interest

  switch (type) {
    case 'trading':
      const mo = total / termMo
      return { daily: mo / WORKING_DAYS_PER_MONTH, weekly: mo / WEEKS_PER_MONTH, monthly: mo, bullet: 0 }

    case 'agric':
      return { daily: 0, weekly: 0, monthly: 0, bullet: total }

    case 'salary':
      return { daily: 0, weekly: 0, monthly: total / termMo, bullet: 0 }

    case 'property':
      return { daily: 0, weekly: 0, monthly: total / termMo, bullet: 0 }

    case 'vehicle':
      return { daily: 0, weekly: 0, monthly: total / termMo, bullet: 0 }

    case 'sme':
      return { daily: 0, weekly: total / termMo / WEEKS_PER_MONTH, monthly: total / termMo, bullet: 0 }

    case 'personal':
      return { daily: 0, weekly: 0, monthly: total / termMo, bullet: 0 }

    default: // 'std'
      return { daily: 0, weekly: 0, monthly: total / termMo, bullet: 0 }
  }
}
