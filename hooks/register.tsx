import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { chartRows } from './token-chart'
import { formatTokens } from './token-format'
import { addTokensAndPrune, completeSliceTotals, tokensInSpan } from './token-series'

const LAYERS = [
  { label: '1m', windowSeconds: 60, color: '#88c0d0' },
  { label: '10m', windowSeconds: 600, color: '#5e81ac' },
  { label: '1h', windowSeconds: 3600, color: '#475066' },
]
const SLICE_COUNTS = [60, 30, 20, 15, 12, 10, 6, 5, 4, 3, 2, 1]
const HISTORY_SECONDS = 2 * Math.max(...LAYERS.map(layer => layer.windowSeconds))
const X_LAYER_LABELS_WIDTH = LAYERS.reduce((sum, layer) => sum + layer.label.length + 2, 0)
const Y_AXIS_WIDTH = 5
const LEGEND_WIDTH = 12
const CONTEXT_COLORS = [
  { belowPercent: 60, color: 'text' },
  { belowPercent: 85, color: 'warning' },
  { belowPercent: Infinity, color: 'error' },
]

const buckets = atom({ plugin: 'token-rate', key: 'buckets' } as const, {})

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'metrics', description: 'Show or hide the token metrics band', immediate: true })
    $.clock.every(1000, () => $.ui.invalidate('ui.render'))

    return next(e)
  })

  on('command.run', { command: 'metrics' }, async $ => {
    const wasVisible = (await $.store.get('isVisible')) !== false
    await $.store.set('isVisible', !wasVisible)
    $.ui.invalidate('ui.render')

    return { text: wasVisible ? 'Token metrics hidden' : 'Token metrics shown' }
  })

  on('turn.step', async function* ($, e, next) {
    const result = yield* next(e)
    if (result.usage !== null) {
      const { input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens } = result.usage
      const tokens = input_tokens + cache_creation_input_tokens + cache_read_input_tokens + output_tokens
      const second = Math.floor((await $.clock.now()) / 1000)
      await update($, buckets, current => addTokensAndPrune(current, second, tokens, HISTORY_SECONDS))
    }

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const availableColumns = e.props.bodyColumns - Y_AXIS_WIDTH - LEGEND_WIDTH
    const sliceCount = SLICE_COUNTS.find(count => count <= availableColumns)
    if (e.props.hasSurvey || sliceCount === undefined || (await $.store.get('isVisible')) === false) {
      return next(e)
    }

    const columnsPerSlice = Math.floor(availableColumns / sliceCount)
    const chartWidth = sliceCount * columnsPerSlice
    const { Box, Text } = $.ui.resolve(e)
    const history = await read($, buckets)
    const now = Math.floor((await $.clock.now()) / 1000)
    const { percent: contextPercent, window: contextWindow } = (await $.session.usage()).context
    const layers = LAYERS.map(layer => ({
      color: layer.color,
      totals: completeSliceTotals(history, now, layer.windowSeconds, sliceCount),
    }))
    const hasLayerLabels = chartWidth >= X_LAYER_LABELS_WIDTH + 'now'.length

    return (
      <Box flexDirection="column">
        <Box>
          <Box flexDirection="column">
            {chartRows(layers, columnsPerSlice).map(({ yLabel, cells }) => (
              <Box>
                <Text dimColor>{yLabel.padStart(Y_AXIS_WIDTH - 1)}┤</Text>
                {cells.map(({ glyphs, ...style }) => (
                  <Text {...style}>{glyphs}</Text>
                ))}
              </Box>
            ))}
          </Box>
          <Box flexDirection="column">
            {LAYERS.map(layer => (
              <Text color={layer.color}>
                {` ■ ${layer.label.padEnd(3)} ${formatTokens(tokensInSpan(history, now - layer.windowSeconds, now))}`}
              </Text>
            ))}
            {contextPercent === undefined ? (
              <Text dimColor> —</Text>
            ) : (
              <Text color={CONTEXT_COLORS.find(level => contextPercent < level.belowPercent)!.color}>
                {` ${contextPercent}% ${formatTokens(contextWindow)}`}
              </Text>
            )}
          </Box>
        </Box>
        <Box>
          <Text>{' '.repeat(Y_AXIS_WIDTH)}</Text>
          {hasLayerLabels &&
            LAYERS.map(layer => (
              <Text color={layer.color}>{`-${layer.label} `}</Text>
            ))}
          <Text dimColor>{'now'.padStart(hasLayerLabels ? chartWidth - X_LAYER_LABELS_WIDTH : chartWidth)}</Text>
        </Box>
      </Box>
    )
  })
}
