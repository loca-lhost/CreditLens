import type { ProductType } from '@/types'

interface ProductTypeRule {
  type: ProductType
  patterns: string[]
}

export const PRODUCT_TYPE_RULES: ProductTypeRule[] = [
  { type: 'agric',    patterns: ['agric', 'cash crop', 'farm', 'seasonal', 'cocoa', 'maize', 'harvest'] },
  { type: 'trading',  patterns: ['trading', 'market', 'susu', 'working capital', 'revolving', 'overdraft'] },
  { type: 'salary',   patterns: ['staff', 'salary', 'payroll', 'employee', 'staff rent', 'rent allowance',
                                   'housing allowance', 'welfare', 'car loan staff', 'personnel'] },
  { type: 'property', patterns: ['building', 'construction', 'mortgage', 'real estate', 'housing',
                                   'property', 'land', 'estate', 'infrastructure', 'facility development'] },
  { type: 'vehicle',  patterns: ['vehicle', 'auto', 'car loan', 'motor', 'transport', 'hire purchase',
                                   'equipment', 'machinery', 'asset finance'] },
  { type: 'sme',      patterns: ['sme', 'small medium', 'enterprise', 'business loan', 'msme', 'micro',
                                   'commercial', 'cooperative', 'group loan', 'solidarity'] },
  { type: 'personal', patterns: ['personal', 'consumer', 'individual', 'retail', 'emergency', 'education',
                                   'school fees', 'medical', 'funeral', 'celebration'] },
  { type: 'std',      patterns: [] },
]

export function getType(name: string): ProductType {
  const n = (name || '').toLowerCase()
  for (const rule of PRODUCT_TYPE_RULES) {
    if (rule.patterns.length === 0) return rule.type
    if (rule.patterns.some(p => n.includes(p))) return rule.type
  }
  return 'std'
}

export const DAYS_PER_MONTH = 30.416
export const WORKING_DAYS_PER_MONTH = 20
export const WEEKS_PER_MONTH = 4

export function toMo(raw: string | null | undefined): number {
  if (!raw) return 0
  const trimmed = raw.trim().toUpperCase()
  if (trimmed.includes('YEAR')) return parseInt(trimmed) * 12 || 0
  if (trimmed.includes('MONTH')) return parseInt(trimmed) || 0
  if (trimmed.includes('WEEK')) return Math.round((parseInt(trimmed) || 0) / WEEKS_PER_MONTH)
  if (trimmed.includes('DAY')) return Math.round((parseInt(trimmed) || 0) / DAYS_PER_MONTH)
  if (trimmed.endsWith('D')) return Math.round(parseFloat(trimmed) / DAYS_PER_MONTH)
  if (trimmed.endsWith('W')) return Math.round(parseFloat(trimmed) / WEEKS_PER_MONTH)
  if (trimmed.endsWith('M')) return parseInt(trimmed) || 0
  if (trimmed.endsWith('Y')) return (parseInt(trimmed) || 0) * 12
  return parseInt(trimmed) || 0
}
