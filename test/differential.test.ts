// smaltdf against Python Polars on generated cases: every result must match. Known, documented differences
// (docs/divergences.md) are excluded by the generator and pinned in divergences.test.ts.
import { Database } from 'smaltdb/engine';
import { describe, expect, test } from 'vitest';
import { smaltdf } from '../src/index.js';
import { diff } from './differential/compare.js';
import { cases } from './differential/generate.js';
import { run } from './differential/interpret.js';
import { havePolars, runPolars } from './differential/polars.js';

const SEED = Number(process.env.SMALTDF_SEED ?? 1);
const COUNT = Number(process.env.SMALTDF_CASES ?? 300);

describe.skipIf(!havePolars())('differential: smaltdf = Polars', () => {
  const all = cases(SEED, COUNT);
  const expected = runPolars(all);

  test(`${COUNT} generated cases (seed ${SEED})`, async () => {
    const pl = smaltdf(Database.openMemory());
    const failures: string[] = [];
    let compared = 0;
    for (const c of all) {
      const want = expected[c.name];
      let got: { columns: string[]; rows: unknown[][] } | { error: string };
      try {
        got = await run(pl, c);
      } catch (e) {
        got = { error: `${(e as Error).name}: ${(e as Error).message}` };
      }
      if ('error' in want || 'error' in got) {
        if (!('error' in want && 'error' in got)) failures.push(`${c.name}: ${'error' in got ? `smaltdf failed: ${got.error}` : `Polars failed: ${(want as { error: string }).error}`}\n  ${JSON.stringify(c.ops)}`);
        continue;
      }
      compared++;
      const d = diff(got, want, c.ordered);
      if (d) failures.push(`${c.name}: ${d}\n  ${JSON.stringify(c.ops)}`);
    }
    expect(failures.slice(0, 10).join('\n\n')).toBe('');
    expect(compared).toBeGreaterThan(COUNT * 0.9);
  }, 120_000);
});
