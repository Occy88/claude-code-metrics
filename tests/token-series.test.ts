import { expect, test } from 'claude-code/testing'

import { completeSliceTotals } from '../hooks/token-series'

test('a bucket holds its slice while the slice after it fills, then moves one slice left a second after that one ends', () => {
  const buckets = { 130: 500 }
  const whileFilling = completeSliceTotals(buckets, 145, 600, 60)

  expect(whileFilling.at(-1)).toBe(500)
  expect(completeSliceTotals(buckets, 150, 600, 60)).toEqual(whileFilling)
  expect(completeSliceTotals(buckets, 151, 600, 60)).toEqual([...whileFilling.slice(1), 0])
})
