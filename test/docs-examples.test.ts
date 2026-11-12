/**
 * Every TypeScript example in the documentation (docs/guide, docs/reference, docs/playground.md) runs here, the way its
 * playground runs it (docs/.vitepress/theme/df-examples.ts), and the result table printed under it must match what it
 * gives. A page's examples run in order, in one scope, on one fresh in-memory database with smaltdf registered (for
 * views). They are also type-checked against smaltdf's public API, one file per page.
 *
 * Markers: an HTML comment on the line(s) before a fence.
 *   <!-- docs:skip -->          not run (installation, a worker entry): type-checked as a module of its own, as written
 *   <!-- docs:error CODE -->    the example must fail with this error code (it is not type-checked)
 *   <!-- docs:unordered -->     compare the result rows in any order
 *   <!-- docs:setup ... -->     hidden code run before the next example
 * A Markdown table directly after the fence is the example's result: the header is the column names, and each cell is
 * a value's display text (`null`, `true`, JSON for lists and structs, x'hex' for blobs). A cell in backticks is taken
 * literally. `UPDATE=1 npm test -- docs-examples` writes the tables instead of checking them.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Database, registerLanguage } from 'smaltdb/engine';
import * as df from '../src/index.js';
import { display, evaluate, scope, statements, type Env } from '../docs/.vitepress/theme/df-examples.js';

const DOCS = 'docs';
const PAGES = ['guide', 'reference', 'playground.md'];
const UPDATE = process.env.UPDATE === '1';

registerLanguage(df.dfLanguage);

function pages(): string[] {
  const out: string[] = [];
  const walk = (p: string): void => {
    if (statSync(p).isDirectory()) for (const e of readdirSync(p).sort()) walk(join(p, e));
    else if (p.endsWith('.md')) out.push(p);
  };
  for (const p of PAGES) {
    try {
      walk(join(DOCS, p));
    } catch {
      /* not there */
    }
  }
  return out;
}

interface Block {
  lang: string;
  code: string;
  /** The fence's first line (1-based). */
  line: number;
  /** The line after the closing fence (0-based), and the result table's lines [from, to) if it has one. */
  after: number;
  table: { from: number; to: number; header: string[]; rows: string[][] } | null;
  markers: string[];
}

function splitRow(line: string): string[] {
  const s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const cells: string[] = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') {
      cur += '|';
      i++;
    } else if (s[i] === '|') {
      cells.push(cur);
      cur = '';
    } else cur += s[i];
  }
  cells.push(cur);
  return cells.map((c) => {
    const t = c.trim();
    const m = /^`(.*)`$/.exec(t);
    return m ? m[1] : t;
  });
}

