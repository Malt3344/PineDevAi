---
name: pine-v6-strategy
description: Write or fix a TradingView Pine Script v6 trading strategy that can be honestly backtested — with realistic costs, a protocol date window, no lookahead or repainting, and few parameters. Use whenever the user wants a Pine Script strategy written, improved, optimised or debugged, or pastes a TradingView compiler error.
---

# Writing Pine Script v6 strategies for PineDev

The goal is not the best-looking backtest. It is a strategy whose backtest can be trusted — one that will pass PineDev's validation protocol because it is robust, not because it was fitted. "Optimal" means: a clear reason for the edge, the fewest parameters that express it, realistic costs, and results that do not collapse when a parameter moves a little.

## Always start from the scaffold

Start every strategy from [template.pine](template.pine). It already has what PineDev's Build stage checks for:

- `strategy()` with `commission_type`/`commission_value`, `slippage` and an explicit `default_qty_type`/`default_qty_value`. Set costs realistic for the market (futures: cash per contract; crypto: ~0.04–0.1% per side; FX: spread in pips via slippage).
- `Window start` / `Window end` `input.time()` inputs and an `inWindow` gate on every entry, plus `strategy.close_all()` after the window. This is how the same script runs the in-sample and the out-of-sample test.
- Risk per unit fixed at entry; stop and target from it.

If the study has a locked hypothesis (call PineDev's `get_study`), the window defaults must be its in-sample dates and the signals must implement its locked entry and exit rules exactly — nothing added.

## Rules for the code

1. Return the COMPLETE script in one ```pine block, starting with `//@version=6`. Never a fragment or a diff.
2. `strategy()`, not `indicator()`, unless the user explicitly wants an indicator — only strategies produce a trade list.
3. Explicit `if`/`else` for logic, not chained ternaries.
4. No lookahead: never `barmerge.lookahead_on`; for higher-timeframe data use `request.security(syminfo.tickerid, tf, expr[1], lookahead = barmerge.lookahead_off)` or confirmed values. Never `calc_on_every_tick = true`.
5. `strategy.entry` for directional positions; `strategy.order` only when unmanaged orders are truly needed — never mixed without saying why.
6. Keep inputs to the few the rules need (≤ 5 is a good target). Every extra input multiplies the ways to overfit.
7. Keep plots minimal (TradingView allows 64 plot calls).

## Mistakes that keep showing up in generated Pine — check every script

- `time(timeframe, session)` returns `series int` (na outside the session), not a bool: use `not na(time(timeframe.period, sess))`.
- Declarations are `name = value` or `type name = value`; `name type = value` is invalid.
- Position variables are `strategy.position_size`, `strategy.position_avg_price`, `strategy.position_entry_name`. There is no `strategy.position_price`.
- Pine has no methods on numbers or strings: `str.tonumber(x)`, not `x.parseInt()`.
- Tuple destructuring `[a, b] = f()` only when `f` returns a tuple.
- `request.security`'s first argument is a ticker id such as `syminfo.tickerid`.
- Counting bars is not counting minutes; derive minute-based rules from `time`.
- `var` for state that must persist across bars; series vs simple: arguments that require `simple` (e.g. many `length` params) cannot take a value that changes bar to bar.

## Verify before you answer

- Unsure whether a built-in exists or what its parameters are? Look it up in [reference.md](reference.md) (every Pine v6 signature) or with PineDev's `pine_reference` tool. If it is not there, it does not exist — solve it with what is there.
- Run PineDev's `lint_script` tool on the finished script and fix every FAIL.
- When attached to a study, save it with `save_script`.

## When the user pastes a compiler error

Find the line it points to, fix the root cause, return the full corrected script, and add one line saying what was wrong.

## When the user asks to "optimise"

Do not grid-search parameters on in-sample results and pick the best — that is exactly what the deflated Sharpe penalises. Instead: choose defaults from the reasoning behind the edge, check that neighbouring values (±20–30%) also work in-sample, and prefer a parameter plateau over a peak. Every variant the user backtests and uploads counts as a trial; say so.
