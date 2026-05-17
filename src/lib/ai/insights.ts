import type { Loan, ComparisonResult, ScheduleGroup } from '@/types'
import { aiCall, hasAIKey } from './client'
import { buildAggregateStats } from '@/lib/filters'
import { maskName, resetMask } from '@/lib/masking'

export async function generatePortfolioInsight(
  loans: Loan[],
  getAIContent: (content: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  if (!hasAIKey() || loans.length === 0) return
  resetMask()

  try {
    const stats = buildAggregateStats(loans)
    const top5 = loans
      .filter(r => r.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 5)

    const top5Masked = top5
      .map(r => `${maskName(r.name)}: ${r.productName}, overdue ${r.overdue.toFixed(2)}, DPD ${r.dpd}`)
      .join('\n')

    const productBreakdown = Object.entries(stats.products)
      .sort((a, b) => b[1].overdue - a[1].overdue)
      .map(([name, p]) => `  • ${name} (${p.type}): ${p.count} loans, commit GHS ${p.commit.toFixed(2)}, overdue GHS ${p.overdue.toFixed(2)}, overdue rate ${p.count > 0 ? Math.round(p.overdueCount / p.count * 100) : 0}%`)
      .join('\n')

    const prompt = `You are a loan portfolio analyst. Analyze these AGGREGATED portfolio statistics and provide a concise risk summary (3-5 sentences). Focus on which specific products carry the most risk, overdue concentration, and actionable recommendations.

PORTFOLIO STATS:
- Total loans: ${stats.total}
- Overdue accounts: ${stats.overdueCount} (${(stats.overdueCount / stats.total * 100).toFixed(1)}%)
- Total overdue amount: GHS ${stats.totalOverdue.toFixed(2)}
- Total commitment: GHS ${stats.totalCommit.toFixed(2)}
- Average DPD (of overdue accounts): ${stats.avgDPD} days

PRODUCT-LEVEL BREAKDOWN (sorted by overdue):
${productBreakdown}

TOP 5 OVERDUE (anonymized):
${top5Masked}

Respond in plain text, no markdown. Be specific with product names and numbers.`

    const result = await aiCall(prompt)
    getAIContent(result)
  } catch (e) {
    onError(`AI unavailable: ${(e as Error).message}`)
  }
}

export async function generateComparisonInsight(
  results: ComparisonResult[],
  getAIContent: (content: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  if (!hasAIKey() || results.length === 0) return
  resetMask()

  try {
    const stats = { Recovered: 0, Worsening: 0, Stable: 0, New: 0, Resolved: 0 }
    let worseningDelta = 0, recoveredDelta = 0

    results.forEach(r => {
      stats[r.status]++
      if (r.status === 'Worsening') worseningDelta += r.overdueDelta
      if (r.status === 'Recovered') recoveredDelta += r.overdueDelta
    })

    const topWorsening = results
      .filter(r => r.status === 'Worsening')
      .sort((a, b) => b.overdueDelta - a.overdueDelta)
      .slice(0, 5)

    const topRecovered = results
      .filter(r => r.status === 'Recovered')
      .sort((a, b) => a.overdueDelta - b.overdueDelta)
      .slice(0, 5)

    const twMasked = topWorsening
      .map(r => `${maskName(r.name)}: +${r.overdueDelta.toFixed(2)} overdue, DPD ${r.currentDPD}`)
      .join('\n')

    const trMasked = topRecovered
      .map(r => `${maskName(r.name)}: ${r.overdueDelta.toFixed(2)} overdue, DPD ${r.currentDPD}`)
      .join('\n')

    const prompt = `You are a loan portfolio analyst. Analyze this period-over-period comparison and provide a concise insight (3-5 sentences). Focus on recovery trends, deterioration patterns, and priority actions.

COMPARISON STATS:
- Total loans compared: ${results.length}
- Recovered: ${stats.Recovered}
- Worsening: ${stats.Worsening} (added GHS ${worseningDelta.toFixed(2)} in new overdue)
- Stable: ${stats.Stable}
- New loans: ${stats.New}
- Resolved: ${stats.Resolved}
- Net recovery: GHS ${recoveredDelta.toFixed(2)}

TOP 5 WORSENING (anonymized):
${twMasked || 'None'}

TOP 5 RECOVERED (anonymized):
${trMasked || 'None'}

Respond in plain text, no markdown. Be specific with numbers.`

    const result = await aiCall(prompt)
    getAIContent(result)
  } catch (e) {
    onError(`AI unavailable: ${(e as Error).message}`)
  }
}

export async function generateScheduleSummary(
  postCount: number,
  recCount: number,
  urgCount: number,
  routCount: number,
  getAIContent: (content: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  if (!hasAIKey()) return

  try {
    const prompt = `You are a loan portfolio field officer scheduler. Based on these weekly schedule counts, provide a brief 2-3 sentence action summary with priorities.

SCHEDULE THIS WEEK:
- Post-disbursement visits needed: ${postCount} (loans >= GHS 10,000 disbursed 7-45 days ago)
- Field recovery visits: ${recCount} (overdue loans)
- Urgent maturity: ${urgCount} (maturing within 7 days, no overdue)
- Routine monitoring: ${routCount} (maturing within 8-30 days)

Respond in plain text, no markdown. Be actionable and specific.`

    const result = await aiCall(prompt, { maxTokens: 256 })
    getAIContent(result)
  } catch (e) {
    onError(`AI summary unavailable: ${(e as Error).message}`)
  }
}


export async function generateRiskCommentary(
  loans: Loan[],
  getAIContent: (content: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  if (!hasAIKey() || loans.length === 0) return

  try {
    const topOverdue = loans
      .filter(r => r.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue)
      .slice(0, 10)

    const loanDetails = topOverdue
      .map(r => `- ${maskName(r.name)}: ${r.productName}, commitment GHS ${r.commit.toFixed(2)}, overdue GHS ${r.overdue.toFixed(2)}, DPD ${r.dpd}, status: ${r.dpd > 90 ? 'Critical' : r.dpd > 30 ? 'High' : 'Medium'} risk`)
      .join('\n')

    const prompt = `You are a loan portfolio risk analyst. Provide a brief risk commentary (2-3 sentences) for the overall portfolio and specific recommendations for the top 10 overdue accounts listed below. Focus on recovery priorities and risk mitigation.

PORTFOLIO SUMMARY:
- Total loans: ${loans.length}
- Overdue accounts: ${loans.filter(r => r.overdue > 0).length}
- Total overdue: GHS ${loans.reduce((s, r) => s + r.overdue, 0).toFixed(2)}

TOP 10 OVERDUE:
${loanDetails}

Respond in plain text, no markdown. Be concise and actionable.`

    const result = await aiCall(prompt, { maxTokens: 300 })
    getAIContent(result)
  } catch (e) {
    onError(`Risk commentary unavailable: ${(e as Error).message}`)
  }
}

export async function generateExportSummary(
  loans: Loan[],
  getAIContent: (content: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  if (!hasAIKey() || loans.length === 0) return

  try {
    const stats = buildAggregateStats(loans)
    const prompt = `You are a loan portfolio analyst. Write a brief executive summary (3-4 sentences) for a portfolio export report. Include: overall portfolio health, key risk areas, and recommended actions.

PORTFOLIO STATS:
- Total loans: ${stats.total}
- Overdue: ${stats.overdueCount} accounts, GHS ${stats.totalOverdue.toFixed(2)}
- Avg DPD: ${stats.avgDPD} days
- Total commitment: GHS ${stats.totalCommit.toFixed(2)}

Respond in plain text, no markdown. Professional tone.`

    const result = await aiCall(prompt, { maxTokens: 256 })
    getAIContent(result)
  } catch (e) {
    onError(`Summary unavailable: ${(e as Error).message}`)
  }
}


export async function generateVisitTalkingPoints(
  recoveryLoans: ScheduleGroup[],
  getAIContent: (content: string) => void,
  onError: (msg: string) => void
): Promise<void> {
  if (!hasAIKey() || recoveryLoans.length === 0) return

  try {
    const top5 = recoveryLoans.slice(0, 5)
    const loanDetails = top5
      .map(r => `- ${maskName(r.name)}: ${r.productName}, arrears GHS ${r.overdue.toFixed(2)}, DPD ${r.dpd}, priority: ${r.priority}`)
      .join('\n')

    const prompt = `You are a field recovery officer. For each of these overdue loans, provide 1-2 brief talking points for the field visit. Focus on negotiation approach, key questions to ask, and risk factors to address.

LOANS TO VISIT:
${loanDetails}

Format each as:
Customer_NNN: [talking point]

Respond in plain text, no markdown. Be concise and practical.`

    const result = await aiCall(prompt, { maxTokens: 300 })
    getAIContent(result)
  } catch (e) {
    onError(`Talking points unavailable: ${(e as Error).message}`)
  }
}
