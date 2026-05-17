import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Loan, ComparisonResult } from '@/types'
import { runComparison } from '@/lib/comparison'

interface CompareContextValue {
  baseline: Loan[]
  current: Loan[]
  results: ComparisonResult[]
  filter: string
  searchTerm: string
  pipelineSteps: Record<string, string>
  loading: boolean
  setBaseline: (loans: Loan[]) => void
  setCurrent: (loans: Loan[]) => void
  runCompare: () => void
  setFilter: (f: string) => void
  setSearchTerm: (t: string) => void
  clearCompare: () => void
  setPipelineStep: (id: string, status: string) => void
  setLoading: (v: boolean) => void
  getFilteredResults: () => ComparisonResult[]
}

const CompareContext = createContext<CompareContextValue | null>(null)

export function CompareProvider({ children }: { children: ReactNode }) {
  const [baseline, setBaselineState] = useState<Loan[]>([])
  const [current, setCurrentState] = useState<Loan[]>([])
  const [results, setResults] = useState<ComparisonResult[]>([])
  const [filter, setFilterState] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [pipelineSteps, setPipelineSteps] = useState<Record<string, string>>({})
  const [loading, setLoadingState] = useState(false)

  const setBaseline = useCallback((loans: Loan[]) => {
    setBaselineState(loans)
    setPipelineSteps(prev => ({ ...prev, p1: 'done' }))
  }, [])

  const setCurrent = useCallback((loans: Loan[]) => {
    setCurrentState(loans)
    setPipelineSteps(prev => ({ ...prev, p2: 'done' }))
  }, [])

  const runCompare = useCallback(() => {
    if (baseline.length === 0 || current.length === 0) return
    setPipelineSteps(prev => ({ ...prev, p3: 'active', p4: 'active' }))
    const res = runComparison(baseline, current)
    setResults(res)
    setPipelineSteps(prev => ({ ...prev, p3: 'done', p4: 'done' }))
  }, [baseline, current])

  const setFilter = useCallback((f: string) => setFilterState(f), [])
  const setLoading = useCallback((v: boolean) => setLoadingState(v), [])
  const setPipelineStep = useCallback((id: string, status: string) => {
    setPipelineSteps(prev => ({ ...prev, [id]: status }))
  }, [])

  const clearCompare = useCallback(() => {
    setBaselineState([])
    setCurrentState([])
    setResults([])
    setFilterState('All')
    setSearchTerm('')
    setPipelineSteps({})
  }, [])

  const getFilteredResults = useCallback((): ComparisonResult[] => {
    let res = results
    if (filter !== 'All') res = res.filter(r => r.status === filter)
    if (searchTerm) res = res.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()))
    return res
  }, [results, filter, searchTerm])

  return (
    <CompareContext.Provider value={{
      baseline, current, results, filter, searchTerm,
      pipelineSteps, loading,
      setBaseline, setCurrent, runCompare,
      setFilter, setSearchTerm, clearCompare,
      setPipelineStep, setLoading,
      getFilteredResults,
    }}>
      {children}
    </CompareContext.Provider>
  )
}

export function useCompare() {
  const ctx = useContext(CompareContext)
  if (!ctx) throw new Error('useCompare must be used within CompareProvider')
  return ctx
}
