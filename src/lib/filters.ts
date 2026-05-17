import type { Loan, NLQFilters, ProductStats } from '@/types'
import { getProductColor } from './colors'

export function getDPDBand(dpd: number): string {
  if (dpd <= 0) return ''
  if (dpd <= 30) return 'low'
  if (dpd <= 90) return 'med'
  if (dpd <= 180) return 'high'
  return 'critical'
}

export function getLoanClass(dpd: number): string {
  if (!dpd || dpd <= 0) return 'Current'
  if (dpd <= 30) return 'OLEM'
  if (dpd <= 90) return 'Substandard'
  if (dpd <= 180) return 'Doubtful'
  return 'Loss'
}

export function buildAggregateStats(data: Loan[]) {
  const stats = {
    total: data.length,
    trading: 0, agric: 0, std: 0,
    overdueCount: 0, totalOverdue: 0,
    totalCommit: 0, avgDPD: 0,
    products: {} as Record<string, ProductStats>,
  }
  let dpdSum = 0, dpdN = 0
  data.forEach(r => {
    if (r.type === 'trading') stats.trading++
    else if (r.type === 'agric') stats.agric++
    else stats.std++
    stats.totalCommit += r.commit || 0
    if (r.overdue > 0) { stats.overdueCount++; stats.totalOverdue += r.overdue }
    if (r.dpd > 0) { dpdSum += r.dpd; dpdN++ }
    const pn = r.productName || 'Unknown'
    if (!stats.products[pn]) {
      stats.products[pn] = { count: 0, overdue: 0, overdueCount: 0, commit: 0, type: r.type }
    }
    stats.products[pn].count++
    stats.products[pn].commit += r.commit || 0
    stats.products[pn].overdue += r.overdue || 0
    if (r.overdue > 0) stats.products[pn].overdueCount++
  })
  stats.avgDPD = dpdN > 0 ? Math.round(dpdSum / dpdN) : 0
  return stats
}

