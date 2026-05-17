import { useRef, useState, useCallback } from 'react'
import { usePortfolio } from '@/context/PortfolioContext'
import { useApp } from '@/context/AppContext'
import { parseFileContent, processRawData } from '@/lib/parser'
import { detectColumns } from '@/lib/column-detector'
import { aiColumnFallback } from '@/lib/ai/nlq'
import { secureSet, secureGet, secureDel, isVaultUnlocked, SNAP_INDEX_KEY } from '@/lib/vault'
import type { SnapshotMeta } from '@/types'
import Skeleton from '@/components/shared/Skeleton'
import styles from './FileDropZone.module.css'

const MAX_FILE_SIZE_MB = 10

export default function FileDropZone() {
  const { showToast, showSpinner, hideSpinner } = useApp()
  const { dispatch } = usePortfolio()
  const [over, setOver] = useState(false)
  const [parsing, setParsing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file?.name.match(/\.(html|htm|csv)$/i)) {
      showToast('Please select an HTML or CSV file', 'fail')
      return
    }
    if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
      showToast('File too large', 'fail')
      return
    }

    showSpinner()
    setParsing(true)
    dispatch({ type: 'SET_PIPELINE_STEP', id: 'p1', status: 'active' })
    dispatch({ type: 'ADD_LOG', message: 'Parsing data…', level: 'info' })

    try {
      const parsed = await parseFileContent(file)
      let detected = detectColumns(parsed.headers)
      dispatch({ type: 'ADD_LOG', message: `Column detection: ${Object.keys(detected).length} columns mapped`, level: 'ok' })

      const mappedCount = Object.keys(detected).length
      detected = await aiColumnFallback(parsed.headers, detected)
      const aiCount = Object.keys(detected).length - mappedCount
      if (aiCount > 0) {
        dispatch({ type: 'ADD_LOG', message: `AI assisted: ${aiCount} additional columns mapped`, level: 'ok' })
      }

      dispatch({ type: 'SET_PIPELINE_STEP', id: 'p1', status: 'done' })
      dispatch({ type: 'SET_PIPELINE_STEP', id: 'p2', status: 'active' })
      dispatch({ type: 'SET_PIPELINE_STEP', id: 'p4', status: 'active' })

      const result = processRawData(parsed.headers, parsed.rows, {
        log: (msg, type) => dispatch({ type: 'ADD_LOG', message: msg, level: type || 'info' }),
        ci: detected,
        officerMap: {},
      })

      dispatch({
        type: 'LOAD_DATA',
        loans: result.data,
        meta: result.meta,
        headers: parsed.headers,
        ci: detected,
        fileName: file.name,
      })

      dispatch({ type: 'SET_PIPELINE_STEP', id: 'p2', status: 'done' })
      dispatch({ type: 'SET_PIPELINE_STEP', id: 'p3', status: 'done' })
      dispatch({ type: 'SET_PIPELINE_STEP', id: 'p4', status: 'done' })
      dispatch({ type: 'SET_PIPELINE_STEP', id: 'p5', status: 'done' })

      hideSpinner()
      setParsing(false)
      showToast(`${result.data.length} records loaded`, 'ok')

      if (isVaultUnlocked()) {
        try {
          const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          const overdueLoans = result.data.filter(r => r.overdue > 0)
          const totalArrears = result.data.reduce((s, r) => s + (r.overdue || 0), 0)
          const dpdRecords = result.data.filter(r => r.dpd > 0)
          const avgDPD = dpdRecords.length > 0
            ? Math.round(dpdRecords.reduce((s, r) => s + r.dpd, 0) / dpdRecords.length)
            : 0

          const meta: SnapshotMeta = {
            id,
            timestamp: new Date().toISOString(),
            filename: file.name,
            loanCount: result.data.length,
            overdueCount: overdueLoans.length,
            totalArrears,
            avgDPD,
          }

          const leanData = result.data.map(({ _cells, ...rest }) => rest)

          await secureSet('snap:' + id, {
            data: leanData,
            meta: result.meta,
            headers: parsed.headers,
            fileName: file.name,
          })

          const index = await secureGet<SnapshotMeta[]>(SNAP_INDEX_KEY) || []
          index.unshift(meta)
          if (index.length > 50) index.length = 50
          await secureSet(SNAP_INDEX_KEY, index)

          const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000
          const staleIds = index.filter(s => new Date(s.timestamp).getTime() < cutoff).map(s => s.id)
          for (const sid of staleIds) {
            await secureDel('snap:' + sid)
          }
          if (staleIds.length > 0) {
            await secureSet(SNAP_INDEX_KEY, index.filter(s => !staleIds.includes(s.id)))
          }
        } catch (err) {
          dispatch({ type: 'ADD_LOG', message: `Snapshot save failed: ${err instanceof Error ? err.message : String(err)}`, level: 'warn' })
        }
      }
    } catch (err) {
      hideSpinner()
      const msg = err instanceof Error ? err.message : 'File parse error'
      dispatch({ type: 'ADD_LOG', message: msg, level: 'err' })
      showToast(msg, 'fail')
    }
  }, [dispatch, showToast, showSpinner, hideSpinner])

  return (
    <>
      <div
        className={`${styles.dz} ${over ? styles.over : ''} ${parsing ? styles.disabled : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true) }}
        onDragLeave={e => { e.preventDefault(); setOver(false) }}
        onDrop={e => {
          e.preventDefault()
          setOver(false)
          if (e.dataTransfer.files.length > 1) {
            showToast('Only the first file will be processed', 'warn')
          }
          if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0])
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
        role="button"
        tabIndex={0}
      >
        <div className={styles.icon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
        </div>
        <div className={styles.title}>Drop Your Loan File Here</div>
        <div className={styles.sub}>
          Drag & drop your HTML or CSV file here or{' '}
          <b onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}>browse</b>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,.csv"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
      />
      {parsing && (
        <div className={styles.skeletonWrap}>
          <div className={styles.skeletonStats}>
            <Skeleton variant="card" />
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
          <div className={styles.skeletonTable}>
            <Skeleton lines={6} />
          </div>
        </div>
      )}
    </>
  )
}
