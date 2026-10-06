import { expect, test } from 'claude-code/testing'

import { chartRows } from '../hooks/token-chart'

test('a total exactly at a row bound fills exactly the rows below it, one token more inks the next row', () => {
  const rows = chartRows([{ color: '#88c0d0', totals: [50_000, 50_001, 10_000] }], 1)

  expect(rows.map(row => row.cells.map(cell => cell.glyphs).join(''))).toEqual(['   ', '   ', '   ', '   ', ' ▁ ', '██ '])
})
