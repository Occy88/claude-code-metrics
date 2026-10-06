import type { TokenBuckets } from '../types'

/**
 * Adds `tokens` to the bucket of `second` and drops buckets older than `second − historySeconds`.
 */
export const addTokensAndPrune = (buckets: TokenBuckets, second: number, tokens: number, historySeconds: number): TokenBuckets => ({
  ...Object.fromEntries(Object.entries(buckets).filter(([kept]) => Number(kept) >= second - historySeconds)),
  [second]: (buckets[second] ?? 0) + tokens,
})

/**
 * Sum of the buckets of the whole seconds in `[from, to)`.
 */
export const tokensInSpan = (buckets: TokenBuckets, from: number, to: number): number =>
  Array.from({ length: to - from }, (_, offset) => buckets[from + offset] ?? 0).reduce((sum, tokens) => sum + tokens, 0)

/**
 * Totals of the last `sliceCount` complete slices of `windowSeconds / sliceCount` seconds, oldest first, with slice
 * boundaries at multiples of the slice length; a slice is complete from one second after its end, so the newest
 * slice ends at or before `nowSecond − 1`.
 */
export const completeSliceTotals = (buckets: TokenBuckets, nowSecond: number, windowSeconds: number, sliceCount: number): number[] => {
  const sliceSeconds = windowSeconds / sliceCount
  const newestEnd = Math.floor((nowSecond - 1) / sliceSeconds) * sliceSeconds
  return Array.from({ length: sliceCount }, (_, slice) => {
    const start = newestEnd - (sliceCount - slice) * sliceSeconds
    return tokensInSpan(buckets, start, start + sliceSeconds)
  })
}
