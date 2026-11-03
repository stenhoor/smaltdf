// Random differential cases from a seed. The generator only builds expressions whose meaning smaltdb and Polars
// share; operations listed in docs/divergences.md are left out here and tested on their own in divergences.test.ts.
import type { Case, E, FrameSpec, Op } from './interpret.js';

/** mulberry32: a small seeded PRNG, so a failing case can be regenerated from its seed. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type T = 'int' | 'float' | 'str' | 'bool';

const COLUMNS: Record<string, T> = { i1: 'int', i2: 'int', f1: 'float', s1: 'str', b1: 'bool' };
/** Columns that hold NULLs (sums are only taken over i2, which has none: see docs/divergences.md, "sum of no values"). */
const NULLABLE = new Set(['i1', 'f1', 's1']);

export function data(seed: number, rows = 24): FrameSpec {
  const r = rng(seed);
  const pick = <V>(xs: V[]): V => xs[Math.floor(r() * xs.length)];
  const nul = (name: string, v: unknown): unknown => (NULLABLE.has(name) && r() < 0.15 ? null : v);
  const cols: Record<string, unknown[]> = { id: [], i1: [], i2: [], f1: [], s1: [], b1: [] };
  for (let i = 0; i < rows; i++) {
    cols.id.push(i);
    cols.i1.push(nul('i1', Math.floor(r() * 11) - 5));
    cols.i2.push(Math.floor(r() * 7));
    cols.f1.push(nul('f1', Math.round((r() * 20 - 10) * 4) / 4));
    cols.s1.push(nul('s1', pick(['ab', 'abc', 'b', 'ba', 'cab', 'x', ''])));
    cols.b1.push(r() < 0.5);
  }
  return { columns: cols, schema: { id: 'Int64', i1: 'Int64', i2: 'Int64', f1: 'Float64', s1: 'String', b1: 'Boolean' } };
}

/** A small dimension table keyed by i2 (some keys missing, one extra), for joins. */
function dim(seed: number): FrameSpec {
  const r = rng(seed ^ 0x5eed);
  const keys = [0, 1, 2, 3, 4, 5, 6, 9].filter(() => r() < 0.7);
  return { columns: { i2: keys, label: keys.map((k) => `L${k}`), f1: keys.map((k) => k / 2) }, schema: { i2: 'Int64', label: 'String', f1: 'Float64' } };
}

