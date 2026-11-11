# Joins and concatenation

Combining frames: side by side on matching keys, side by side on the nearest key, or one after another.

```ts
import { concat, frame } from '@smaltworks/smaltdf';

const customers = frame({ cid: [1, 2, 3], name: ['Ann', 'Bo', 'Cy'] });
const orders = frame({ oid: [10, 11, 12, 13], cid: [1, 1, 3, 4], total: [20, 5, 12, 8] });
customers.join(orders, { on: 'cid', maintainOrder: true });
```

| cid | name | oid | total |
| --- | --- | --- | --- |
| 1 | Ann | 10 | 20 |
| 1 | Ann | 11 | 5 |
| 3 | Cy | 12 | 12 |

## Kinds of join

[`join`](../reference/frames/join) matches rows whose keys are equal. `how` says which rows come out:

```ts
customers.join(orders, { on: 'cid', how: 'left', maintainOrder: true });
```

| cid | name | oid | total |
| --- | --- | --- | --- |
| 1 | Ann | 10 | 20 |
| 1 | Ann | 11 | 5 |
| 2 | Bo | null | null |
| 3 | Cy | 12 | 12 |

```ts
customers.join(orders, { on: 'cid', how: 'full', maintainOrder: true });
```

| cid | name | oid | total |
| --- | --- | --- | --- |
| 1 | Ann | 10 | 20 |
| 1 | Ann | 11 | 5 |
| 2 | Bo | null | null |
| 3 | Cy | 12 | 12 |
| 4 | null | 13 | 8 |

`semi` keeps the left rows that have a match, and `anti` those that have none: a filter by another frame.

```ts
customers.join(orders, { on: 'cid', how: 'anti' });
```

| cid | name |
| --- | --- |
| 2 | Bo |

| `how` | Rows |
| --- | --- |
| `inner` (default) | Each pair of matching rows |
| `left`, `right` | Those, and each unmatched row of that side |
| `full` | Those, and the unmatched rows of both sides |
| `semi`, `anti` | The left rows that have, or don't have, a match |
| `cross` | Every left row with every right row |

A null key matches nothing. Keys named by `on` appear once; with `leftOn` and `rightOn` both sides' keys stay. A right
column whose name the left side has takes a suffix, `_right` by default.

## The nearest key

[`joinAsof`](../reference/frames/joinAsof) gives each left row the right row whose key is nearest: by default the last
one at or before it. It suits times: each trade with the quote in force when it happened.

```ts
const trades = frame({ t: [2, 5, 9], sym: ['a', 'a', 'b'], qty: [100, 50, 20] });
const quotes = frame({ t: [1, 4, 8], sym: ['a', 'a', 'b'], bid: [10, 11, 50] });
trades.joinAsof(quotes, { on: 't', by: 'sym' });
```

| t | sym | qty | bid |
| --- | --- | --- | --- |
| 2 | a | 100 | 10 |
| 5 | a | 50 | 11 |
| 9 | b | 20 | 50 |

## One after another

[`concat`](../reference/frames/concat) gives the first frame's rows, then the next one's. The frames have the same
columns, in the same order.

```ts
concat([frame({ m: ['jan'], sales: [5] }), frame({ m: ['feb', 'mar'], sales: [7, 6] })]);
```

| m | sales |
| --- | --- |
| jan | 5 |
| feb | 7 |
| mar | 6 |
