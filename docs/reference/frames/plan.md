# `plan`

The plan statement the frame runs as, without running it.

```railroad
plan
```

## Signature

```typescript
frame.plan(db: Db): Promise<PlanStatementInput>
```

## Parameters

| Parameter | Type | Meaning |
| --- | --- | --- |
| `db` | `Db` | The database whose catalog gives the tables' columns. |

## Returns

A promise of a smaltdb plan statement (`{ kind: 'query', plan, … }`), the same one `collect` runs. Give it to `db.preparePlan`, a plugin's `queryPlan`, or read it. Its format is smaltdb's [plan language](https://smaltdb.dev/reference/engine/plans).

## Errors

| Code | When |
| --- | --- |
| `SMALTDF_SCHEMA` | A name the frame uses isn't in the database. |
| `SMALTDF_TYPE` | An expression has the wrong type for its method. |

## Notes

- Building a plan runs nothing, except for a `pivot` without `columns`, which reads the values of `on` first.
- Each plan node carries an `origin`: the smaltdf method it came from, which errors name.

## Examples

A plan is plain data: it survives JSON, so it can be stored or sent. Its kind, its top operation and how many columns it gives:

```ts
const orders = frame({
  id: [1, 2, 3, 4, 5],
  region: ['n', 's', 'n', 'e', 's'],
  qty: [3, 12, 7, null, 5],
  price: [2.5, 1, 4, 3, 2],
});
const stmt = await orders.filter(col('qty').gt(5)).select('id').plan(db);
const data = JSON.parse(JSON.stringify(stmt));
({ kind: data.kind, top: data.plan.op, columns: data.columns.length });
```

| kind | top | columns |
| --- | --- | --- |
| query | project | 1 |

## Demo

A plan, then the same plan run:

```ts
import { col, frame } from '@smaltworks/smaltdf';

const f = frame({ a: [1, 2, 3] }).filter(col('a').ge(2));
const p = await f.plan(db);
await db.queryPlan(p);
```

| a |
| --- |
| 2 |
| 3 |

## See also

[`collect`](../frames/collect), [`The plan language (smaltdb.dev)`](https://smaltdb.dev/reference/engine/plans)
