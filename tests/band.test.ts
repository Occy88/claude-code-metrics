import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

import { completeSliceTotals } from '../hooks/token-series'

const answerStepsWithInputTokens = (on: On, inputTokensByStep: number[]) =>
  on('turn.step', async function* (_, e) {
    return {
      turnId: 't',
      index: e.index,
      answer: '',
      toolUses: [],
      stopReason: 'end_turn',
      usage: { input_tokens: inputTokensByStep[e.index]!, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, model: 'm' },
    }
  })

const runStep = async ($: Engine, index: number) => {
  for await (const _ of $.turn.step({ turnId: 't', index, model: 'm', messageCount: 1 })) {
  }
}

const mountBand = ($: Engine) =>
  $.ui.mount({
    plugin: 'token-rate',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 10, bodyColumns: 77, scroll: { offset: 0, bodyRows: 10 }, view: {} },
  })

test('a step passes its chunks and result through untouched and adds its four usage counts to the current second', async ($, on) => {
  mock.clock(on, { now: 1_000_000_500 })
  const chunk = { kind: 'text', index: 0, text: 'answer' } as const
  const stepResult = {
    turnId: 't',
    index: 0,
    answer: 'answer',
    toolUses: [],
    stopReason: 'end_turn',
    usage: { input_tokens: 1, output_tokens: 2, cache_read_input_tokens: 3, cache_creation_input_tokens: 4, model: 'm' },
  } as const
  let writtenBuckets: unknown
  on('state.set', { plugin: 'token-rate', key: 'buckets' }, async ($, e, next) => {
    writtenBuckets = e.value
    return next(e)
  })
  on('turn.step', async function* () {
    yield chunk
    return stepResult
  })

  const stream = $.turn.step({ turnId: 't', index: 0, model: 'm', messageCount: 1 })
  const chunks: unknown[] = []
  let received = await stream.next()
  while (!received.done) {
    chunks.push(received.value)
    received = await stream.next()
  }

  expect(chunks).toEqual([chunk])
  expect(received.value).toEqual(stepResult)
  expect(writtenBuckets).toEqual({ 1_000_000: 10 })
})

test("a step's write keeps the bucket at the start of the oldest 1h slice the narrowest chart reads", async ($, on) => {
  const clock = mock.clock(on, { now: (3_600_000 - 7200) * 1000 })
  let writtenBuckets = {}
  on('state.set', { plugin: 'token-rate', key: 'buckets' }, async ($, e, next) => {
    writtenBuckets = e.value
    return next(e)
  })
  answerStepsWithInputTokens(on, [1_000_000, 1])

  await runStep($, 0)
  await clock.set(3_600_000 * 1000)
  await runStep($, 1)

  expect(completeSliceTotals(writtenBuckets, 3_600_000, 3600, 1)).toEqual([1_000_000])
})

test('the band paints layers front to back on log-scale rows with legend and context', async ($, on) => {
  const clock = mock.clock(on, { now: 999_995_000 })
  mock.store(on)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200_000, percent: 63 }, rateLimits: [] } }))
  answerStepsWithInputTokens(on, [70_000, 30_000])

  await runStep($, 0)
  await clock.set(999_999_000)
  await runStep($, 1)
  await clock.set(1_000_001_000)
  const ui = await mountBand($)

  expect((await ui.find({ type: 'Text', text: '▆' }))?.props).toMatchObject({ color: '#88c0d0', backgroundColor: '#5e81ac' })
  expect((await ui.findAll({ type: 'Text', text: /┤$/ })).map(label => label.text)).toEqual([
    '  5M┤',
    '  1M┤',
    '500k┤',
    '100k┤',
    ' 50k┤',
    ' 10k┤',
  ])
  expect(await ui.find({ type: 'Text', text: ' ■ 1m  100k' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: ' 63% 200k' })).toBeDefined()
})

test('/metrics hides the band and shows it again, with the steps made while hidden counted', async ($, on) => {
  const clock = mock.clock(on, { now: 1_000_000_000 })
  mock.store(on)
  on('session.usage', async () => ({ value: { startedAt: 0, context: { window: 200_000 }, rateLimits: [] } }))
  on('ui.render', { component: 'AbovePrompt' }, async () => ({ type: 'Box' }))
  answerStepsWithInputTokens(on, [20_000])
  const metrics = { command: 'metrics', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const
  const ui = await mountBand($)
  expect(await ui.find({ type: 'Text', text: /┤$/ })).toBeDefined()

  expect((await $.command.run(metrics)).text).toBe('Token metrics hidden')
  expect(await ui.find({ type: 'Text', text: /┤$/ })).toBeUndefined()

  await runStep($, 0)
  await clock.advance(1000)

  expect((await $.command.run(metrics)).text).toBe('Token metrics shown')
  expect(await ui.find({ type: 'Text', text: ' ■ 1m  20k' })).toBeDefined()
})
