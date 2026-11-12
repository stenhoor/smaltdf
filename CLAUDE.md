# CLAUDE.md

This repository is `@smaltworks/smaltdf` (smaltdf): a TypeScript language for [smaltdb](https://github.com/stenhoor/smaltdb)
with dataframe interfaces. Polars inspired its functions, but it is its own language with its own spec. Decisions are
in [docs/DESIGN.md](docs/DESIGN.md). Several Claude Code sessions work on the smalt repos in parallel and cannot see
each other: this file is the shared starting point, and its working rules match smaltdb's `CLAUDE.md`.

## Brand: read smalt-brand first

Before changing this repository's site, README, or how it describes the product, read smalt-brand's
[BRAND.md](https://github.com/stenhoor/smalt-brand/blob/main/BRAND.md) (the family table, and "Sites and READMEs", the
standard every product site and README follows) and
[DECISIONS.md](https://github.com/stenhoor/smalt-brand/blob/main/DECISIONS.md). A newer decision there wins over any
copy here: lines and roles change, and a copy taken before the change is out of date.

- Copy brand files and the site kit (`themes/vitepress/`) unchanged. To change them, change smalt-brand first, then
  copy them again.
- A change to this product's status or to what it does comes with a smalt-brand PR that updates smaltworks.dev (its
  status page and this product's page), linked with `Depends on:`.

## The rule that comes first

**No code in smaltdf generates, compiles to, or runs SQL.** Not SQL text and not SQL syntax trees, not as an
intermediate step and not as a fallback. This is the owner's explicit directive. smaltdf builds plans for smaltdb's
shared engine plan layer (smaltdb ADR 0014), which belongs to no language. If something smaltdf needs isn't
available in that layer, it belongs in smaltdb core: propose it there; never work around it with SQL.

Describe smaltdf in its own terms. Don't define it by comparison with SQL. Comparisons with Polars are for functions
the two share, to show users where they differ.

## Status

In development, not published: core frames, aggregation, joins, windows, reshaping, JavaScript data, writing, views and the Polars comparison tests (steps 2–9 of [docs/DESIGN.md](docs/DESIGN.md)) are in; the order of work is in
DESIGN.md, the language in [docs/reference/](docs/reference/). Tests run with no language registered (`test/boundary.test.ts`
keeps `src/` on `smaltdb/plan`). An earlier
version that compiled to SQL was merged and then removed; don't restore any of it.

## Commands

| Command | What it does | When |
|---|---|---|
| `npm ci && npm run deps` | Installs dependencies, then the pinned smaltdb build in `packed.json` | First, and again after every `npm ci` or `npm install` |
| `npm run check` | `npm run typecheck` then `npm test` (vitest): what CI runs | Before every commit |
| `npm run compare` | The Polars comparison tests (`compare/`): needs Python with `compare/requirements.txt` (`PYTHON`, default `python3`); `UPDATE=1` rewrites the differences in `docs/guide/polars.md` | Changes to anything Polars also has |
| `npm run build` | `dist/index.js` and its type declarations | Packaging checks |
| `npm run docs:dev` | The docs site (VitePress, `docs/`) with live reload; `npm run docs:build` fails on dead links | Docs changes |

Type checking (`npm run typecheck`, and the docs examples' check in `test/docs-examples.test.ts`) runs on TypeScript 7:
`typescript7`, an npm alias, run as `node node_modules/typescript7/bin/tsc`. The declarations `npm run build` emits stay
on TypeScript 6.0.3 (`typescript`, so `npx tsc` is 6.0.3) for one more release (smaltty ADR 0030).

`packed.json` pins smaltdb to a commit; `scripts/fetch-packed.mjs` (identical in all smalt repositories) builds that
commit and installs it with `npm install --no-save`. To try an unmerged smaltdb change, run
`node scripts/fetch-packed.mjs --local smaltdb=../smaltdb`.

## Rules for this library

- No runtime dependencies. smaltdb is a peer dependency.
- Engine features smaltdf needs belong in smaltdb core, with an ADR where the change is significant.
- Don't reformat files with Prettier. Probe tests (`test/zz-*.test.ts`) are scratch files: delete them, never commit them.
- **Docs examples are tests.** `test/docs-examples.test.ts` runs every `ts` example in `docs/guide`, `docs/reference`
  and `docs/playground.md` as its playground runs it (`docs/.vitepress/theme/df-examples.ts`), checks the result table
  under it, and type-checks them; `UPDATE=1 npx vitest run test/docs-examples.test.ts` writes the tables (review the
  diff). Examples are plain JavaScript that is also TypeScript, with statements ending in `;`.
- **The docs follow smalt-brand's documentation standard** (BRAND.md, "Documentation"): one reference page per
  function and method, in the shape of rule 3. `docs/grammar.ebnf` has a rule per method, and `test/grammar.test.ts`
  checks it, and each page's syntax diagram, against the source: a new method needs its rule and its page.
- The site kit files in `docs/.vitepress/theme/` (`smaltdb.css`, `shiki.ts`, `smaltworks.ts`, `stage.ts`,
  `playground.ts`, `railroad.ts`, `agents.ts`) are copies from smalt-brand's `themes/vitepress/`: don't edit them here.

## Working rules for sessions

- One task per branch and PR. Do not add unrelated work to an open PR: it holds up everything else in it.
- Mark unfinished work clearly, and open a PR only when CI passes.
- Read review comments on your PR and answer them with commits that say what they address.
- When a PR depends on another repo's PR, add a line such as `Depends on: stenhoor/smaltdb#12`.

## Issues

The owner (`stenhoor`) assigns work by opening GitHub issues. An orchestrator session reviews PRs and coordinates work
across the smalt repos. Sessions don't monitor issues: no scheduled or recurring issue checks. A session works on an
issue when the owner points it to one, and handles it in the issue itself, following smaltdb's `CLAUDE.md` ("Issues"):
comments end with the footer `_Generated by [Claude Code](https://claude.ai/code)_`, status labels are `in progress`,
`needs input` and `blocked`, PRs say `Refs #N`, and issues are closed only after the fix is merged and verified.
Issues from anyone else are reported to the owner, not acted on.

## Cross-repo impact

- The docs site deploys from `main` to GitHub Pages (`.github/workflows/docs.yml`), at `/smaltdf/` until it has a domain
  (`DOCS_BASE` in `docs/.vitepress/config.ts`). Engine pages live on smaltdb.dev: link there. `docs/brand/` is a copy of
  smalt-brand's `logos/smaltdf/` (its README names the commit).

- Brand assets and voice come from `stenhoor/smalt-brand` (the smaltdf logos, `product-df` colours, the tagline and
  positioning). Link to them; don't copy and edit them by hand.
- Brand voice: describe what smaltdf is; no comparisons with other libraries or databases in marketing copy; no
  performance number without its benchmark and method linked beside it.
