import type { Loan, ComparisonResult } from '@/types'

export function getLoanKey(loan: Loan): string {
  if (loan.applId && loan.applId.trim()) return `${loan.applId.trim()}|${loan.name}`
  if (loan.repAcct && loan.repAcct.trim()) return loan.repAcct.trim()
  return `${loan.name || ''}||${loan.productName || ''}`
}

export function runComparison(
  baseline: Loan[],
  current: Loan[]
): ComparisonResult[] {
  const results: ComparisonResult[] = []

  const baselineMap = new Map<string, Loan>()
  baseline.forEach(l => baselineMap.set(getLoanKey(l), l))

  const currentMap = new Map<string, Loan>()
  current.forEach(l => currentMap.set(getLoanKey(l), l))

  const allKeys = new Set([...baselineMap.keys(), ...currentMap.keys()])

  allKeys.forEach(key => {
    const b = baselineMap.get(key)
    const c = currentMap.get(key)

    if (!b) {
      results.push({
        name: c!.name, repAcct: c!.repAcct, productName: c!.productName,
        baselineOverdue: 0, currentOverdue: c!.overdue, overdueDelta: c!.overdue,
        baselineDPD: 0, currentDPD: c!.dpd, dpdDelta: c!.dpd,
        status: 'New',
      })
    } else if (!c) {
      results.push({
        name: b.name, repAcct: b.repAcct, productName: b.productName,
        baselineOverdue: b.overdue, currentOverdue: 0, overdueDelta: -b.overdue,
        baselineDPD: b.dpd, currentDPD: 0, dpdDelta: -b.dpd,
        status: 'Resolved',
      })
    } else {
      const overdueDelta = c.overdue - b.overdue
      const dpdDelta = c.dpd - b.dpd
      let status: ComparisonResult['status'] = 'Stable'

      if (overdueDelta < 0 || dpdDelta < 0 || (b.overdue > 0 && c.overdue === 0)) {
        status = 'Recovered'
      } else if (overdueDelta > 0 || dpdDelta > 0 || (b.overdue === 0 && c.overdue > 0)) {
        status = 'Worsening'
      }

      results.push({
        name: b.name, repAcct: b.repAcct, productName: b.productName,
        baselineOverdue: b.overdue, currentOverdue: c.overdue, overdueDelta,
        baselineDPD: b.dpd, currentDPD: c.dpd, dpdDelta,
        status,
      })
    }
  })

  return results
}
