# Quick start

Five minutes, three steps: install smaltdf, run a frame from your code, then change one and run it on this page.

## 1. Install

<!-- docs:skip -->
```sh
npm install --save-exact @smaltworks/smaltdf smaltdb
```

smaltdf and smaltdb 0.9.0 are not on npm yet: [Installation](./getting-started) says how to build them until they are.

## 2. Run a frame from your code

<!-- docs:skip -->
```ts
import { Database, registerLanguage } from 'smaltdb/engine';
import { col, dfLanguage, frame } from '@smaltworks/smaltdf';

registerLanguage(dfLanguage);
const db = Database.openMemory(); // in a browser: open() from 'smaltdb', with the engine in a worker

const fruit = frame({ name: ['apple', 'banana', 'cherry'], price: [0.5, 0.25, 3] });
const cheap = await fruit.filter(col('price').lt(1)).collect(db);
console.log(cheap.toObjects()); // [{ name: 'apple', price: 0.5 }, { name: 'banana', price: 0.25 }]
```

A frame describes a computation and runs nothing until `collect(db)` runs it in the engine.

## 3. Try it here

This is a frame running in your browser. Change it and press **Run** (or Ctrl+Enter); **Reset** brings back the
example, and **Share** copies a link to your version.

```ts
import { col, frame, len } from '@smaltworks/smaltdf';

const fruit = frame({
  name: ['apple', 'banana', 'cherry', 'lemon'],
  color: ['red', 'yellow', 'red', 'yellow'],
  price: [0.5, 0.25, 3, 0.4],
});
fruit
  .groupBy('color', { maintainOrder: true })
  .agg(len().alias('kinds'), col('price').mean().round(2).alias('average_price'));
```

| color | kinds | average_price |
| --- | --- | --- |
| red | 2 | 1.75 |
| yellow | 2 | 0.33 |

The table under the code is the tested result: the docs' tests run every example and check what it prints.

## Next

- [Tutorial](./tutorial): a small data set, from a table to a report, step by step.
- [User guide](./frames): frames and expressions, aggregation, joins, windows and the rest.
- [Reference](../reference/): every function and method, each with examples to run.
