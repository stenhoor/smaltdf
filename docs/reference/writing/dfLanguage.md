# `dfLanguage`

smaltdf as a language of the engine: register it where the engine runs, to read smaltdf's views.

```railroad
dfLanguage
```

## Signature

```typescript
dfLanguage: SmaltLanguage
// in process
registerLanguage(dfLanguage)            // from 'smaltdb/engine'
// in a worker entry
defineWorker({ languages: [dfLanguage] }) // from 'smaltdb/worker-runtime'
```

## Returns

The language object smaltdb takes. It binds a view smaltdf stored, wherever a plan reads it.

## Errors

None of its own.

## Notes

- Frames run without it: only views need it, since the engine binds a view when a plan reads it.
- smaltdb carries no language of its own: each one registers.

## Examples

Registering in a worker entry:

<!-- docs:skip -->
```ts
// db-worker.ts
import { defineWorker } from 'smaltdb/worker-runtime';
import { dfLanguage } from '@smaltworks/smaltdf';

defineWorker({ languages: [dfLanguage] });
```

Registering in process:

<!-- docs:skip -->
```ts
import { Database, registerLanguage } from 'smaltdb/engine';
import { dfLanguage } from '@smaltworks/smaltdf';

registerLanguage(dfLanguage);
const db = Database.openMemory();
```

## Demo

This site's playgrounds register it, so a view reads back:

```ts
import { col, frame, table } from '@smaltworks/smaltdf';

await frame({ x: [1, 2, 3] }).createTable(db, 'xs');
await table('xs').filter(col('x').ge(2)).createView(db, 'big_xs');
table('big_xs');
```

| x |
| --- |
| 2 |
| 3 |

## See also

[`createView`](./createView), [`Installation`](../../guide/getting-started)
