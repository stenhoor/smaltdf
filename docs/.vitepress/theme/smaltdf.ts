// smaltdf's own theme rules: the playgrounds' TypeScript runner (the site kit's playground.ts runs it). Not a kit file.
// Each Run gets a fresh in-memory database in a worker of its own, as each page of the examples test does, and runs
// the page's examples above it first (df-examples.ts).
import type { PlayResult, Runner, SetupStep } from './playground'
import { runExample } from './df-examples'

type Db = { close(): Promise<void> }

async function openDb(): Promise<Db> {
  const { open } = await import('smaltdb')
  return (await open('playground', {
    storage: 'memory',
    multiTab: false,
    worker: () => new Worker(new URL('./play-worker.ts', import.meta.url), { type: 'module', name: 'smaltdf playground' }),
  })) as unknown as Db
}

/** The runner for `ts` playgrounds. */
export async function dfRunner(): Promise<Runner> {
  const df = (await import('../../../src/index')) as unknown as Parameters<typeof runExample>[2]['df']
  let next = openDb()
  await next // the first database starting is what the first Run waits for
  let queue: Promise<unknown> = Promise.resolve()
  const run = async (code: string, setup: SetupStep[]): Promise<PlayResult> => {
    const db = await next
    next = openDb()
    next.catch(() => undefined) // a failure shows on the Run that waits for it
    try {
      return await runExample(code, setup, { df, db })
    } finally {
      await db.close().catch(() => undefined)
    }
  }
  return {
    // One Run at a time, so the databases start in order.
    run: (code, setup) => {
      const result = queue.then(() => run(code, setup))
      queue = result.catch(() => undefined)
      return result
    },
  }
}
