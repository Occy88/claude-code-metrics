const TOKEN_UNITS = [
  { below: 999.5, divisor: 1, suffix: '', digits: 0 },
  { below: 9_950, divisor: 1e3, suffix: 'k', digits: 1 },
  { below: 999_500, divisor: 1e3, suffix: 'k', digits: 0 },
  { below: 9_950_000, divisor: 1e6, suffix: 'M', digits: 1 },
  { below: 999_500_000, divisor: 1e6, suffix: 'M', digits: 0 },
  { below: 9_950_000_000, divisor: 1e9, suffix: 'B', digits: 1 },
  { below: Infinity, divisor: 1e9, suffix: 'B', digits: 0 },
]

/**
 * `tokens` with a k, M or B suffix and no trailing `.0`, e.g. `950`, `1k`, `2.5k`, `140k`, `1M`.
 */
export const formatTokens = (tokens: number): string => {
  const unit = TOKEN_UNITS.find(candidate => tokens < candidate.below)!
  return `${(tokens / unit.divisor).toFixed(unit.digits).replace(/\.0$/, '')}${unit.suffix}`
}
