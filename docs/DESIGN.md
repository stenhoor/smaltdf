# smaltdf design

Status: draft, from the initial interview with the owner (2026-11-03).

smaltdf is a dataframe library for [smaltdb](https://github.com/stenhoor/smaltdb), published as `@smaltdb/df`.
Its API follows the Polars expression API, and every operation runs in the smaltdb engine.

## Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | API | The Polars expression API in TypeScript, as a strict subset in the style of Narwhals: Polars names, argument order and method chaining (`df.filter(col('a').gt(1)).groupBy('k').agg(col('x').sum())`). Where JavaScript needs it, names are camelCase (`groupBy`, `withColumns`), and each one maps 1:1 to its Polars name. |
| 2 | Execution | No separate engine. A frame is a lazy logical plan that compiles to smaltdb SQL and runs in the worker on row B+trees and columnar tables, using the engine's planner, morsels and spilling. `collect()` gives an eager `DataFrame` held as an engine relation (temp/columnar table); results cross to the app through `rowMode: 'columnar'` (typed arrays, zero-copy). |
| 3 | Placement | `@smaltdb/df` (client: expressions, plan, compiler, rendering) plus a worker plugin (`@smaltdb/df` plugin entry) for operations plain SQL text expresses poorly. |
| 4 | Core changes | Build on today's plugin API (v1). Engine hooks that let more work run in the engine (plugin scalar/aggregate functions, plan input instead of SQL text, pivot, `join_asof`, list/struct types) are proposed as separate PRs to `stenhoor/smaltdb`, each with an ADR. Each PR here notes `Depends on: stenhoor/smaltdb#N`. |
| 5 | Semantics | Engine semantics: smaltdf returns what smaltdb SQL returns (integer division, null ordering, casts, NaN). Where this differs from Polars, the difference is documented. |
| 6 | Testing | Differential tests against Python Polars (dev/CI only, never a package dependency). Generated cases run in both, and the results must match, except for entries in a reviewed divergence list (`test/divergences`), which follow decision 5. Each entry is documented and asserts smaltdb's result. A mismatch that is not on the list fails CI. |
| 7 | Visuals | Brand from `stenhoor/smalt-brand` (tokens, voice, type). Deliverables: smaltdf identity (an exploration board of options for the owner to choose from, then a smalt-brand PR), DataFrame rendering (HTML and terminal), README and docs in the smaltdb.dev theme, and an interactive playground. |

## Performance principles

- Push everything into the engine: projections, filters, joins and aggregates become one SQL statement per `collect()`, so the planner sees the whole query.
- Compile expressions once. Plans are immutable and hash-consed, and compiled SQL is cached per plan.
- Bind literals as parameters, so the engine can reuse prepared statements.
- Move results only as columnar typed arrays. Rows are never boxed unless the caller asks for objects.
- Benchmarks come with a linked method and results (brand voice rule: no unsourced performance claims).

## Open items

- Product colour and mark (decision 7, pending the owner's choice).
- First engine-hook ADR: plugin-registered scalar and aggregate functions.
