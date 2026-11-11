# Reshaping

Turning rows into columns and columns into rows, lists into rows and structs into columns.

## Rows to columns: pivot

[`pivot`](../reference/frames/pivot) gives one row per `index` value and one column per value of `on`, each cell an
aggregate of `values`.

```ts
import { col, frame } from '@smaltworks/smaltdf';

const scores = frame({
  name: ['ann', 'ann', 'bo', 'bo', 'cy'],
  subject: ['math', 'art', 'math', 'art', 'math'],
  score: [90, 70, 60, 80, 75],
});
scores.pivot('subject', { index: 'name', values: 'score', maintainOrder: true });
```

| name | art | math |
| --- | --- | --- |
| ann | 70 | 90 |
| bo | 80 | 60 |
| cy | null | 75 |

Without `columns`, the values of `on` are read from the frame first, and sorted. Give `columns` to choose them and
their order, and to make the pivot run in one step.

## Columns to rows: unpivot

[`unpivot`](../reference/frames/unpivot) gives each row once per column of `on`, with the column's name and its value.

```ts
const wide = frame({ name: ['ann', 'bo'], art: [70, 80], math: [90, 60] });
wide.unpivot({ index: 'name', variableName: 'subject', valueName: 'score' });
```

| name | subject | score |
| --- | --- | --- |
| ann | art | 70 |
| ann | math | 90 |
| bo | art | 80 |
| bo | math | 60 |

## Lists to rows, and back

[`explode`](../reference/frames/explode) gives one row per element of a list column;
[`implode`](../reference/aggregates/implode) gathers a group's values into a list.

```ts
const posts = frame({ id: [1, 2], tags: [['news', 'tech'], ['tech']] });
posts.explode('tags').groupBy('tags', { maintainOrder: true }).agg(col('id').implode().alias('posts'));
```

| tags | posts |
| --- | --- |
| news | [1] |
| tech | [1,2] |

## Structs to columns

[`unnest`](../reference/frames/unnest) replaces a struct column with a column per field.

```ts
frame({ id: [1, 2], at: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }).unnest('at');
```

| id | x | y |
| --- | --- | --- |
| 1 | 1 | 2 |
| 2 | 3 | 4 |

## Sampling

[`sample`](../reference/frames/sample) draws rows at random: `n` of them, or a fraction. A `seed` draws the same rows
each time.
