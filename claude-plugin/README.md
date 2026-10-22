# PineDev for Claude

Write robust TradingView Pine Script v6 strategies and validate them the way quants do — from inside your own Claude, on your own Claude plan.

## Install (Claude Code)

```
/plugin marketplace add pine-dev/pinedev-claude
/plugin install pinedev@pinedev
/mcp            # choose "pinedev" and log in — PineDev opens in your browser, press Allow
```

Then just ask: *"Use PineDev to validate an opening-range breakout on NQ futures, 5-minute chart."*

## What's inside

- **pine-v6-strategy** skill — writes and fixes Pine v6 strategies from a protocol scaffold (costs, date window, no lookahead), with the full v6 built-in reference.
- **validate-strategy** skill — runs PineDev's seven-stage protocol: hypothesis → build → in-sample → stress test → one-shot out-of-sample → verdict → incubation.
- **pinedev** connection — PineDev's MCP server (studies, uploads, deflated Sharpe, Monte Carlo, verdicts). Your studies also appear at https://www.pine-dev.com.

## Claude desktop / claude.ai

No plugin needed: Settings → Connectors → Add custom connector → `https://www.pine-dev.com/api/mcp`.

## Maintainers

Generated files (`.mcp.json`, `skills/pine-v6-strategy/reference.md`) come from the PineDev app repo: `PINEDEV_URL=https://… npm run plugin:build`.
