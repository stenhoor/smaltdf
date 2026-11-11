// How smaltdf's examples run, in a playground and in the examples test (test/docs-examples.test.ts): one module, so a
// playground runs an example exactly as the test does. Not a kit file: smaltdf's own.
//
// An example is TypeScript that is also plain JavaScript (no type annotations), in statements that end with `;`:
//
//     import { col, frame } from '@smaltworks/smaltdf';
//     const orders = frame({ id: [1, 2, 3], qty: [5, 12, 7] });
//     orders.filter(col('qty').gt(6));
//
// - Imports of smaltdf are dropped: every name smaltdf exports is in scope, and so is `db`, an in-memory database.
// - A page's examples share one scope, in order: a name one example declares, a later one reads.
// - What an example shows is its last statement's value: an expression's, or the name a declaration gives. A frame is
//   collected first, a promise awaited.

/** One step of a playground's setup: an example, and whether it is expected to fail. */
export type Step = string | { sql: string; fails: true }

/** A result as a table of display text, or a note when there is no table. */
export interface Shown {
  columns: string[]
  rows: string[][]
  note?: string
}

/** What a run needs: smaltdf's exports, and a database. */
export interface Env {
  df: Record<string, unknown> & { Frame: new (...a: never[]) => unknown }
  db: unknown
}

const IDENT = /^[A-Za-z_$][\w$]*$/

/** `code` split into its top-level statements (at `;` outside brackets, strings and comments), comments removed. */
export function statements(code: string): string[] {
  const out: string[] = []
  let cur = ''
  let depth = 0
  const templates: number[] = [] // the bracket depth of each open template literal's `${`
  let i = 0
  const n = code.length
  while (i < n) {
    const c = code[i]
    const next = code[i + 1]
    if (c === '/' && next === '/') {
      while (i < n && code[i] !== '\n') i++
      continue
    }
    if (c === '/' && next === '*') {
      const end = code.indexOf('*/', i + 2)
      i = end < 0 ? n : end + 2
      continue
    }
    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < n && code[j] !== c) j += code[j] === '\\' ? 2 : 1
      cur += code.slice(i, j + 1)
      i = j + 1
      continue
    }
    if (c === '`' || (c === '}' && templates.length && templates[templates.length - 1] === depth)) {
      // A template literal, or the rest of one after a `${…}`: up to its end or its next `${`.
      if (c === '}') templates.pop()
      let j = i + 1
      while (j < n && code[j] !== '`' && !(code[j] === '$' && code[j + 1] === '{')) j += code[j] === '\\' ? 2 : 1
      if (code[j] === '$') {
        cur += code.slice(i, j + 2)
        templates.push(depth)
        i = j + 2
      } else {
        cur += code.slice(i, j + 1)
        i = j + 1
      }
      continue
    }
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') depth--
    if (c === ';' && depth === 0) {
      if (cur.trim()) out.push(cur.trim())
      cur = ''
    } else cur += c
    i++
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}

const AsyncFunction = Object.getPrototypeOf(async () => undefined).constructor as new (...args: string[]) => (...a: unknown[]) => Promise<unknown>

/**
 * `code` as a function of a scope object: imports dropped, declarations made assignments to the scope (whose names
 * `names` lists), and the last statement's value returned. Throws when the code isn't in the form examples take.
 */
export function compile(code: string): { fn: (scope: object) => Promise<unknown>; names: string[] } {
  const names: string[] = []
  const body: string[] = []
  const stmts = statements(code).filter((s) => !/^import\s[\s\S]*\sfrom\s+['"][^'"]+['"]$|^import\s+['"][^'"]+['"]$/.test(s))
  let last = 'undefined'
  stmts.forEach((s, k) => {
    const decl = /^(?:const|let|var)\s+([^=\s]+)\s*=\s*([\s\S]+)$/.exec(s)
    let value: string
    if (decl) {
      if (!IDENT.test(decl[1])) throw new SyntaxError(`an example declares one name per statement: ${s.slice(0, 40)}`)
      names.push(decl[1])
      body.push(`${decl[1]} = (${decl[2]});`)
      value = decl[1]
    } else {
      if (/^(?:const|let|var|function|class)\s/.test(s)) throw new SyntaxError(`an example declares a name with \`= value\`: ${s.slice(0, 40)}`)
      if (k === stmts.length - 1) {
        body.push(`return (${s});`)
        last = ''
        return
      }
      body.push(`${s};`)
      value = 'undefined'
    }
    if (k === stmts.length - 1) last = value
  })
  if (last) body.push(`return ${last};`)
  // `with` makes the scope's names the example's: a function made this way is not strict, so it may use it.
  const fn = new AsyncFunction('__scope', `with (__scope) {\n${body.join('\n')}\n}`)
  return { fn: (scope: object) => fn(scope), names }
}

/** A scope for a page's examples: smaltdf's exports and `db`. */
export function scope(env: Env): Record<string, unknown> {
  return { ...env.df, db: env.db }
}

/** Runs one example in `s` (a page's scope) and gives its last statement's value, awaited. */
export async function evaluate(code: string, s: Record<string, unknown>): Promise<unknown> {
  const { fn, names } = compile(code)
  for (const name of names) if (!(name in s)) s[name] = undefined
  return await fn(s)
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/** A cell's display text: what the result tables under the examples print. */
export function show(v: unknown): string {
  if (v === null || v === undefined) return 'null'
  if (v instanceof Date) {
    const us = v.getUTCMilliseconds() ? `.${pad(v.getUTCMilliseconds(), 3)}` : ''
    return `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}-${pad(v.getUTCDate())} ${pad(v.getUTCHours())}:${pad(v.getUTCMinutes())}:${pad(v.getUTCSeconds())}${us}`
  }
  if (v instanceof Uint8Array) return `x'${Array.from(v, (b) => b.toString(16).padStart(2, '0')).join('')}'`
  if (typeof v === 'object') return JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))
  return String(v)
}

const isResult = (v: unknown): v is { columns: string[]; rows: unknown[][] } =>
  typeof v === 'object' && v !== null && Array.isArray((v as { columns?: unknown }).columns) && Array.isArray((v as { rows?: unknown }).rows)

/** An example's value as a table: a frame is collected on `db`, a result is its rows, anything else one row. */
export async function display(value: unknown, env: Env): Promise<Shown> {
  if (value instanceof env.df.Frame) value = await (value as { collect(db: unknown): Promise<unknown> }).collect(env.db)
  if (value === undefined) return { columns: [], rows: [], note: 'Done' }
  if (isResult(value)) return { columns: value.columns, rows: value.rows.map((r) => r.map(show)) }
  if (Array.isArray(value) && value.length && value.every((r) => typeof r === 'object' && r !== null && !Array.isArray(r))) {
    const columns = Object.keys(value[0] as object)
    return { columns, rows: value.map((r) => columns.map((c) => show((r as Record<string, unknown>)[c]))) }
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Uint8Array)) {
    const columns = Object.keys(value)
    return { columns, rows: [columns.map((c) => show((value as Record<string, unknown>)[c]))] }
  }
  return { columns: ['value'], rows: [[show(value)]] }
}

/** Runs a playground's setup (failures expected where marked), then its code, in one scope, and shows the result. */
export async function runExample(code: string, setup: readonly Step[], env: Env): Promise<Shown> {
  const s = scope(env)
  for (const step of setup) {
    if (typeof step === 'string') await evaluate(step, s)
    else await evaluate(step.sql, s).catch(() => undefined)
  }
  if (!statements(code).length) return { columns: [], rows: [], note: 'Nothing to run' }
  return display(await evaluate(code, s), env)
}
