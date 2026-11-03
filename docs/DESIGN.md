# smaltdf design

Status: revised 2026-11-03, after the owner's corrections. This replaces the first version, which compiled to SQL.

smaltdf is a TypeScript language for smaltdb that provides dataframe interfaces to the engine. Polars inspired its
functions, and they are similar to Polars', but smaltdf is its own language, specified here and in its reference.
It is not Python, and it is not a Polars port. It is a language extension of the core engine, not a user interface:
smaltui and, later, smaltnb are how people use it interactively.

## Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Language | A TypeScript DSL with dataframe interfaces: frames, expressions, method chaining (`table('orders').filter(col('qty').gt(1)).groupBy('region').agg(col('qty').sum())`). Polars inspired the functions and their names, and they are similar where that helps, but smaltdf's own spec decides. |
| 2 | Execution | **No SQL.** smaltdf generates neither SQL text nor the SQL syntax tree. It is a second front end to smaltdb's engine: it builds plans for the shared logical plan layer that the SQL front end also targets ([smaltdb ADR 0014](https://github.com/stenhoor/smaltdb/blob/claude/adr-plan-layer/docs/adr/0014-shared-plan-layer.md), proposed). Through that layer it uses the engine's optimizer, B+tree and columnar storage, fused scans, morsels and spilling. |
| 3 | Placement | A client package that builds plans and sends them to the engine: in-process, over the worker protocol, or from a plugin (ADR 0014 §4). The plan layer itself belongs in smaltdb core. |
| 4 | Core changes | Engine features smaltdf needs belong in smaltdb core: the plan layer (ADR 0014), and the math and statistics functions (merged in smaltdb #41 and #42). smaltdf does not reimplement engine features. |
| 5 | Semantics | smaltdf has its own spec. Where it differs from SQL (for example, division), it says so by choosing different functions in the plan (ADR 0014 §2), not by emulation. |
| 6 | Testing | Tests check smaltdf against its own spec. Where a smaltdf function overlaps a Polars function, a comparison test runs both and documents the differences, so users can see them (the Python Polars harness stays for that purpose only). The same query must give the same result on row and columnar storage, in process and over the worker. |
| 7 | Visuals | None: smaltdf has no display. Brand assets from `stenhoor/smalt-brand` are used only for its README and docs. |

## Superseded

The first version (on `main` after PRs #1–#5) compiled frames to SQL text. That contradicted the owner's direction
and is replaced by decision 2. Its expression and frame API, and its backend tests, can be reused; its SQL compiler
(`src/compile.ts`) cannot.

## Open items

- The smaltdb plan layer (ADR 0014): its questions to the owner, then the steps in its section 5. smaltdf can run
  queries from step 9.
- smaltdf's language reference, its own semantics, and the Polars comparison for overlapping functions.
- Whether the SQL-compiling code on `main` is reverted now or replaced when the plan builder lands (owner).
