import { useEffect, useMemo, useState } from 'react'
import { createTimelineIndex, loadCaseTimelines } from './lib/case-timelines.mjs'

export default function useCaseTimelines(legacy) {
 const [state, setState] = useState({ status: 'loading' })
 useEffect(() => {
  const controller = new AbortController()
  loadCaseTimelines(import.meta.env.BASE_URL, { signal: controller.signal })
   .then(bundle => { if (!controller.signal.aborted) setState({ status: 'ready', bundle }) })
   .catch(() => { if (!controller.signal.aborted) setState({ status: 'error' }) })
  return () => controller.abort()
 }, [])
 return useMemo(() => {
  if (state.status === 'error') return { status: 'error' }
  if (state.status !== 'ready' || !legacy) return { status: 'loading' }
  try {
   return { status: 'ready', index: createTimelineIndex(state.bundle, legacy) }
  } catch {
   return { status: 'error' }
  }
 }, [state, legacy])
}
