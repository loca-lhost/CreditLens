import { createContext, useContext, useReducer, useCallback, useMemo, type ReactNode, type Dispatch } from 'react'
import type {
  Loan, ProductMeta, NLQFilters, Anomaly, ScheduleData,
  ColumnDef, ProductType,
} from '@/types'
import { filterLoans } from '@/lib/filters'
import { detectAnomalies } from '@/lib/anomalies'

const BUILTIN_COLS: ColumnDef[] = [
  { l: 'Customer Name', k: 'name', cls: '' },
  { l: 'Account No.', k: 'repAcct', cls: 'mn' },
  { l: 'Product', k: 'productName', cls: '', badge: true },
  { l: 'Opening Date', k: 'openingDate', cls: 'mn' },
  { l: 'Maturity Date', k: 'maturityDate', cls: 'mn' },
  { l: 'Term (Mo.)', k: 'termMo', cls: 'mn' },
  { l: 'Loan Amount', k: 'commit', cls: 'mn', num: true },
  { l: 'Rate (%)', k: 'rate', cls: 'mn' },
  { l: 'Arrears (GHS)', k: 'overdue', cls: 'tdv', num: true },
  { l: 'Days Overdue', k: 'dpd', cls: 'tdv', num: true },
  { l: 'Days to Next Instalment', k: 'daysToNext', cls: 'mn', daysCol: true },
  { l: 'Assigned Officer', k: 'officer', cls: '' },
  { l: 'Daily Repayment', k: 'daily', cls: 'tcv', num: true, th: 'thc' },
  { l: 'Weekly Repayment', k: 'weekly', cls: 'tcv', num: true, th: 'thc' },
  { l: 'Monthly Repayment', k: 'monthly', cls: 'tpv', num: true, th: 'thp' },
  { l: 'Bullet Payment', k: 'bullet', cls: 'tgv', num: true, th: 'thg' },
]

const ROWS_PER_LOAD = 200

export interface LogEntry {
  message: string
  type: 'ok' | 'warn' | 'err' | 'info'
  id: number
}

export interface PortfolioState {
  loans: Loan[]
  meta: Record<string, ProductMeta>
  searchTerm: string
  sortCol: string | null
  sortAsc: boolean
  selectedProduct: string
  activeFilter: string
  approachingMaturity: boolean
  nlqFilters: NLQFilters
  officerFilter: string
  officerMap: Record<string, string>
  anomalyFilter: boolean
  anomalies: Anomaly[]
  visibleCols: Set<string>
  columns: ColumnDef[]
  allHeaders: string[]
  visibleRows: number
  page: number
  scheduleData: ScheduleData | null
  logEntries: LogEntry[]
  pipelineSteps: Record<string, string>
  dataLoaded: boolean
  fileName: string
  logCounter: number
}

type PortfolioAction =
  | { type: 'LOAD_DATA'; loans: Loan[]; meta: Record<string, ProductMeta>; headers: string[]; ci: Record<string, number>; fileName: string; officerMap?: Record<string, string> }
  | { type: 'CLEAR_DATA' }
  | { type: 'SET_SEARCH'; term: string }
  | { type: 'SET_SORT'; col: string | null; asc: boolean }
  | { type: 'SET_PRODUCT'; product: string }
  | { type: 'SET_ACTIVE_FILTER'; filter: string }
  | { type: 'TOGGLE_MATURITY' }
  | { type: 'TOGGLE_ANOMALY' }
  | { type: 'SET_NLQ_FILTERS'; filters: NLQFilters }
  | { type: 'SET_OFFICER'; officerKey: string; officerName: string }
  | { type: 'SET_OFFICER_MAP'; map: Record<string, string> }
  | { type: 'SET_VISIBLE_COLS'; cols: Set<string> }
  | { type: 'TOGGLE_COL'; key: string }
  | { type: 'SET_PAGE'; page: number }
  | { type: 'SET_SCHEDULE'; data: ScheduleData }
  | { type: 'ADD_LOG'; message: string; level: 'ok' | 'warn' | 'err' | 'info' }
  | { type: 'SET_PIPELINE_STEP'; id: string; status: string }
  | { type: 'SET_OFFICER_FILTER'; officer: string }
  | { type: 'RESTORE_SNAPSHOT'; loans: Loan[]; meta: Record<string, ProductMeta>; headers: string[]; fileName: string; officerMap?: Record<string, string> }

