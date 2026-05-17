import type { Loan, ComparisonResult, ScheduleData } from '@/types'
import { getLoanClass } from './filters'

let _xlsx: typeof import('xlsx') | null = null

async function getXLSX() {
  if (!_xlsx) {
    _xlsx = await import('xlsx')
  }
  return _xlsx
}

export async function generateXLSX(rows: Loan[], filename: string) {
  const XLSX = await getXLSX()
  const H = [
    'Customer Name', 'Repayment Account', 'Product Name', 'Opening Date',
    'Maturity Date', 'Term (Months)', 'Commitment', 'Interest Rate (%)',
    'Overdue', 'DPD (Days)', 'Daily Repayment', 'Weekly Repayment',
    'Monthly Repayment', 'Bullet Payment',
  ]

  const ws = XLSX.utils.aoa_to_sheet([H])
  rows.forEach((row, i) => {
    const data = [
      row.name, row.repAcct || '', row.productName || '',
      row.openingDate || '', row.maturityDate || '',
      row.termMo || 0, row.commit || 0, row.rate || 0,
      row.overdue > 0 ? parseFloat(row.overdue.toFixed(2)) : '',
      row.dpd > 0 ? row.dpd : '',
      row.daily > 0 ? parseFloat(row.daily.toFixed(2)) : '',
      row.weekly > 0 ? parseFloat(row.weekly.toFixed(2)) : '',
      row.monthly > 0 ? parseFloat(row.monthly.toFixed(2)) : '',
      row.bullet > 0 ? parseFloat(row.bullet.toFixed(2)) : '',
    ]
    XLSX.utils.sheet_add_aoa(ws, [data], { origin: i + 1 })
  })

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: H.length - 1 },
  })
  ws['!cols'] = [30, 22, 20, 14, 14, 10, 14, 10, 14, 12, 16, 16, 18, 16].map(w => ({ wch: w }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Lending Arrangements')
  XLSX.writeFile(wb, filename)
}

export function generateCSVText(rows: Loan[], simple?: boolean): string {
  function txtCell(val: unknown): string {
    const s = (val === null || val === undefined ? '' : String(val))
      .replace(/[\r\n]/g, ' ')
      .replace(/^,+|,+$/g, '')
      .trim()
    return s.includes(',') ? '"' + s.replace(/"/g, '""') + '"' : s
  }

  if (simple) {
    const lines = [['Account', 'Name', 'Arrears', 'DPD'].join(',')]
    rows.forEach(row => {
      lines.push([
        txtCell(row.repAcct || ''),
        txtCell(row.name || ''),
        txtCell(row.overdue > 0 ? parseFloat(row.overdue.toFixed(2)) : 0),
        txtCell(row.dpd > 0 ? row.dpd : 0),
      ].join(','))
    })
    return lines.join('\r\n')
  }

  const headers = ['Account', 'Name', 'Arrears', 'DPD', 'Class', 'Loan ID', 'Next Instalment (days)', 'Officer']
  const lines = [headers.join(',')]

  rows.forEach(row => {
    const dpd = row.dpd > 0 ? row.dpd : 0
    lines.push([
      txtCell(row.repAcct || ''),
      txtCell(row.name || ''),
      txtCell(row.overdue > 0 ? parseFloat(row.overdue.toFixed(2)) : 0),
      txtCell(dpd),
      txtCell(getLoanClass(dpd)),
      txtCell(row.applId || row.repAcct || ''),
      txtCell(row.daysToNext != null ? row.daysToNext : ''),
      txtCell(row.officer || ''),
    ].join(','))
  })

  return lines.join('\r\n')
}

export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function exportComparisonXLSX(rows: ComparisonResult[], filename: string) {
  const XLSX = await getXLSX()
  const H = [
    'Customer Name', 'Repayment Account', 'Product Name',
    'Baseline Overdue', 'Current Overdue', 'Overdue Delta',
    'Baseline DPD', 'Current DPD', 'DPD Delta', 'Status',
  ]

  const ws = XLSX.utils.aoa_to_sheet([H])
  rows.forEach((row, i) => {
    XLSX.utils.sheet_add_aoa(ws, [[
      row.name, row.repAcct || '', row.productName || '',
      row.baselineOverdue > 0 ? parseFloat(row.baselineOverdue.toFixed(2)) : '',
      row.currentOverdue > 0 ? parseFloat(row.currentOverdue.toFixed(2)) : '',
      row.overdueDelta !== 0 ? parseFloat(row.overdueDelta.toFixed(2)) : '',
      row.baselineDPD > 0 ? row.baselineDPD : '',
      row.currentDPD > 0 ? row.currentDPD : '',
      row.dpdDelta !== 0 ? row.dpdDelta : '',
      row.status,
    ]], { origin: i + 1 })
  })

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: H.length - 1 },
  })
  ws['!cols'] = [30, 22, 20, 14, 14, 12, 12, 12, 12, 12].map(w => ({ wch: w }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Comparison')
  XLSX.writeFile(wb, filename)
}

export async function exportScheduleXLSX(schedule: ScheduleData, filename: string) {
  const XLSX = await getXLSX()
  const wb = XLSX.utils.book_new()

  const postRows: (string | number)[][] = [['Borrower', 'Loan Type', 'Loan Amount', 'Days Since Disbursement', 'Opening Date']]
  schedule.postDisb.forEach(r => postRows.push([r.name, r.productName, r.commit, r.daysSinceOpen, r.openingDate]))
  const ws1 = XLSX.utils.aoa_to_sheet(postRows)
  ws1['!cols'] = [30, 22, 14, 20, 14].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws1, 'Post-Disbursement')

  const recRows: (string | number)[][] = [['Borrower', 'Loan Type', 'Arrears (GHS)', 'Days Overdue', 'Priority', 'Loan Amount']]
  schedule.recovery.forEach(r => recRows.push([r.name, r.productName, r.overdue, r.dpd, r.priority, r.commit]))
  const ws2 = XLSX.utils.aoa_to_sheet(recRows)
  ws2['!cols'] = [30, 22, 14, 8, 10, 14].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws2, 'Recovery')

  const urgRows: (string | number)[][] = [['Borrower', 'Loan Type', 'Loan Amount', 'End Date', 'Days To Maturity']]
  schedule.urgentMat.forEach(r => urgRows.push([r.name, r.productName, r.commit, r.maturityDate, r.daysToMat]))
  const ws3 = XLSX.utils.aoa_to_sheet(urgRows)
  ws3['!cols'] = [30, 22, 14, 14, 16].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws3, 'Maturing Soon')

  const routRows: (string | number)[][] = [['Borrower', 'Loan Type', 'Loan Amount', 'End Date', 'Days To Maturity']]
  schedule.routine.forEach(r => routRows.push([r.name, r.productName, r.commit, r.maturityDate, r.daysToMat]))
  const ws4 = XLSX.utils.aoa_to_sheet(routRows)
  ws4['!cols'] = [30, 22, 14, 14, 16].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, ws4, 'Routine Monitoring')

  XLSX.writeFile(wb, filename)
}

