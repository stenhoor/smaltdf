// Runs cases in Python Polars (polars_runner.py). Polars is a dev/CI dependency only.
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { Case } from './interpret.js';

const runner = fileURLToPath(new URL('./polars_runner.py', import.meta.url));
const python = process.env.PYTHON ?? 'python3';

export type PolarsResult = { columns: string[]; rows: unknown[][] } | { error: string };

/** Whether Python Polars is installed. CI requires it (SMALTDF_REQUIRE_POLARS=1); locally its tests are skipped. */
export function havePolars(): boolean {
  try {
    execFileSync(python, ['-c', 'import polars'], { stdio: 'ignore' });
    return true;
  } catch {
    if (process.env.SMALTDF_REQUIRE_POLARS === '1') throw new Error(`Python Polars is required (${python} -m pip install polars)`);
    return false;
  }
}

export function runPolars(cases: unknown[]): Record<string, PolarsResult> {
  const out = execFileSync(python, ['-I', runner], { input: JSON.stringify(cases), maxBuffer: 256 * 1024 * 1024 });
  return JSON.parse(out.toString('utf8'));
}

export type { Case };