export function filterLoans(
  all: Loan[],
  {
    activeFilter,
    selectedProduct,
    approachingMaturity,
    searchTerm,
    nlqFilters,
    officerFilter,
    anomalyFilter,
    anomalyIds,
    sortCol,
    sortAsc,
  }: {
    activeFilter?: string
    selectedProduct?: string
    approachingMaturity?: boolean
    searchTerm?: string
    nlqFilters?: NLQFilters
    officerFilter?: string
    anomalyFilter?: boolean
    anomalyIds?: Set<string>
    sortCol?: string | null
    sortAsc?: boolean
  }
): Loan[] {
  let result = all

  if (activeFilter === 'trading') result = result.filter(r => r.type === 'trading')
  else if (activeFilter === 'agric') result = result.filter(r => r.type === 'agric')
  else if (activeFilter === 'std') result = result.filter(r => r.type === 'std')
  else if (activeFilter === 'overdue') result = result.filter(r => r.overdue > 0)
  else if (activeFilter === 'dpd') result = result.filter(r => r.dpd > 0)
  else if (activeFilter === '__due7') result = result.filter(
    r => r.daysToNext !== null && r.daysToNext >= 0 && r.daysToNext <= 7
  )
  else if (activeFilter?.startsWith('prod__')) {
    const prodName = activeFilter.slice(6)
    result = result.filter(r => r.productName === prodName)
  }

  if (selectedProduct && selectedProduct !== '__ALL__') {
    result = result.filter(r => r.productName === selectedProduct)
  }

  if (approachingMaturity) {
    const today = new Date()
    const thirtyDays = new Date(today)
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    result = result.filter(r => {
      const mat = r.maturityDate ? new Date(r.maturityDate) : null
      return mat && mat >= today && mat <= thirtyDays && r.overdue > 0
    })
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    result = result.filter(r =>
      r.name.toLowerCase().includes(term) ||
      (r.repAcct || '').toLowerCase().includes(term) ||
      (r.productName || '').toLowerCase().includes(term) ||
      (r.officer || '').toLowerCase().includes(term) ||
      (r.applId || '').toLowerCase().includes(term)
    )
  }

  if (nlqFilters) {
    if (nlqFilters.product) result = result.filter(r => r.type === nlqFilters.product)
    if (nlqFilters.minCommit !== null) result = result.filter(r => r.commit >= nlqFilters.minCommit!)
    if (nlqFilters.maxCommit !== null) result = result.filter(r => r.commit <= nlqFilters.maxCommit!)
    if (nlqFilters.minDPD !== null) result = result.filter(r => r.dpd >= nlqFilters.minDPD!)
    if (nlqFilters.maxDPD !== null) result = result.filter(r => r.dpd <= nlqFilters.maxDPD!)
    if (nlqFilters.overdueOnly) result = result.filter(r => r.overdue > 0)

    if (nlqFilters.maturityDays !== null) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const target = new Date(today)
      target.setDate(target.getDate() + nlqFilters.maturityDays!)
      result = result.filter(r => {
        const mat = r.maturityDate ? new Date(r.maturityDate) : null
        return mat && mat >= today && mat <= target
      })
    }
    if (nlqFilters.maturityMonths !== null) {
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const target = new Date(today)
      target.setMonth(target.getMonth() + nlqFilters.maturityMonths!)
      result = result.filter(r => {
        const mat = r.maturityDate ? new Date(r.maturityDate) : null
        return mat && mat >= today && mat <= target
      })
    }
    if (nlqFilters.maturityThisMonth) {
      const now = new Date()
      result = result.filter(r => {
        const mat = r.maturityDate ? new Date(r.maturityDate) : null
        return mat && mat.getFullYear() === now.getFullYear() && mat.getMonth() === now.getMonth()
      })
    }
    if (nlqFilters.maturityNextMonth) {
      const now = new Date()
      const nextM = (now.getMonth() + 1) % 12
      const nextY = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
      result = result.filter(r => {
        const mat = r.maturityDate ? new Date(r.maturityDate) : null
        return mat && mat.getFullYear() === nextY && mat.getMonth() === nextM
      })
    }

    if (nlqFilters.minOverdue !== null) result = result.filter(r => r.overdue >= nlqFilters.minOverdue!)
    if (nlqFilters.maxOverdue !== null) result = result.filter(r => r.overdue <= nlqFilters.maxOverdue!)

    if (nlqFilters.loanClass) {
      const cls = nlqFilters.loanClass.toLowerCase()
      result = result.filter(r => getLoanClass(r.dpd).toLowerCase() === cls)
    }

    if (nlqFilters.borrowerName) {
      const nm = nlqFilters.borrowerName.toLowerCase()
      result = result.filter(r => (r.name || '').toLowerCase().includes(nm))
    }

    if (nlqFilters.officer) {
      const oTerm = nlqFilters.officer.toLowerCase()
      result = result.filter(r => (r.officer || '').toLowerCase().includes(oTerm))
    }

    if (nlqFilters.maxDaysToNext !== null) {
      result = result.filter(r =>
        r.daysToNext !== null && r.daysToNext !== undefined && r.daysToNext <= nlqFilters.maxDaysToNext!
      )
    }
    if (nlqFilters.instalmentOverdue) {
      result = result.filter(r => r.daysToNext !== null && r.daysToNext !== undefined && r.daysToNext < 0)
    }

    if (nlqFilters.openedAfter) {
      const afterD = new Date(nlqFilters.openedAfter)
      result = result.filter(r => r.openingDate && new Date(r.openingDate) >= afterD)
    }
    if (nlqFilters.openedBefore) {
      const beforeD = new Date(nlqFilters.openedBefore)
      result = result.filter(r => r.openingDate && new Date(r.openingDate) <= beforeD)
    }
  }

  if (officerFilter) {
    result = result.filter(r => (r.officer || '').toLowerCase() === officerFilter.toLowerCase())
  }

  if (anomalyFilter && anomalyIds) {
    result = result.filter(r => anomalyIds.has(r.applId || r.repAcct || r.name))
  }

  if (sortCol) {
    result = [...result].sort((a, b) => {
      const ak = sortCol as keyof Loan
      const av = a[ak], bv = b[ak]
      if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av
      const as = String(av ?? '').toLowerCase()
      const bs = String(bv ?? '').toLowerCase()
      return sortAsc ? as.localeCompare(bs) : bs.localeCompare(as)
    })
  }

  return result
}
