/**
 * smaltdf's types: the engine's plan types, and `bool` (owner's decision C: comparisons and logic are `bool`, given
 * as `true` / `false`, carried as the engine's integers 0 / 1 until it has a `bool` type).
 */
import type { PlanType } from 'smaltdb/plan';

export type DfType = 'int' | 'real' | 'num' | 'text' | 'blob' | 'bool' | 'null' | 'any';

/** A column of a frame: its name and smaltdf type. */
export interface DfColumn {
  readonly name: string;
  readonly type: DfType;
}

/** The plan type a smaltdf type travels as. */
export function planType(t: DfType): PlanType {
  return t === 'bool' ? 'int' : t;
}

/** A numeric type, or one only known when the statement runs (`num`, `any`). */
export const isNumeric = (t: DfType): boolean => t === 'int' || t === 'real' || t === 'num' || t === 'any' || t === 'null';

/** The name smaltdf's views record as their language (in this module, which imports nothing of smaltdf's: no cycle). */
export const DF_LANGUAGE = 'df';