function createInitialNLQFilters(): NLQFilters {
  return {
    product: null, minCommit: null, maxCommit: null, minDPD: null, maxDPD: null,
    overdueOnly: false, maturityDays: null, maturityMonths: null,
    maturityThisMonth: false, maturityNextMonth: false,
    minOverdue: null, maxOverdue: null, officer: null,
    maxDaysToNext: null, instalmentOverdue: false,
    openedAfter: null, openedBefore: null, loanClass: null, borrowerName: null,
  }
}

function getInitialVisibleCols(): Set<string> {
  try {
    const saved = localStorage.getItem('creditlens_visible_cols')
    if (saved) {
      const parsed = JSON.parse(saved) as string[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return new Set(parsed.filter(k => BUILTIN_COLS.some(c => c.k === k)))
      }
    }
  } catch {
    // ignore bad data
  }
  return new Set(BUILTIN_COLS.map(c => c.k))
}

const initialState: PortfolioState = {
  loans: [],
  meta: {},
  searchTerm: '',
  sortCol: null,
  sortAsc: true,
  selectedProduct: '__ALL__',
  activeFilter: 'all',
  approachingMaturity: false,
  nlqFilters: { ...createInitialNLQFilters() },
  officerFilter: '',
  officerMap: {},
  anomalyFilter: false,
  anomalies: [],
  visibleCols: getInitialVisibleCols(),
  columns: [...BUILTIN_COLS],
  allHeaders: [],
  visibleRows: ROWS_PER_LOAD,
  page: 1,
  scheduleData: null,
  logEntries: [],
  pipelineSteps: {},
  dataLoaded: false,
  fileName: '',
  logCounter: 0,
}

function portfolioReducer(state: PortfolioState, action: PortfolioAction): PortfolioState {
  switch (action.type) {
    case 'LOAD_DATA': {
      const detectedAnomalies = detectAnomalies(action.loans)
      return {
        ...state,
        loans: action.loans,
        meta: action.meta,
        activeFilter: 'all',
        selectedProduct: '__ALL__',
        approachingMaturity: false,
        anomalyFilter: false,
        anomalies: detectedAnomalies,
        nlqFilters: { ...createInitialNLQFilters() },
        searchTerm: '',
        sortCol: null,
        sortAsc: true,
        visibleRows: ROWS_PER_LOAD,
        page: 1,
        visibleCols: new Set(BUILTIN_COLS.map(c => c.k)),
        dataLoaded: true,
        fileName: action.fileName,
        pipelineSteps: { p6: 'done' },
        officerMap: action.officerMap || state.officerMap,
      }
    }
    case 'CLEAR_DATA':
      return {
        ...initialState,
        columns: state.columns,
        officerMap: {},
        logCounter: state.logCounter + 1,
      }
    case 'SET_SEARCH':
      return { ...state, searchTerm: action.term, page: 1 }
    case 'SET_SORT':
      return { ...state, sortCol: action.col, sortAsc: action.asc, page: 1 }
    case 'SET_PRODUCT':
      return { ...state, selectedProduct: action.product, activeFilter: 'all', page: 1 }
    case 'SET_ACTIVE_FILTER':
      return { ...state, activeFilter: action.filter, approachingMaturity: false, page: 1 }
    case 'TOGGLE_MATURITY':
      return { ...state, approachingMaturity: !state.approachingMaturity, page: 1 }
    case 'TOGGLE_ANOMALY':
      return { ...state, anomalyFilter: !state.anomalyFilter, page: 1 }
    case 'SET_NLQ_FILTERS':
      return { ...state, nlqFilters: action.filters, page: 1 }
    case 'SET_OFFICER': {
      const idx = state.loans.findIndex(
        r => (r.repAcct || r.applId) === action.officerKey
      )
      const loans = [...state.loans]
      if (idx >= 0) loans[idx] = { ...loans[idx], officer: action.officerName }
      const officerMap = { ...state.officerMap }
      if (action.officerName) {
        officerMap[action.officerKey] = action.officerName
      } else {
        delete officerMap[action.officerKey]
      }
      return { ...state, loans, officerMap }
    }
    case 'SET_OFFICER_MAP':
      return { ...state, officerMap: action.map }
    case 'SET_VISIBLE_COLS':
      return { ...state, visibleCols: action.cols }
    case 'TOGGLE_COL': {
      const cols = new Set(state.visibleCols)
      if (cols.has(action.key)) cols.delete(action.key)
      else cols.add(action.key)
      return { ...state, visibleCols: cols }
    }
    case 'SET_PAGE':
      return { ...state, page: action.page }
    case 'SET_SCHEDULE':
      return { ...state, scheduleData: action.data }
    case 'ADD_LOG':
      return {
        ...state,
        logEntries: [...state.logEntries, {
          message: action.message,
          type: action.level,
          id: state.logCounter + state.logEntries.length,
        }],
      }
    case 'SET_PIPELINE_STEP':
      return {
        ...state,
        pipelineSteps: { ...state.pipelineSteps, [action.id]: action.status },
      }
    case 'SET_OFFICER_FILTER':
      return { ...state, officerFilter: action.officer }
    case 'RESTORE_SNAPSHOT': {
      const detectedAnomalies = detectAnomalies(action.loans)
      return {
        ...state,
        loans: action.loans,
        meta: action.meta,
        activeFilter: 'all',
        selectedProduct: '__ALL__',
        approachingMaturity: false,
        anomalyFilter: false,
        anomalies: detectedAnomalies,
        nlqFilters: { ...createInitialNLQFilters() },
        searchTerm: '',
        sortCol: null,
        sortAsc: true,
        visibleRows: ROWS_PER_LOAD,
        page: 1,
        visibleCols: new Set(BUILTIN_COLS.map(c => c.k)),
        dataLoaded: true,
        fileName: action.fileName,
        pipelineSteps: { p6: 'done' },
        officerMap: action.officerMap || state.officerMap,
        allHeaders: action.headers,
      }
    }
    default:
      return state
  }
}

