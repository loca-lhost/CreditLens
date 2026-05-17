import type { Loan } from '@/types'

export function openPrintSummary(loans: Loan[]) {
  const byProduct: Record<string, { type: string; count: number; commit: number; overdue: number; overdueCount: number }> = {}
  loans.forEach(r => {
    const k = r.productName || 'Unknown'
    if (!byProduct[k]) byProduct[k] = { type: r.type, count: 0, commit: 0, overdue: 0, overdueCount: 0 }
    byProduct[k].count++
    byProduct[k].commit += r.commit || 0
    if (r.overdue > 0) { byProduct[k].overdue += r.overdue; byProduct[k].overdueCount++ }
  })

  const prodRows = Object.entries(byProduct)
    .sort((a, b) => b[1].overdue - a[1].overdue)
    .map(([name, p]) => `<tr>
      <td>${esc(name)}</td>
      <td style="text-transform:capitalize">${p.type}</td>
      <td style="text-align:right">${p.count}</td>
      <td style="text-align:right">GHS ${fmt(p.commit)}</td>
      <td style="text-align:right;color:${p.overdue > 0 ? '#e53e3e' : '#38a169'}">${p.overdue > 0 ? `GHS ${fmt(p.overdue)}` : '—'}</td>
      <td style="text-align:right">${p.overdueCount > 0 ? `${p.overdueCount} (${Math.round(p.overdueCount / p.count * 100)}%)` : '—'}</td>
    </tr>`).join('')

  const top10 = loans.filter(r => r.overdue > 0).sort((a, b) => b.overdue - a.overdue).slice(0, 10)
  let topTable = ''
  if (top10.length > 0) {
    topTable = `<h3 style="margin:16px 0 8px">Top 10 Overdue Loans</h3>
      <table style="width:100%;border:1px solid #ccc;font-size:12px;border-collapse:collapse">
        <thead><tr style="background:#eee">
          <th style="text-align:left;padding:6px 8px;border:1px solid #ccc">Customer</th>
          <th style="text-align:left;padding:6px 8px;border:1px solid #ccc">Product</th>
          <th style="text-align:right;padding:6px 8px;border:1px solid #ccc">Overdue</th>
          <th style="text-align:right;padding:6px 8px;border:1px solid #ccc">DPD</th>
        </tr></thead>
        <tbody>${top10.map(r => `<tr>
          <td style="padding:4px 8px;border:1px solid #eee">${esc(r.name)}</td>
          <td style="padding:4px 8px;border:1px solid #eee">${esc(r.productName)}</td>
          <td style="text-align:right;padding:4px 8px;border:1px solid #eee;color:#e53e3e">GHS ${fmt(r.overdue)}</td>
          <td style="text-align:right;padding:4px 8px;border:1px solid #eee">${r.dpd}</td>
        </tr>`).join('')}</tbody>
      </table>`
  }

  const now = new Date().toLocaleString()
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return

  win.document.write(`
    <!DOCTYPE html>
    <html><head>
      <meta charset="UTF-8">
      <title>CreditLens Portfolio Summary</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; max-width: 900px; margin: 0 auto; }
        h2 { font-size: 24px; margin-bottom: 4px; }
        p.meta { font-size: 13px; color: #666; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
        th { text-align: left; padding: 8px 12px; background: #f5f5f5; border: 1px solid #ddd; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
        td { padding: 6px 12px; border: 1px solid #eee; }
        tr:hover td { background: #fafafa; }
        @media print {
          body { padding: 20px; }
          h2 { font-size: 20px; }
        }
      </style>
    </head><body>
      <h2>CreditLens Portfolio Summary</h2>
      <p class="meta">Generated: ${now} &middot; ${loans.length} loans</p>
      <h3>Loan Type Breakdown</h3>
      <table>
        <thead><tr>
          <th>Product</th><th>Type</th><th style="text-align:right">Count</th>
          <th style="text-align:right">Commitment</th><th style="text-align:right">Total Overdue</th>
          <th style="text-align:right">Accounts in Arrears</th>
        </tr></thead>
        <tbody>${prodRows}</tbody>
      </table>
      ${topTable}
    </body></html>
  `)
  win.document.close()
  win.print()
}

function esc(s: string): string {
  const d = document.createElement('div')
  d.textContent = s
  return d.innerHTML
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
