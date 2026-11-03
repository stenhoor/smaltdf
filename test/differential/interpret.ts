// Runs a differential case in smaltdf. Cases are written with Polars' names (`with_columns`, `str.to_uppercase`,
// keyword arguments); this interpreter maps each name to smaltdf's camelCase one by rule, and keyword arguments to a
// trailing options object. A name that does not map is an API compatibility bug.
import { Expr, col, lit, when, type LazyFrame } from '../../src/index.js';
import * as pl from '../../src/index.js';
import type { smaltdf } from '../../src/index.js';

export type E =
  | { col: string }
  | { lit: unknown }
  | { call: string; on: E; args?: unknown[]; kwargs?: Record<string, unknown> }
  | { fn: string; args?: unknown[]; kwargs?: Record<string, unknown> }
  | { when: [E, E][]; otherwise?: E | null };

export interface FrameSpec {
  columns: Record<string, unknown[]>;
  schema: Record<string, 'Int64' | 'Float64' | 'String' | 'Boolean'>;
}

export type Op =
  | { op: 'group_by_agg'; keys: unknown[]; aggs: unknown[] }
  | { op: 'join'; other: string; kwargs?: Record<string, unknown> }
  | { op: string; args?: unknown[]; kwargs?: Record<string, unknown> };

export interface Case {
  name: string;
  data: FrameSpec;
  frames?: Record<string, FrameSpec>;
  ops: Op[];
  /** Compare rows in order (the case sorts by a unique key); otherwise as a multiset. */
  ordered: boolean;
}

export const camel = (s: string): string => s.replace(/_+$/, '').replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase());

const isExpr = (a: unknown): a is E => typeof a === 'object' && a !== null && !Array.isArray(a) && ['col', 'lit', 'call', 'fn', 'when'].some((k) => k in a);

function arg(a: unknown): unknown {
  if (typeof a === 'object' && a !== null && 'dtype' in a) return pl.dtypes[(a as { dtype: keyof typeof pl.dtypes }).dtype];
  if (isExpr(a)) return expr(a);
  if (Array.isArray(a)) return a.map(arg);
  return a;
}

function options(kwargs: Record<string, unknown> | undefined): unknown[] {
  if (!kwargs || Object.keys(kwargs).length === 0) return [];
  return [Object.fromEntries(Object.entries(kwargs).map(([k, v]) => [camel(k), arg(v)]))];
}

function method(target: object, name: string): (...args: unknown[]) => unknown {
  let t: any = target;
  const parts = name.split('.');
  for (const p of parts.slice(0, -1)) t = t[camel(p)];
  const f = t[camel(parts[parts.length - 1])];
  if (typeof f !== 'function') throw new Error(`smaltdf has no ${parts.map(camel).join('.')} (Polars ${name})`);
  return f.bind(t);
}

export function expr(e: E): Expr {
  if ('col' in e) return col(e.col);
  if ('lit' in e) return lit(e.lit as never);
  if ('when' in e) {
    let chain: any = null;
    for (const [c, t] of e.when) chain = (chain === null ? when(expr(c)) : chain.when(expr(c))).then(expr(t));
    return e.otherwise != null ? chain.otherwise(expr(e.otherwise)) : chain;
  }
  if ('fn' in e) return method(pl, e.fn)(...(e.args ?? []).map(arg), ...options(e.kwargs)) as Expr;
  return method(expr(e.on), e.call)(...(e.args ?? []).map(arg), ...options(e.kwargs)) as Expr;
}

type Bound = ReturnType<typeof smaltdf>;

function frame(p: Bound, spec: FrameSpec): LazyFrame {
  const schema = Object.fromEntries(Object.entries(spec.schema).map(([k, v]) => [k, pl.dtypes[v]]));
  return p.DataFrame(spec.columns as Record<string, unknown[]>, { schema }).lazy();
}

export async function run(p: Bound, c: Case): Promise<{ columns: string[]; rows: unknown[][] }> {
  let lf = frame(p, c.data);
  const others = Object.fromEntries(Object.entries(c.frames ?? {}).map(([k, v]) => [k, frame(p, v)]));
  for (const op of c.ops) {
    if (op.op === 'group_by_agg') {
      const g = op as Extract<Op, { op: 'group_by_agg' }>;
      lf = lf.groupBy(...(g.keys.map(arg) as never[])).agg(...(g.aggs.map(arg) as never[]));
    } else if (op.op === 'join') {
      const j = op as Extract<Op, { op: 'join' }>;
      lf = lf.join(others[j.other], options(j.kwargs)[0] as never);
    } else {
      const o = op as { op: string; args?: unknown[]; kwargs?: Record<string, unknown> };
      lf = method(lf, o.op)(...(o.args ?? []).map(arg), ...options(o.kwargs)) as LazyFrame;
    }
  }
  const df = await lf.collect();
  return { columns: df.columns, rows: df.rows() };
}
