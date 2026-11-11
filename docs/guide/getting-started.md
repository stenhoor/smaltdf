# Installation

smaltdf is a language for [smaltdb](https://smaltdb.dev): you build frames in TypeScript, and they run in the smaltdb
engine. It needs smaltdb, a peer dependency, and nothing else.

<!-- docs:skip -->
```sh
npm install --save-exact @smaltworks/smaltdf smaltdb
```

::: warning Not on npm yet
smaltdf and smaltdb 0.9.0 are not published yet. Until they are, build them from
[the repository](https://github.com/stenhoor/smaltdf): `npm ci && npm run deps && npm run build`. See
[Status](./status) for what is in.
:::

## In a browser

The engine runs in a Web Worker, with the data in the browser's storage (OPFS). The worker is a small file you write: it
registers smaltdf, which the engine needs to read smaltdf's views.

<!-- docs:skip -->
```ts
// db-worker.ts
import { defineWorker } from 'smaltdb/worker-runtime';
import { dfLanguage } from '@smaltworks/smaltdf';

defineWorker({ languages: [dfLanguage] });
```

<!-- docs:skip -->
```ts
// app.ts
import { open } from 'smaltdb';
import { col, table } from '@smaltworks/smaltdf';

const db = await open('shop', {
  worker: () => new Worker(new URL('./db-worker.ts', import.meta.url), { type: 'module' }),
});
const big = await table('orders').filter(col('qty').gt(10)).collect(db);
```

Every call to the database is a message to the worker, so `collect` and the writes return promises. Bundlers such as
Vite build the worker from `new URL('./db-worker.ts', import.meta.url)`.

## In Node, or in tests

The engine can run in the same thread, with the data in memory:

<!-- docs:skip -->
```ts
import { Database, registerLanguage } from 'smaltdb/engine';
import { col, dfLanguage, frame } from '@smaltworks/smaltdf';

registerLanguage(dfLanguage);
const db = Database.openMemory();

const r = await frame({ n: [1, 2, 3] }).filter(col('n').gt(1)).collect(db);
console.log(r.rows); // [[2], [3]]
```

## No language besides smaltdf

smaltdb carries no language of its own: smaltdf builds plans for the engine's plan layer, and never writes or runs SQL.
SQL is another language for the same engine, [smaltql](https://stenhoor.github.io/smaltql/); the two can share one
database, and each reads the other's tables.

## Next

- [Tutorial](./tutorial): from a table to a report, step by step.
- [Frames and expressions](./frames): how a frame becomes a plan, and what runs when.
- [Reference](../reference/): every function and method.
