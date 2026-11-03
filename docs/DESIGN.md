# smaltdf design

Status: revised 2026-11-03, after the owner's corrections. This replaces the first version.

smaltdf is a TypeScript language for smaltdb that provides dataframe interfaces to the engine. Polars inspired its
functions, and they are similar to Polars', but smaltdf is its own language, specified here and in its reference.
It is not Python, and it is not a Polars port. It is a language extension of the core engine, not a user interface:
smaltui and, later, smaltnb are how people use it interactively.

## Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Language | A TypeScript DSL with dataframe interfaces: frames, expressions, method chaining (`table('orders').filter(col('qty').gt(1)).groupBy('region').agg(col('qty').sum())`). Polars inspired the functions and their names, and they are similar where that helps, but smaltdf's own spec decides. |
| 2 | Execution | smaltdf builds plans for the engine's shared plan layer ([smaltdb ADR 0014](https://github.com/stenhoor/smaltdb/blob/claude/adr-plan-layer/docs/adr/0014-shared-plan-layer.md), proposed), a layer in neutral engine terms that belongs to no language. Through it smaltdf uses the engine's optimizer, B+tree and columnar storage, fused scans, morsels and spilling. **No code in smaltdf generates, compiles to, or runs SQL** (owner's explicit directive). |
| 3 | Placement | A client package that builds plans and sends them to the engine: in-process, over the worker protocol, or from a plugin (ADR 0014 §4). The plan layer itself belongs in smaltdb core. |
| 4 | Core changes | Engine features smaltdf needs belong in smaltdb core: the plan layer (ADR 0014), and the math and statistics functions (merged in smaltdb #41 and #42). smaltdf does not reimplement engine features. |
| 5 | Semantics | smaltdf has its own spec. Its behaviour (division, comparisons, aggregates of no values, conversions) is defined there and implemented by the functions its plans call in the engine's function registries (ADR 0014 §2); missing functions are added to the engine. |
| 6 | Testing | Tests check smaltdf against its own spec. Where a smaltdf function overlaps a Polars function, a comparison test runs both and documents the differences, so users can see them. The same query must give the same result on row and columnar storage, in process and over the worker. |
| 7 | Visuals | None: smaltdf has no display. Brand assets from `stenhoor/smalt-brand` are used only for its README and docs. |

## Superseded

A first version compiled frames to SQL text. It contradicted the owner's direction: it was merged (PRs #1–#5) and
then removed from `main`. None of it is reused.

## Open items

- The smaltdb plan layer (ADR 0014): all nine steps of its section 5, reading and writing, before smaltdf builds on
  it and before any npm publish (owner, 2026-11-03).
- smaltdf's language reference, its own semantics, and the Polars comparison for overlapping functions.
