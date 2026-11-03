// Result comparison for differential tests: same column names, same rows (in order, or as a multiset), numbers
// equal to a relative 1e-9 (so 2 and 2.0 match), everything else exactly.

const num = (v: unknown): number | null => (typeof v === 'number' ? v : typeof v === 'bigint' ? Number(v) : null);

/**
 * smaltdf's value `a` against Polars' `b`. smaltdb has no NaN, so where Polars gives NaN (an undefined statistic, a
 * math function outside its domain) smaltdf gives NULL: the documented `nan-is-null` divergence, and the only case
 * where unequal values match.
 */
export function sameValue(a: unknown, b: unknown): boolean {
  if (b === 'nan') return a === null;
  const x = num(a);
  const y = num(b);
  if (x !== null && y !== null) return x === y || Math.abs(x - y) <= 1e-9 * Math.max(1, Math.abs(x), Math.abs(y));
  return a === b;
}

const key = (row: unknown[]): string => JSON.stringify(row.map((v) => (num(v) !== null ? Number(num(v)!.toPrecision(12)) : v)));

export function diff(got: { columns: string[]; rows: unknown[][] }, want: { columns: string[]; rows: unknown[][] }, ordered: boolean): string | null {
  if (JSON.stringify(got.columns) !== JSON.stringify(want.columns)) return `columns ${JSON.stringify(got.columns)} ≠ ${JSON.stringify(want.columns)}`;
  if (got.rows.length !== want.rows.length) return `${got.rows.length} rows ≠ ${want.rows.length}`;
  const a = ordered ? got.rows : [...got.rows].sort((p, q) => (key(p) < key(q) ? -1 : 1));
  const b = ordered ? want.rows : [...want.rows].sort((p, q) => (key(p) < key(q) ? -1 : 1));
  for (let i = 0; i < a.length; i++) {
    for (let c = 0; c < a[i].length; c++) {
      if (!sameValue(a[i][c], b[i][c])) return `row ${i} column ${got.columns[c]}: ${JSON.stringify(a[i][c])} ≠ ${JSON.stringify(b[i][c])} (smaltdf ≠ Polars)`;
    }
  }
  return null;
}
