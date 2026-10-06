export type TokenBuckets = Record<string, number>

declare module 'claude-code' {
  interface PluginState {
    'cc-metrics': { buckets: TokenBuckets }
  }
}
