export function validateDate(dateStr: string | undefined | null): string | null {
  if (!dateStr?.trim()) return null
  const trimmed = dateStr.trim()

  // ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? null : trimmed
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const ddmm = trimmed.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{4})$/)
  if (ddmm) {
    const [, d, m, y] = ddmm
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    const dt = new Date(iso)
    return isNaN(dt.getTime()) ? null : iso
  }

  // Natural parse fallback
  const parsed = new Date(trimmed)
  return isNaN(parsed.getTime()) ? null : trimmed
}

export function countWorkingDays(startDate: string | Date, endDate: string | Date): number {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (start >= end) return 0

  // Align start to Monday if it falls on weekend
  const startDay = start.getDay()
  if (startDay === 0) start.setDate(start.getDate() + 1)
  else if (startDay === 6) start.setDate(start.getDate() + 2)

  const endDay = end.getDay()
  if (endDay === 0) end.setDate(end.getDate() - 2)
  else if (endDay === 6) end.setDate(end.getDate() - 1)

  if (start > end) return 0

  const totalDays = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  const weeks = Math.floor(totalDays / 7)
  let workdays = weeks * 5
  const rem = totalDays % 7
  const sDay = start.getDay()

  for (let i = 0; i < rem; i++) {
    const d = (sDay - 1 + i) % 7
    if (d < 5) workdays++
  }
  return Math.max(0, workdays)
}

export function daysBetween(dateStr: string | null | undefined, ref: Date): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24))
}

export function computeNextInstalment(row: {
  type: string
  bullet: number
  maturityDate?: string | null
  openingDate?: string | null
}): number | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Bullet / agric: single repayment at maturity date
  if (row.type === 'agric' || row.bullet > 0) {
    if (!row.maturityDate) return null
    const mat = new Date(row.maturityDate)
    if (isNaN(mat.getTime())) return null
    return Math.ceil((mat.getTime() - today.getTime()) / 86400000)
  }

  // Trading: daily repayment — next working day from tomorrow
  if (row.type === 'trading') {
    const next = new Date(today)
    next.setDate(next.getDate() + 1)
    while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1)
    return Math.ceil((next.getTime() - today.getTime()) / 86400000)
  }

  // Monthly loans
  if (!row.openingDate) return null
  const opening = new Date(row.openingDate)
  if (isNaN(opening.getTime())) return null

  const repStart = new Date(opening)
  repStart.setMonth(repStart.getMonth() + 1)
  repStart.setHours(0, 0, 0, 0)

  if (today < repStart) {
    return Math.ceil((repStart.getTime() - today.getTime()) / 86400000)
  }

  const dom = repStart.getDate()
  let next = new Date(today.getFullYear(), today.getMonth(), dom)
  if (next <= today) next = new Date(today.getFullYear(), today.getMonth() + 1, dom)

  if (row.maturityDate) {
    const mat = new Date(row.maturityDate)
    if (!isNaN(mat.getTime()) && next > mat) next = mat
  }

  return Math.ceil((next.getTime() - today.getTime()) / 86400000)
}
