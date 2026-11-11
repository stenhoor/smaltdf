# Status

smaltdf is in development and not published. This page says what is in, as of 2026-11-07. The plan is in
[DESIGN.md](../DESIGN), and the engine's side is on the [smaltdb roadmap](https://smaltdb.dev/ROADMAP).

## In the language

Steps 2–9 of the [order of work](../DESIGN#order-of-work) are in, each tested on row and columnar tables, in process
and through the worker, with no other language registered:

| Step | What | Reference |
|---|---|---|
| 2 | Frames: `table`, `select`, `withColumns`, `filter`, `sort`, `head` / `tail` / `slice`, `collect`, and expressions | [Frames](../REFERENCE#frames), [Expressions](../REFERENCE#expressions) |
| 3 | Aggregation: `groupBy(…).agg(…)`, the aggregates, `unique` | [Aggregation](../REFERENCE#aggregation) |
| 4 | Joins of every kind, `joinAsof`, `concat` | [Joins](../REFERENCE#joins) |
| 5 | Windows: `over`, cumulative functions, `shift`, `rank` | [Windows](../REFERENCE#windows) |
| 6 | Reshaping: `pivot`, `unpivot`, `sample`; frames from JavaScript data | [Reshaping](../REFERENCE#reshaping), [Data from JavaScript](../REFERENCE#data-from-javascript) |
| 7 | Writing: `insertInto`, `createTable`, `update`, `deleteFrom` | [Writing](../REFERENCE#writing) |
| 8 | Views, plain and materialized, stored as smaltdf's own frames | [Views](../REFERENCE#views) |
| 9 | Comparison tests against Polars, with the differences listed | [Compared with Polars](../REFERENCE#compared-with-polars) |

## Next

The engine's types ([smaltdb ADR 0016](https://smaltdb.dev/adr/0016-plan-api-for-every-language), step 11), each with
its own engine decision first. `bool` and NaN are in ([ADR 0018](https://smaltdb.dev/adr/0018-bool-and-nan)):
comparisons and logic are the engine's `bool`, a `bool` column written to a table reads back as `bool`, and NaN is a
value of `real` that sorts after every number (`0 / 0` is NaN). So are dates and times
([ADR 0019](https://smaltdb.dev/adr/0019-dates-and-times)): `date`, `datetime`, `time` and `duration`, the `dt`
methods, time zones as values, and JS `Date`s in and out ([Dates and times](../REFERENCE#dates-and-times)). So are lists and
structs ([ADR 0020](https://smaltdb.dev/adr/0020-lists-and-structs)): `list<…>` and `struct<…>` columns from JS arrays
and objects, the `list` and `struct` methods, `implode`, `explode` and `unnest` ([Lists and
structs](../REFERENCE#lists-and-structs)).

Then the first release, as `@smaltworks/smaltdf`, together with smaltdb 0.9.0.
