/**
 * smaltdf's types: the engine's plan types (owner's decision C: comparisons and logic are `bool`, given as
 * `true` / `false`; the engine's `bool`, smaltdb ADR 0018).
 */
import type { PlanType } from 'smaltdb/plan';

export type DfType = 'int' | 'real' | 'num' | 'text' | 'blob' | 'bool' | 'null' | 'any' | TemporalType;

/**
 * Dates and times (smaltdb ADR 0019): a `date` is days since 1970-01-01, a `datetime` µs since 1970-01-01 00:00:00,
 * a `time` µs since midnight and a `duration` µs, while a plan runs. Collect gives a `datetime` as a JS `Date` and the
 * others as text.
 */
export type TemporalType = 'date' | 'datetime' | 'time' | 'duration';

export const isTemporal = (t: DfType): t is TemporalType => t === 'date' || t === 'datetime' || t === 'time' || t === 'duration';

/** A column of a frame: its name and smaltdf type. */
export interface DfColumn {
  readonly name: string;
  readonly type: DfType;
}

/** The plan type a smaltdf type travels as: the same (the engine has `bool` since smaltdb ADR 0018). */
export function planType(t: DfType): PlanType {
  return t;
}

/** A numeric type, or one only known when the statement runs (`num`, `any`). */
export const isNumeric = (t: DfType): boolean => t === 'int' || t === 'real' || t === 'num' || t === 'any' || t === 'null';

/** The name smaltdf's views record as their language (in this module, which imports nothing of smaltdf's: no cycle). */
export const DF_LANGUAGE = 'df';
