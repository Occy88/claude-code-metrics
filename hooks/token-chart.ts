import { formatTokens } from './token-format'

type ChartLayer = { color: string; totals: number[] }

const ROW_BOUNDS = [10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000]
const BLOCKS = ' ▁▂▃▄▅▆▇█'
const GRID_SHADES = ['#1e1e1e', '#2b2b2b']

/**
 * One row per band of `ROW_BOUNDS` (row i covers `[ROW_BOUNDS[i], ROW_BOUNDS[i + 1])`, bottom up), top first, of
 * `layers` (front first, one total per slice, equal lengths), one cell per slice `columnsPerSlice` columns wide, in
 * eighth-blocks linear in log10 within each row's bounds; totals at or below the lowest bound draw nothing, at or above
 * the highest fill the column.
 * A cell takes the glyph and colour of the frontmost layer reaching into it, and as background the colour of the
 * first layer behind that one which fills it, else the grid shade of its slice and row (a checkerboard of
 * `GRID_SHADES`). Each row carries its lower bound as its label.
 */
export const chartRows = (layers: ChartLayer[], columnsPerSlice: number) => {
  const height = ROW_BOUNDS.length - 1

  return Array.from({ length: height }, (_, rowFromTop) => {
    const row = height - 1 - rowFromTop
    const lower = ROW_BOUNDS[row]!
    const upper = ROW_BOUNDS[row + 1]!
    const cells = layers[0]!.totals.map((_, slice) => {
      const covers = layers.map(({ color, totals }) => ({
        color,
        fill: Math.min(8, Math.max(0, Math.ceil(((Math.log10(totals[slice]!) - Math.log10(lower)) / (Math.log10(upper) - Math.log10(lower))) * 8))),
      }))
      const frontIndex = covers.findIndex(cover => cover.fill > 0)
      const front = covers[frontIndex]
      const behind = covers.slice(frontIndex + 1).find(cover => cover.fill === 8)
      return {
        glyphs: BLOCKS.charAt(front?.fill ?? 0).repeat(columnsPerSlice),
        color: front?.color,
        backgroundColor: behind?.color ?? GRID_SHADES[(slice + row) % GRID_SHADES.length]!,
      }
    })
    return { yLabel: formatTokens(lower), cells }
  })
}