export function cases(seed: number, n: number): Case[] {
  const r = rng(seed);
  const pick = <V>(xs: V[]): V => xs[Math.floor(r() * xs.length)];
  const int = (lo: number, hi: number): number => lo + Math.floor(r() * (hi - lo + 1));
  const call = (m: string, on: E, ...args: unknown[]): E => ({ call: m, on, args });
  const colOf = (t: T): E => ({ col: pick(Object.keys(COLUMNS).filter((k) => COLUMNS[k] === t)) });

  const num = (d: number): E => {
    const t: T = r() < 0.6 ? 'int' : 'float';
    if (d <= 0 || r() < 0.3) return r() < 0.8 ? colOf(t) : { lit: int(-3, 3) };
    switch (int(0, 8)) {
      case 7:
        // Math functions on arguments inside their domain (NaN and -inf results differ: docs/divergences.md).
        return pick([
          () => call('sqrt', call('abs', num(d - 1))),
          () => call(pick(['sin', 'cos', 'arctan', 'tanh', 'sinh', 'arcsinh', 'degrees', 'radians']), num(d - 1)),
          () => call('exp', call('clip', num(d - 1), { lit: -5 }, { lit: 5 })),
          () => call(pick(['log', 'log10']), call('add', call('abs', num(d - 1)), { lit: 1 })),
          () => ({ call: 'log', on: call('add', call('abs', num(d - 1)), { lit: 1 }), args: [2] }),
          () => call('pow', call('abs', num(d - 1)), { lit: pick([0, 1, 2, 3, 0.5]) }),
          () => call(pick(['floor', 'ceil']), num(d - 1)),
        ])();
      case 8:
        return call('floordiv', num(d - 1), { lit: pick([1, 2, 3, -2]) });
      case 0:
        return call(pick(['add', 'sub', 'mul']), num(d - 1), num(d - 1));
      case 1:
        return call('abs', num(d - 1));
      case 2:
        return call('fill_null', num(d - 1), { lit: int(-2, 2) });
      case 3:
        return { when: [[bool(d - 1), num(d - 1)]], otherwise: num(d - 1) };
      case 4:
        return call('clip', num(d - 1), { lit: 0 }, { lit: 3 });
      case 5:
        return call('floordiv', num(d - 1), { lit: int(1, 4) });
      default:
        // Polars' len_chars is UInt32; cast it, as smaltdb has only signed integers (docs/divergences.md).
        return call('cast', call('str.len_chars', str(d - 1)), { dtype: 'Int64' });
    }
  };
  const str = (d: number): E => {
    if (d <= 0 || r() < 0.35) return colOf('str');
    switch (int(0, 4)) {
      case 0:
        return call('str.to_uppercase', str(d - 1));
      case 1:
        return call('str.slice', str(d - 1), int(0, 2), int(1, 3));
      case 2:
        return call('fill_null', str(d - 1), { lit: 'z' });
      case 3:
        return call('str.replace_all', str(d - 1), 'a', 'Q');
      default:
        return call('str.strip_chars', str(d - 1), 'a');
    }
  };
  const bool = (d: number): E => {
    if (d <= 0 || r() < 0.2) return r() < 0.7 ? colOf('bool') : { call: pick(['is_null', 'is_not_null']), on: { col: pick([...NULLABLE]) } };
    switch (int(0, 7)) {
      case 0:
        return call(pick(['gt', 'lt', 'ge', 'le', 'eq', 'ne']), num(d - 1), num(d - 1));
      case 1:
        return call(pick(['and_', 'or_']), bool(d - 1), bool(d - 1));
      case 2:
        return call('not_', bool(d - 1));
      case 3:
        return call('is_in', colOf('int'), [int(-3, 3), int(-3, 3), int(0, 5)]);
      case 4:
        return call('is_between', num(d - 1), { lit: -2 }, { lit: 2 });
      case 5:
        return { call: 'str.contains', on: str(d - 1), args: [pick(['a', 'b', 'ab', 'c'])], kwargs: { literal: true } };
      case 6:
        return call(pick(['str.starts_with', 'str.ends_with']), str(d - 1), pick(['a', 'b', 'ab', '']));
      default:
        return call('eq_missing', colOf('int'), num(d - 1));
    }
  };

  /** A statistics aggregate (smaltdb's var_samp, stddev_pop, median, percentile_cont, …) of a numeric column. */
  const statAgg = (name: string): E => {
    const on: E = { col: pick(['i1', 'f1', 'i2']) };
    const e: E = pick<() => E>([
      () => ({ call: pick(['var', 'std']), on, kwargs: { ddof: pick([0, 1, 2]) } }),
      () => ({ call: 'median', on }),
      () => ({ call: 'quantile', on, args: [pick([0, 0.1, 0.25, 0.5, 0.9, 1])], kwargs: { interpolation: pick(['linear', 'lower']) } }),
      () => ({ call: 'skew', on, kwargs: { bias: r() < 0.5 } }),
      () => ({ call: 'kurtosis', on, kwargs: { bias: r() < 0.5, fisher: r() < 0.5 } }),
      () => ({ fn: 'corr', args: [{ col: 'f1' }, { col: pick(['i1', 'i2']) }] }),
      () => ({ fn: 'cov', args: [{ col: 'f1' }, { col: pick(['i1', 'i2']) }], kwargs: { ddof: pick([0, 1]) } }),
    ])();
    return { call: 'alias', on: e, args: [name] };
  };

  const out: Case[] = [];
  for (let k = 0; k < n; k++) {
    const ops: Op[] = [];
    let ordered = false;
    let grouped = false;
    const steps = int(1, 3);
    for (let s = 0; s < steps && !grouped; s++) {
      switch (int(0, 7)) {
        case 0:
          ops.push({ op: 'filter', args: [bool(2)] });
          break;
        case 1:
          ops.push({ op: 'with_columns', args: [{ call: 'alias', on: num(3), args: [`n${s}`] }, { call: 'alias', on: bool(2), args: [`p${s}`] }, { call: 'alias', on: str(2), args: [`t${s}`] }] });
          break;
        case 2:
          ops.push({ op: 'select', args: ['id', 'i2', { call: 'alias', on: num(3), args: ['x'] }, { call: 'alias', on: str(2), args: ['y'] }] });
          s = steps; // later steps would refer to columns the select dropped
          break;
        case 3: {
          const key = pick(['s1', 'b1', 'i2']);
          ops.push({
            op: 'group_by_agg',
            keys: [key],
            aggs: [
              { call: 'alias', on: { call: 'sum', on: { col: 'i2' } }, args: ['sum'] },
              { call: 'alias', on: { call: pick(['min', 'max', 'mean']), on: { col: pick(['i1', 'f1']) } }, args: ['m'] },
              { call: 'alias', on: { call: 'count', on: { col: pick(['i1', 'f1', 's1']) } }, args: ['c'] },
              { call: 'alias', on: { call: 'n_unique', on: { col: pick(['i1', 's1']) } }, args: ['u'] },
              { fn: 'len' },
              statAgg('st'),
              statAgg('st2'),
            ],
          });
          grouped = true;
          break;
        }
        case 4:
          ops.push({ op: 'join', other: 'dim', kwargs: { on: 'i2', how: pick(['inner', 'left', 'right', 'full', 'semi', 'anti']) } });
          s = steps; // a right or full join can leave the key NULL; keep the case to the join itself
          break;
        case 5:
          ops.push({ op: 'unique', args: [pick([['s1'], ['b1', 'i2'], null])] });
          s = steps;
          break;
        case 6:
          ops.push({ op: 'with_columns', args: [{ call: 'alias', on: { call: 'rank', on: { col: pick(['i1', 'f1', 'i2']) }, args: [pick(['average', 'min', 'max', 'dense'])], kwargs: { descending: r() < 0.5 } }, args: ['r'] }] });
          break;
        default:
          if (r() < 0.4) {
            const st = statAgg('ws');
            ops.push({ op: 'with_columns', args: [r() < 0.5 ? st : { call: 'alias', on: { call: 'over', on: (st as { on: E }).on, args: ['b1'] }, args: ['ws'] }] });
            break;
          }
          ops.push({ op: 'with_columns', args: [{ call: 'alias', on: { call: pick(['sum', 'max', 'min', 'count']), on: { col: 'i2' } }, args: ['w'] }, { call: 'alias', on: { call: 'over', on: { call: 'max', on: { col: 'i2' } }, args: ['b1'] }, args: ['wo'] }] });
      }
    }
    // After a right or full join `id` can be NULL in several rows, so no sort key is unique there.
    const nullIds = ops.some((o) => o.op === 'join' && ['right', 'full'].includes(String(o.kwargs?.how)));
    if (!grouped && r() < 0.5) {
      ops.push({ op: 'sort', args: [pick(['i2', 'id']), 'id'], kwargs: { descending: r() < 0.5, nulls_last: r() < 0.5 } });
      ordered = !nullIds;
      if (!nullIds && r() < 0.5) ops.push({ op: pick(['head', 'tail']), args: [int(0, 8)] });
    }
    const unordered = ops.some((o) => o.op === 'unique' && (o as { args: unknown[] }).args[0] !== null);
    if (unordered) {
      // unique(subset) keeps any one row per key: compare only the key columns.
      const subset = (ops.find((o) => o.op === 'unique') as { args: string[][] }).args[0];
      ops.push({ op: 'select', args: subset });
      ordered = false;
    }
    out.push({ name: `case-${seed}-${k}`, data: data(seed * 1000 + k), frames: { dim: dim(seed * 1000 + k) }, ops, ordered });
  }
  return out;
}
