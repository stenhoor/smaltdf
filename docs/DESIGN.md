# smaltdf design

Status: revised 2026-11-07. The plan layer smaltdf waited for is in smaltdb (ADR 0014's nine steps, through ADR 0015
step 8, the public plan API), and so are ADR 0016 steps 1–10 (operations named by behaviour, meaning in the plan,
the catalog API, typed results, order, definitions without source text, the new operations). This revision sets
smaltdf's order of work. The language itself is specified in [REFERENCE.md](REFERENCE.md).

smaltdf is a TypeScript language for smaltdb that provides dataframe interfaces to the engine. Polars inspired its
functions, and they are similar to Polars', but smaltdf is its own language, specified here and in its reference.
It is not Python, and it is not a Polars port. It is a language extension of the core engine, not a user interface:
smaltui and, later, smaltnb are how people use it interactively.

## Decisions

| # | Topic | Decision |
|---|---|---|
| 1 | Language | A TypeScript DSL with dataframe interfaces: frames, expressions, method chaining (`table('orders').filter(col('qty').gt(1)).groupBy('region').agg(col('qty').sum())`). Polars inspired the functions and their names, and they are similar where that helps, but smaltdf's own spec decides. |
| 2 | Execution | smaltdf builds plans for the engine's plan layer ([smaltdb ADR 0014](https://github.com/stenhoor/smaltdb/blob/main/docs/adr/0014-shared-plan-layer.md), [ADR 0016](https://github.com/stenhoor/smaltdb/blob/main/docs/adr/0016-plan-api-for-every-language.md)), a layer in neutral engine terms that belongs to no language. Through it smaltdf uses the engine's optimizer, B+tree and columnar storage, fused scans, morsels and spilling. **No code in smaltdf generates, compiles to, or runs SQL** (owner's explicit directive). |
| 3 | Placement | A client package that builds plans and sends them to the engine: in-process (`Database` from `smaltdb/engine`), over the worker protocol (`Database` from `smaltdb`), or from a plugin (`MethodContext.queryPlan`). The plan layer itself belongs in smaltdb core. |
| 4 | Core changes | Engine features smaltdf needs belong in smaltdb core, with an ADR where the change is significant. smaltdf does not reimplement engine features. |
| 5 | Semantics | smaltdf has its own spec ([REFERENCE.md](REFERENCE.md)). Each method maps to the engine operation that means what the spec says (`/` is `div_float`, `floorDiv` is `div_floor`, `lower` is `lower_unicode`, …); where no operation means it, one is added to the engine first. |
| 6 | Testing | Tests check smaltdf against its own spec. Where a smaltdf function overlaps a Polars function, a comparison test runs both and documents the differences, so users can see them. The same query must give the same result on row and columnar storage, in process and over the worker, and with no SQL language registered. |
| 7 | Visuals | None: smaltdf has no display. Brand assets from `stenhoor/smalt-brand` are used only for its README and docs. |
| 8 | Frames | A frame is a description of a computation, not data: building one runs nothing. `collect(db)` builds its plan, runs it, and gives a result. `plan()` gives the plan statement itself, for `preparePlan`, a plugin, or inspection. |
| 9 | Schema | smaltdf knows every column's smaltdf type when it builds a frame's plan (`plan` / `collect`): tables' columns come from the engine's catalog API (`catalog()` on the client, `Database.catalog` in process), and each expression's type follows from the spec. A wrong column name or type is an error then, before anything runs, naming the method. |
| 10 | Errors | smaltdf's errors name the smaltdf call that caused them: plan nodes carry an `origin` (ADR 0016 §10) that smaltdf maps back to the method and its arguments. |

## Superseded

A first version compiled frames to SQL text. It contradicted the owner's direction: it was merged (PRs #1–#5) and
then removed from `main`. None of it is reused.

## Order of work

Each step is one PR, opened after the one before it has merged. Each runs smaltdf's tests against its spec, on row
and columnar tables, in process and over the worker, and with no SQL registered.

1. **This design and the reference (v0).**
2. **Core frames:** `table`, `select`, `withColumns`, `filter`, `sort`, `head` / `tail` / `slice`, `collect` and
   `plan`; expressions `col`, `lit`, arithmetic, comparison, logic, null tests, `cast`, `alias`; the schema from the
   catalog; errors with their origin.
3. **Aggregation:** `groupBy(…).agg(…)`, the aggregate expressions, `unique`, `count` / `len`.
4. **Joins and concatenation:** `inner`, `left`, `full`, `semi`, `anti`, `cross`, `asof`; `concat`.
5. **Windows:** `over(…)`, cumulative functions, `shift`, ranking.
6. **Reshaping and data in:** `pivot`, `unpivot`, `sample`; `frame({ … })` from JavaScript arrays and typed arrays
   (`values` from columns).
7. **Writing:** `insertInto`, `createTable` from a frame, `update` / `delete` with a predicate.
8. **Views:** smaltdf as a registered language that stores a view as its own serialized frame and binds it by name
   (ADR 0016 §6, owner's decision 3).
9. **Polars comparison tests** for the functions the two share, with the differences documented.
   Each case in `compare/cases.ts` is a smaltdf frame and a Polars expression over the same tables; `npm run compare`
   runs both (Polars through `compare/run_polars.py`, pinned in `compare/requirements.txt`) and compares columns,
   types, rows and errors. A case says how the two differ, or they must agree; the differences are written into the
   reference ("Compared with Polars"), and the test fails when that section is out of date. It runs in its own CI
   job (decision D).

Types beyond the engine's current ones (`bool`, NaN as a value, dates and times, lists and structs) follow smaltdb
ADR 0016 step 11, one type at a time. Until `bool` lands, see decision C below.

## Owner's decisions (2026-11-07)

All five as proposed:

- **A. Order.** `filter`, `select`, `withColumns`, `sort` (stable), `head` / `tail` keep order. `groupBy` and `join`
  give rows in no particular order unless asked (`maintainOrder: true`), because keeping it costs (ADR 0016 §4).
- **B. Aggregates of no values.** `sum` of no values is 0; `count` is 0; `mean`, `min` and `max` are null. smaltdf's
  plan gives `sum` as `coalesce(sum, 0)` with the zero of the input's type: no engine operation is needed.
- **C. Booleans before the `bool` type.** smaltdf types comparisons and logic as `bool` and gives `true` / `false` in
  `collect`, so its results don't change when the engine's `bool` arrives.
- **D. Polars in tests.** A separate CI job with Python and `polars` pinned, not part of `npm run check`, writing the
  differences into the reference. Nothing of Polars is a dependency of the package.
- **E. Strict arithmetic and conversion.** An integer overflow and a value that doesn't convert are errors, with the
  engine's checked and strict operations (`add_checked`, `sub_checked`, `mul_checked`, `cast_integer_strict`,
  `cast_real_strict`).

## Engine work this needs

Checked against smaltdb `main` (`fabbd86`) by running each operation as a plan:

| For | Engine today | Needed |
|---|---|---|
| Decision B (`sum` of no values is 0) | `sum` of no rows is NULL | none: the plan's own `coalesce` |
| Decision E (strict) | overflow gives a real; `cast_integer('x')` is 0 | checked arithmetic and strict casts (stenhoor/smaltdb, `claude/strict-operations`) |
| NaN | `div_float(0, 0)` is NULL | ADR 0016 step 11 (NaN as a value) |
| `bool` | comparisons give `int` 0 / 1 | ADR 0016 step 11 |
| Robustness | a `call` of a cast function (`cast_integer`) crashes the engine with a `TypeError` | a compiler fix (the same smaltdb PR) |

Verified as the reference says: `div_float(7, 2)` is 3.5, `div_floor(-7, 2)` is -4, `mod_floor(-7, 2)` is 1,
`round_half_even(2.5, 0)` is 2, `lower_unicode('ÄB')` is `'äb'`, `regex_match` gives 1 / 0, `cmp_is(null, null)` is 1.