export function getExportFilename(prefix: string): string {
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  return `${prefix}_${stamp}.xlsx`
}


export async function generateXLSXWithSummary(rows: Loan[], summary: string, filename: string) {
  const XLSX = await getXLSX()
  const H = [
    'Customer Name', 'Repayment Account', 'Product Name', 'Opening Date',
    'Maturity Date', 'Term (Months)', 'Commitment', 'Interest Rate (%)',
    'Overdue', 'DPD (Days)', 'Daily Repayment', 'Weekly Repayment',
    'Monthly Repayment', 'Bullet Payment',
  ]

  const ws = XLSX.utils.aoa_to_sheet([H])
  rows.forEach((row, i) => {
    const data = [
      row.name, row.repAcct || '', row.productName || '',
      row.openingDate || '', row.maturityDate || '',
      row.termMo || 0, row.commit || 0, row.rate || 0,
      row.overdue > 0 ? parseFloat(row.overdue.toFixed(2)) : '',
      row.dpd > 0 ? row.dpd : '',
      row.daily > 0 ? parseFloat(row.daily.toFixed(2)) : '',
      row.weekly > 0 ? parseFloat(row.weekly.toFixed(2)) : '',
      row.monthly > 0 ? parseFloat(row.monthly.toFixed(2)) : '',
      row.bullet > 0 ? parseFloat(row.bullet.toFixed(2)) : '',
    ]
    XLSX.utils.sheet_add_aoa(ws, [data], { origin: i + 1 })
  })

  ws['!ref'] = XLSX.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: rows.length, c: H.length - 1 },
  })
  ws['!cols'] = [30, 22, 20, 14, 14, 10, 14, 10, 14, 12, 16, 16, 18, 16].map(w => ({ wch: w }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Lending Arrangements')

  const summaryLines = summary.split('\n').map(l => [l])
  const wsSummary = XLSX.utils.aoa_to_sheet([['AI Portfolio Summary'], [''], ...summaryLines])
  wsSummary['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'AI Summary')

  XLSX.writeFile(wb, filename)
}
