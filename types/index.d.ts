export type TokenBuckets = Record<string, number>

declare module 'claude-code' {
  interface PluginState {
    'token-rate': { buckets: TokenBuckets }
  }
}