function blocks(lines: string[]): Block[] {
  const out: Block[] = [];
  let markers: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const marker = /^\s*<!--\s*(docs:[\s\S]*?)\s*-->\s*$/.exec(lines[i]);
    if (marker) {
      markers.push(marker[1]);
      continue;
    }
    const fence = /^(\s*)(```+)\s*([\w-]*)/.exec(lines[i]);
    if (!fence) {
      if (lines[i].trim() !== '') markers = [];
      continue;
    }
    const start = i;
    const body: string[] = [];
    for (i++; i < lines.length && !lines[i].trim().startsWith(fence[2]); i++) body.push(lines[i]);
    const after = i + 1;
    let j = after;
    while (j < lines.length && lines[j].trim() === '') j++;
    let table: Block['table'] = null;
    if (lines[j]?.trim().startsWith('|') && /^\s*\|?\s*:?-+/.test(lines[j + 1] ?? '')) {
      let k = j + 2;
      const rows: string[][] = [];
      for (; k < lines.length && lines[k].trim().startsWith('|'); k++) rows.push(splitRow(lines[k]));
      table = { from: j, to: k, header: splitRow(lines[j]), rows };
      i = k - 1;
    }
    out.push({ lang: fence[3], code: body.join('\n'), line: start + 1, after, table, markers });
    markers = [];
  }
  return out;
}

const runs = (b: Block): boolean => b.lang === 'ts' && !b.markers.includes('docs:skip');
const errorCode = (b: Block): string | undefined => b.markers.map((m) => /^docs:error\s+(\S+)/.exec(m)?.[1]).find(Boolean);

/**
 * A cell as the table prints it: `|` escaped, empty text blank, and in backticks text with spaces at its ends or with
 * `<` or `>` (which the page would otherwise read as HTML: `list<text>`).
 */
function cell(text: string): string {
  const t = text.replace(/\|/g, '\\|');
  return t.trim() !== t || /[<>]/.test(t) ? `\`${t}\`` : t;
}

function tableText(columns: string[], rows: string[][]): string[] {
  return [`| ${columns.map(cell).join(' | ')} |`, `| ${columns.map(() => '---').join(' | ')} |`, ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`)];
}

const all = pages();

describe('documentation examples', () => {
  it('finds the documentation pages', () => {
    expect(all.length).toBeGreaterThan(0);
  });
  for (const page of all) {
    it(page, async () => {
      const text = readFileSync(page, 'utf8');
      const lines = text.split('\n');
      const db = Database.openMemory();
      const env: Env = { df: df as unknown as Env['df'], db };
      const s = scope(env);
      // Tables to write under examples (UPDATE=1): [line to replace from, to, the new lines].
      const edits: [number, number, string[]][] = [];
      try {
        for (const b of blocks(lines)) {
          const where = `${page}:${b.line}`;
          for (const m of b.markers) {
            const setup = /^docs:setup\s+([\s\S]*)$/.exec(m);
            if (setup) await evaluate(setup[1], s);
          }
          if (!runs(b)) continue;
          const err = errorCode(b);
          if (err) {
            const got = await evaluate(b.code, s).then(
              (v) => (v instanceof df.Frame ? v.collect(db) : v),
            ).then(
              () => 'no error',
              (e: { code?: string; message: string }) => e.code ?? e.message,
            );
            expect(got, `${where}: expected error ${err}`).toBe(err);
            continue;
          }
          let shown;
          try {
            shown = await display(await evaluate(b.code, s), env);
          } catch (e) {
            throw new Error(`${where}: ${(e as Error).message}\n${b.code}`);
          }
          if (UPDATE) {
            if (!shown.columns.length) continue;
            const t = tableText(shown.columns, shown.rows);
            if (b.table) edits.push([b.table.from, b.table.to, t]);
            else edits.push([b.after, b.after, ['', ...t]]);
            continue;
          }
          if (!b.table) continue;
          expect(shown.columns, `${where}: columns`).toEqual(b.table.header);
          const want = b.table.rows;
          if (b.markers.includes('docs:unordered')) {
            const key = (r: string[]): string => JSON.stringify(r);
            expect(shown.rows.map(key).sort(), `${where}: rows`).toEqual(want.map(key).sort());
          } else expect(shown.rows, `${where}: rows`).toEqual(want);
        }
      } finally {
        db.close();
      }
      if (UPDATE && edits.length) {
        for (const [from, to, t] of edits.reverse()) lines.splice(from, to - from, ...t);
        writeFileSync(page, lines.join('\n'));
      }
    });
  }
});

describe('documentation examples type-check', () => {
  it('against the public API, one file per page', () => {
    const dir = join('.cache', 'docs-ts');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const names = Object.keys(df).sort().join(', ');
    const files: string[] = [];
    const origin = new Map<string, string>();
    for (const page of all) {
      const lines = readFileSync(page, 'utf8').split('\n');
      const parts: string[] = [];
      blocks(lines).forEach((b, n) => {
        // An example that doesn't run (installation, a worker entry) is checked as a module of its own, as written.
        if (b.lang === 'ts' && b.markers.includes('docs:skip')) {
          const declaresDb = /\b(const|let|var)\s+db\b/.test(b.code);
          const name = `${page.replace(/[\\/]/g, '_').replace(/\.md$/, '')}_${n}.ts`;
          writeFileSync(join(dir, name), `${declaresDb ? '' : "declare const db: import('smaltdb/engine').Database;\n"}${b.code}\nexport {};\n`);
          files.push(name);
          origin.set(name, `${page}:${b.line}`);
        }
        if (!runs(b) || errorCode(b)) return;
        // Imports of smaltdf are the prelude's; the page's examples share one scope, as when they run.
        const code = statements(b.code).filter((st) => !/^import\s/.test(st)).map((st) => `${st};`).join('\n');
        parts.push(`// ${page}:${b.line}\n${code}`);
      });
      if (!parts.length) continue;
      const name = `${page.replace(/[\\/]/g, '_').replace(/\.md$/, '')}.ts`;
      writeFileSync(
        join(dir, name),
        `import { ${names} } from '@smaltworks/smaltdf';\nimport type { Database } from 'smaltdb/engine';\n` +
          `declare const db: Database;\n${parts.join('\n')}\nexport {};\n`,
      );
      files.push(name);
      origin.set(name, page);
    }
    const root = relative(dir, '.');
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'Bundler',
          lib: ['ES2022', 'DOM', 'WebWorker'],
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          noUnusedLocals: false,
          types: [],
          paths: {
            '@smaltworks/smaltdf': [join(root, 'src/index.ts')],
            smaltdb: [join(root, 'node_modules/smaltdb/src/client/index.ts')],
            'smaltdb/engine': [join(root, 'node_modules/smaltdb/src/engine/index.ts')],
            'smaltdb/plan': [join(root, 'node_modules/smaltdb/src/engine/plan/portable.ts')],
            'smaltdb/language': [join(root, 'node_modules/smaltdb/src/engine/language-support.ts')],
            'smaltdb/worker-runtime': [join(root, 'node_modules/smaltdb/src/engine/worker-runtime.ts')],
          },
        },
        files,
      }),
    );
    let output = '';
    try {
      execFileSync(process.execPath, [join('node_modules', 'typescript7', 'bin', 'tsc'), '-p', join(dir, 'tsconfig.json')], { encoding: 'utf8' });
    } catch (e) {
      output = String((e as { stdout?: string }).stdout ?? e);
    }
    const report = output.replace(/^\.cache[\\/]docs-ts[\\/](\S+?\.ts)/gm, (_m, f: string) => `${origin.get(f) ?? f} (${f})`);
    expect(report, report).toBe('');
  }, 120_000);
});
