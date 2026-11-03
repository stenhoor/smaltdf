# smaltdf design

Status: draft, from the initial interview with the owner (2026-11-03).

smaltdf is a dataframe library for [smaltdb](https://github.com/stenhoor/smaltdb), published as `@smaltdb/df`.
Its API follows the Polars expression API, and every operation runs in the smaltdb engine.

## Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | API | The Polars expression API in TypeScript, as the strict subset Narwhals defines (smalt-brand DECISIONS.md names Narwhals as the API reference): Polars names, argument order and method chaining (`df.filter(col('a').gt(1)).groupBy('k').agg(col('x').sum())`). Where JavaScript needs it, names are camelCase (`groupBy`, `withColumns`), and each one maps 1:1 to its Polars name. |
| 2 | Execution | No separate engine. A frame is a lazy logical plan that compiles to smaltdb SQL and runs in the worker on row B+trees and columnar tables, using the engine's planner, morsels and spilling. `collect()` gives an eager `DataFrame` held as an engine relation (temp/columnar table); results cross to the app through `rowMode: 'columnar'` (typed arrays, zero-copy). |
| 3 | Placement | `@smaltdb/df` (client: expressions, plan, compiler, rendering) plus a worker plugin (`@smaltdb/df` plugin entry) for operations plain SQL text expresses poorly. |
| 4 | Core changes | Math and statistics functions belong in smaltdb core (owner, 2026-11-03): smaltdf maps Polars' names onto them and does not emulate them in SQL. Other engine features smaltdf needs (plan input instead of SQL text, pivot, `join_asof`, list/struct types) are proposed to `stenhoor/smaltdb` as separate PRs, each with an ADR. Each PR here notes what it depends on. |
| 5 | Semantics | Engine semantics: where a Polars operation maps onto a SQL operator or function (`/`, `%`, `round`, `sum`, `CAST`, default null ordering), smaltdf returns what smaltdb's SQL returns. Where Polars defines an operation that has no SQL counterpart (`floordiv`, `n_unique`, `rank`, `is_between`), smaltdf implements Polars' definition. Every difference is listed in [divergences.md](divergences.md). |
| 6 | Testing | Differential tests against Python Polars (dev/CI only, never a package dependency). Generated cases run in both, and the results must match, except for entries in a reviewed divergence list (`test/divergences`), which follow decision 5. Each entry is documented and asserts smaltdb's result. A mismatch that is not on the list fails CI. |
| 7 | Visuals | Brand from `stenhoor/smalt-brand` (the source; never edit copies by hand). Identity is decided there: the Axes mark, aureolin ochre (`product-df` `#8C6D00` light / `#E6C24A` dark; `product-df-text` `#7A5F00` for text), positioning "Dataframes for smaltdb. Small and fast." The `df` always keeps its product colour, and the ochre is never used for status (it sits close to `warning`). Deliverables here: DataFrame rendering (HTML and terminal), README and docs in the smaltdb.dev theme, and an interactive playground. |

## Performance principles

- Push everything into the engine: projections, filters, joins and aggregates become one SQL statement per `collect()`, so the planner sees the whole query.
- Compile once. Plans are immutable, and each LazyFrame caches its compiled SQL.
- Bind literals as parameters, so the engine can reuse prepared statements.
- Move results only as columnar typed arrays. Rows are never boxed unless the caller asks for objects.
- Benchmarks come with a linked method and results (brand voice rule: no unsourced performance claims).

## Open items

- Date/time and list types.
- The worker plugin (decision 3) is not needed yet: v0.1 runs entirely as SQL.
