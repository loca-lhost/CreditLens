import type { Loan, ProductMeta } from '@/types'
import { detectColumns } from './column-detector'
import { getType, toMo } from './product-classifier'
import { validateDate, computeNextInstalment } from './date-utils'
import { computeRep } from './repayment-calc'
import { calculateDPD } from './dpd-calc'
import Papa from 'papaparse'

const MIN_CELL_COUNT = 24

export function parseCSV(fileText: string): Promise<{ headers: string[]; rows: string[][] }> {
  return new Promise<{ headers: string[]; rows: string[][] }>((resolve, reject) => {
    Papa.parse<Record<string, string>>(fileText, {
      header: true,
      skipEmptyLines: true,
      complete: results => {
        const headers = results.meta.fields || []
        const rows = results.data.map(obj => headers.map(h => obj[h] || ''))
        resolve({ headers, rows })
      },
      error: (err: Error) => reject(new Error('CSV parse error: ' + err.message))
    })
  })
}

export function parseHTML(fileText: string): { headers: string[]; rows: string[][] } {
  const parser = new DOMParser()
  const doc = parser.parseFromString(fileText, 'text/html')
  const tableRows = doc.querySelectorAll('table tr')
  if (tableRows.length < 2) throw new Error('No data rows found')

  const headerCells = tableRows[0].querySelectorAll('th,td')
  const headers = Array.from(headerCells).map(c => c.textContent?.trim() || '')

  const rows: string[][] = []
  for (let i = 1; i < tableRows.length; i++) {
    const cells = tableRows[i].querySelectorAll('td,th')
    rows.push(Array.from(cells).map(c => c.textContent?.trim() || ''))
  }
  return { headers, rows }
}

export function parseFileContent(
  file: File
): Promise<{ headers: string[]; rows: string[][] }> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('File read error'))
    reader.onload = async e => {
      const content = e.target?.result as string
      try {
        if (ext === 'csv') {
          const result = await parseCSV(content)
          resolve(result)
        } else {
          resolve(parseHTML(content))
        }
      } catch (err) {
        reject(err)
      }
    }
    reader.readAsText(file)
  })
}

export function cleanName(raw: string | undefined | null): string {
  if (!raw) return ''
  const words = raw.replace(/,/g, ' ').trim().split(/\s+/)
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of words) {
    const k = w.toUpperCase()
    if (w && !seen.has(k)) { seen.add(k); out.push(w) }
  }
  return out.join(' ')
}

export function pNum(s: string | null | undefined): number {
  if (!s?.trim()) return 0
  const cleaned = s.replace(/[^0-9.\-]/g, '').replace(/(?!^)\-/g, '')
  return parseFloat(cleaned) || 0
}

export function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface ProcessOptions {
  log?: (msg: string, type?: 'ok' | 'warn' | 'err' | 'info') => void
  ci?: Record<string, number>
  officerMap?: Record<string, string>
}

export function processRawData(
  headers: string[],
  rows: string[][],
  opts: ProcessOptions = {}
): { data: Loan[]; meta: Record<string, ProductMeta> } {
  const logFn = opts.log || (() => {})
  const officerMap = opts.officerMap || {}

  const result: Loan[] = []
  const meta: Record<string, ProductMeta> = {}
  const localCI = opts.ci || detectColumns(headers)

  logFn('Parsing data…')
  logFn('Column detection done', 'ok')

  let nC = 0, nO = 0, skipped = 0, duplicates = 0
  let pendingClosureCount = 0, expiredNoOverdueCount = 0
  const seenKeys = new Set<string>()

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i]
    if (cells.length < MIN_CELL_COUNT) { skipped++; continue }

    const g = (idx: number | undefined): string => {
      if (idx === undefined || idx >= cells.length) return ''
      return cells[idx] ? cells[idx].trim() : ''
    }

    const rawName = g(localCI.customerName)
    const repAcct = g(localCI.repaymentAccount)
    const productName = g(localCI.productName)
    const openingDate = g(localCI.openingDate)
    const rawFirstRepayment = g(localCI.firstRepaymentDate)
    const maturityDate = g(localCI.maturityDate)
    const rawTerm = g(localCI.term)
    const rawCommit = g(localCI.commitment)
    const rawPrinc = g(localCI.principal)
    const rawRate = g(localCI.interestRate)
    const rawDue = g(localCI.dueToday)
    const rawOv = g(localCI.overdue)
    const rawApplId = localCI.applicationId !== undefined ? g(localCI.applicationId).trim() : ''

    const name = cleanName(rawName)
    const validOpeningDate = validateDate(openingDate)
    const validMaturityDate = validateDate(maturityDate)
    const commit = pNum(rawCommit)
    const principal = pNum(rawPrinc)
    const rate = pNum(rawRate)

    let dupKey: string
    if (rawApplId) {
      dupKey = `${rawApplId}|${name}`
    } else if (repAcct) {
      dupKey = repAcct.trim()
    } else {
      dupKey = `${name}|${productName}`
    }
    if (seenKeys.has(dupKey)) { duplicates++; continue }
    seenKeys.add(dupKey)

    let statusValue = ''
    if (localCI.loanStatus !== undefined) {
      statusValue = (cells[localCI.loanStatus] || '').trim().toLowerCase()
    }
    if (statusValue === 'pending closure') { pendingClosureCount++; continue }

    const due = pNum(rawDue)
    const ov = pNum(rawOv)
    const overdue = due > 0 ? ov + due : ov

    if (statusValue === 'expired' && overdue <= 0) { expiredNoOverdueCount++; continue }

    if (name !== rawName.replace(/,/g, '').replace(/\s+/g, ' ').trim()) nC++
    if (overdue > 0) nO++

    const type = getType(productName)
    const termMo = toMo(rawTerm)
    const rep = computeRep(principal, rate, termMo, type)
    const dpd = calculateDPD(
      validOpeningDate || openingDate,
      validMaturityDate || maturityDate,
      overdue, type, rep.daily, rep.monthly, termMo
    )

    if (!meta[productName]) meta[productName] = { type, count: 0 }
    meta[productName].count++

    const row: Loan = {
      name, repAcct, applId: rawApplId || '', productName,
      openingDate: validOpeningDate || openingDate,
      firstRepaymentDate: rawFirstRepayment,
      maturityDate: validMaturityDate || maturityDate,
      termMo, commit, rate, overdue, dpd, type,
      daily: rep.daily, weekly: rep.weekly, monthly: rep.monthly, bullet: rep.bullet,
      _cells: cells,
      officer: '',
      daysToNext: null,
    }

    row.daysToNext = computeNextInstalment({
      type: row.type,
      bullet: row.bullet,
      maturityDate: row.maturityDate,
      openingDate: row.openingDate,
    })

    const oKey = row.repAcct || row.applId
    if (oKey && officerMap[oKey]) row.officer = officerMap[oKey]

    result.push(row)
  }

  if (skipped) logFn(`Skipped ${skipped} rows`, 'warn')
  if (duplicates) logFn(`Duplicates removed: ${duplicates}`, 'warn')
  if (pendingClosureCount) logFn(`Skipped Pending Closure: ${pendingClosureCount}`, 'warn')
  if (expiredNoOverdueCount) logFn(`Skipped Expired (no overdue): ${expiredNoOverdueCount}`, 'warn')
  logFn(`Names cleaned: ${nC}`, 'ok')

  const prodSummary = Object.entries(meta)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, m]) => `${name}: ${m.count}`)
    .join(' · ')
  logFn(`Products — ${prodSummary}`, 'ok')

  return { data: result, meta }
}
