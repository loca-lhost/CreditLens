import type { NLQFilters } from '@/types'
import { aiCall, hasAIKey } from './client'

export async function parseNaturalQuery(query: string): Promise<NLQFilters | null> {
  if (!hasAIKey()) throw new Error('AI key required for natural language queries')

  const prompt = `You are a loan portfolio filter parser for a Ghanaian rural bank. Today is ${new Date().toISOString().slice(0, 10)}. Convert the query into a JSON object. Use null/false for unspecified fields.

FIELDS:
- product: "trading"|"agric"|"salary"|"property"|"vehicle"|"sme"|"personal"|"std"
- minCommit / maxCommit: loan amount range (numbers)
- minOverdue / maxOverdue: arrears amount range (numbers)
- minDPD / maxDPD: days overdue range (numbers)
- overdueOnly: true if any loan has arrears > 0
- loanClass: "Current"|"OLEM"|"Substandard"|"Doubtful"|"Loss" — regulatory classification based on DPD
- borrowerName: partial borrower name to search (string)
- maturityDays: loans maturing within N days (day-based only)
- maturityMonths: loans maturing within N months (month-based only)
- maturityThisMonth: true for "this month" / "current month"
- maturityNextMonth: true for "next month" / "coming month"
- officer: partial officer name (string)
- maxDaysToNext: loans with next instalment due within N days
- instalmentOverdue: true if instalment already past due
- openedAfter: ISO date — loans opened after this date
- openedBefore: ISO date — loans opened before this date

RULES:
- Use maturityDays OR maturityMonths, never both
- maturityThisMonth/NextMonth override maturityDays/maturityMonths
- "maturing soon" → maturityDays: 30
- "last year" → openedAfter + openedBefore spanning last calendar year
- "overdue" alone → overdueOnly: true; "overdue amount above X" → minOverdue: X
- Combined example: "loss class salary loans assigned to Mensah" → loanClass:"Loss", product:"salary", officer:"Mensah"

Query: "${query}"

Respond with ONLY the JSON object, no other text.`

  const result = await aiCall(prompt, { maxTokens: 256 })
  const jsonMatch = result.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse query')
  const parsed = JSON.parse(jsonMatch[0])

  const filters: NLQFilters = {
    product: null, minCommit: null, maxCommit: null, minDPD: null, maxDPD: null,
    overdueOnly: false, maturityDays: null, maturityMonths: null,
    maturityThisMonth: false, maturityNextMonth: false,
    minOverdue: null, maxOverdue: null, officer: null,
    maxDaysToNext: null, instalmentOverdue: false,
    openedAfter: null, openedBefore: null, loanClass: null, borrowerName: null,
  }

  if (parsed.product) filters.product = parsed.product
  if (parsed.minCommit != null) filters.minCommit = parsed.minCommit
  if (parsed.maxCommit != null) filters.maxCommit = parsed.maxCommit
  if (parsed.minDPD != null) filters.minDPD = parsed.minDPD
  if (parsed.maxDPD != null) filters.maxDPD = parsed.maxDPD
  if (parsed.overdueOnly) filters.overdueOnly = true
  if (parsed.maturityDays != null) filters.maturityDays = parsed.maturityDays
  if (parsed.maturityMonths != null) filters.maturityMonths = parsed.maturityMonths
  if (parsed.maturityThisMonth) filters.maturityThisMonth = true
  if (parsed.maturityNextMonth) filters.maturityNextMonth = true
  if (parsed.minOverdue != null) filters.minOverdue = parsed.minOverdue
  if (parsed.maxOverdue != null) filters.maxOverdue = parsed.maxOverdue
  if (parsed.officer != null) filters.officer = parsed.officer
  if (parsed.maxDaysToNext != null) filters.maxDaysToNext = parsed.maxDaysToNext
  if (parsed.instalmentOverdue) filters.instalmentOverdue = true
  if (parsed.openedAfter != null) filters.openedAfter = parsed.openedAfter
  if (parsed.openedBefore != null) filters.openedBefore = parsed.openedBefore
  if (parsed.loanClass != null) filters.loanClass = parsed.loanClass
  if (parsed.borrowerName != null) filters.borrowerName = parsed.borrowerName

  return filters
}

export async function aiColumnFallback(
  headerTexts: string[],
  detected: Record<string, number>
): Promise<Record<string, number>> {
  if (!hasAIKey()) return detected

  const required = [
    'repaymentAccount', 'productName', 'customerName', 'openingDate',
    'maturityDate', 'term', 'commitment', 'principal', 'interestRate', 'overdue'
  ]
  const missing = required.filter(k => detected[k] === undefined)
  if (missing.length === 0) return detected

  const mappedIndices = new Set(Object.values(detected))
  const unmapped = headerTexts
    .map((h, i) => ({ index: i, header: h, mapped: mappedIndices.has(i) }))
    .filter(h => !h.mapped)

  if (unmapped.length === 0) return detected

  try {
    const prompt = `You are a data mapping assistant. I have a loan portfolio file with these column headers. Some columns could not be auto-mapped. Suggest mappings for the missing fields.

ALL HEADERS (index: name):
${headerTexts.map((h, i) => `${i}: ${h}`).join('\n')}

ALREADY MAPPED: ${JSON.stringify(detected)}

UNMAPPED HEADERS:
${unmapped.map(h => `${h.index}: ${h.header}`).join('\n')}

MISSING FIELDS NEEDING MAPPING: ${missing.join(', ')}

Respond ONLY as JSON: {"fieldName": columnIndex, ...}
Only include fields you are confident about. Example: {"overdue": 15, "term": 8}`

    const result = await aiCall(prompt, { temperature: 0.1, maxTokens: 200 })
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0])
      for (const [field, idx] of Object.entries(suggestions)) {
        if (
          missing.includes(field) &&
          typeof idx === 'number' &&
          idx >= 0 &&
          idx < headerTexts.length &&
          detected[field] === undefined
        ) {
          detected[field] = idx
        }
      }
    }
  } catch {
    // AI column mapping is optional — silently ignore
  }

  return detected
}
