# Getting started

::: warning In development
smaltdf is not published yet: it waits for smaltdb 0.9.0. Until then, build it from
[the repository](https://github.com/stenhoor/smaltdf) (`npm ci && npm run deps && npm run build`). See
[Status](./status) for what is in.
:::

smaltdf is a language for [smaltdb](https://smaltdb.dev): you build frames in TypeScript, and they run in the smaltdb
engine. It needs smaltdb (a peer dependency) and nothing else.

```sh
npm install smaltdb @smaltworks/smaltdf
```

## A database

smaltdf runs on a smaltdb database, in process or in a Web Worker. In a browser, the engine runs in a worker that you
write: it registers smaltdf, which it needs to read smaltdf's views.

```ts
// db-worker.ts
import { defineWorker } from 'smaltdb/worker-runtime';
import { dfLanguage } from '@smaltworks/smaltdf';

defineWorker({ languages: [dfLanguage] });
```

```ts
// app.ts
import { open } from 'smaltdb';

const db = await open('shop', { worker: () => new Worker(new URL('./db-worker.ts', import.meta.url), { type: 'module' }) });
```

In Node, or in tests, the engine can run in process:

```ts
import { Database, registerLanguage } from 'smaltdb/engine';
import { dfLanguage } from '@smaltworks/smaltdf';

registerLanguage(dfLanguage);
const db = Database.openMemory();
```

## A first frame

A table can come from a frame of JavaScript data. Then `table(name)` reads it, and the methods build a frame that runs
when it is collected.

```ts
import { col, frame, len, table } from '@smaltworks/smaltdf';

await frame({
  id: [1, 2, 3, 4],
  region: ['n', 's', 'n', 'e'],
  qty: [3, 12, 7, null],
}).createTable(db, 'orders');

const big = await table('orders').filter(col('qty').gt(4)).sort('qty', { descending: true }).collect(db);
// big.columns: ['id', 'region', 'qty'], big.rows: [[2, 's', 12], [3, 'n', 7]]

const byRegion = await table('orders')
  .groupBy('region', { maintainOrder: true })
  .agg(col('qty').sum(), len())
  .collect(db);
// byRegion.rows: [['n', 10, 2], ['s', 12, 1], ['e', 0, 1]]
```

`collect` gives `{ columns, types, rows }`, and `toObjects()` gives the rows as objects. `plan()` gives the plan a frame
runs as, without running it.

## Next

- [The reference](../REFERENCE): every method and expression, with the engine operation each one uses.
- [Compared with Polars](../REFERENCE#compared-with-polars): where smaltdf and Polars give different results.
- [Design](../DESIGN): the decisions behind the language, and the order of work.
