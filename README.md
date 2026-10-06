# token-rate

Live token usage for the current Claude Code session (including subagents), drawn above the prompt.

![token-rate](docs/screenshot.png)

## Install

```
claude plugin marketplace add Occy88/claude-code-metrics && claude plugin install token-rate@claude-code-metrics
```

## Usage

`/metrics` toggles the chart.

Front to back: last 1 minute, 10 minutes, 1 hour. Height is tokens per time slice; the legend shows each window's total and context fill.