interface PortfolioContextValue {
  state: PortfolioState
  dispatch: Dispatch<PortfolioAction>
  filteredLoans: Loan[]
  stats: {
    total: number
    overdueCount: number
    totalOverdue: number
    avgDPD: number
  }
  productStats: Record<string, { count: number; overdue: number; overdueCount: number; commit: number; type: ProductType }>
  totalCommit: number
}

const PortfolioContext = createContext<PortfolioContextValue | null>(null)

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(portfolioReducer, initialState)

  const anomalyIds = useMemo(() => new Set(state.anomalies.map(a => a.id)), [state.anomalies])

  const filterDeps = useMemo(() => ({
    activeFilter: state.activeFilter,
    selectedProduct: state.selectedProduct,
    approachingMaturity: state.approachingMaturity,
    searchTerm: state.searchTerm,
    nlqFilters: state.nlqFilters,
    officerFilter: state.officerFilter,
    anomalyFilter: state.anomalyFilter,
    anomalyIds,
    sortCol: state.sortCol,
    sortAsc: state.sortAsc,
  }), [state.activeFilter, state.selectedProduct, state.approachingMaturity, state.searchTerm, state.nlqFilters, state.officerFilter, state.anomalyFilter, anomalyIds, state.sortCol, state.sortAsc])

  const filteredLoans = useMemo(() => filterLoans(state.loans, filterDeps), [state.loans, filterDeps])

  const stats = useMemo(() => {
    const overdueLoans = state.loans.filter(r => r.overdue > 0)
    const totalOverdue = state.loans.reduce((s, r) => s + (r.overdue || 0), 0)
    const dpdRecords = state.loans.filter(r => r.dpd > 0)
    const avgDPD = dpdRecords.length > 0
      ? Math.round(dpdRecords.reduce((s, r) => s + r.dpd, 0) / dpdRecords.length)
      : 0
    return {
      total: state.loans.length,
      overdueCount: overdueLoans.length,
      totalOverdue,
      avgDPD,
    }
  }, [state.loans])

  const productStats = useMemo(() => {
    const ps: Record<string, { count: number; overdue: number; overdueCount: number; commit: number; type: ProductType }> = {}
    let totalCommit = 0
    state.loans.forEach(r => {
      const k = r.productName || 'Unknown'
      if (!ps[k]) ps[k] = { count: 0, overdue: 0, overdueCount: 0, commit: 0, type: r.type }
      ps[k].count++
      ps[k].commit += r.commit || 0
      totalCommit += r.commit || 0
      if (r.overdue > 0) { ps[k].overdue += r.overdue; ps[k].overdueCount++ }
    })
    return { ps, totalCommit }
  }, [state.loans])

  return (
    <PortfolioContext.Provider value={{
      state,
      dispatch,
      filteredLoans,
      stats,
      productStats: productStats.ps,
      totalCommit: productStats.totalCommit,
    }}>
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider')
  return ctx
}

export { BUILTIN_COLS, ROWS_PER_LOAD }
