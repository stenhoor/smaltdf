import { defineConfig } from 'vitepress'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'
import { smaltLight, smaltDark } from './theme/shiki'
import { smaltworksMenu, smaltworksFooter } from './theme/smaltworks'
import { playgroundPlugin } from './theme/playground'
import { railroadPlugin } from './theme/railroad'
import { agentDocs, packageVersion } from './theme/agents'

const here = path.dirname(fileURLToPath(import.meta.url))
const REPO = 'https://github.com/stenhoor/smaltdf'
// Served at stenhoor.github.io/smaltdf/ until the site has a domain of its own: then DOCS_BASE is '/'.
const base = process.env.DOCS_BASE ?? '/smaltdf/'
const ENGINE = 'https://smaltdb.dev'
// smaltdf's grammar: the method chains, written from the source and tested against it (test/grammar.test.ts). The
// syntax diagrams and the agent guide read it.
const GRAMMAR = readFileSync(path.resolve(here, '../grammar.ebnf'), 'utf8')

// A group of the reference in the sidebar: its page, then a page per method, in the order of the group page's list
// (`- [name](./page): summary`), so the sidebar and the group page cannot disagree.
function group(text: string, dir: string) {
  const md = readFileSync(path.resolve(here, `../reference/${dir}/index.md`), 'utf8')
  const items = [...md.matchAll(/^- \[(.+?)\]\(\.\/([\w-]+)\): /gm)].map(([, label, page]) => ({
    text: label.replace(/`/g, ''),
    link: `/reference/${dir}/${page}`,
  }))
  return { text, link: `/reference/${dir}/`, collapsed: true, items }
}

export default defineConfig({
  title: 'smaltdf',
  description: 'Dataframes for smaltdb. Small and fast.',
  base,
  cleanUrls: true,
  srcExclude: ['brand/**'],
  lastUpdated: false,
  // docs/brand holds the logo files; serve them from the site root.
  vite: {
    publicDir: path.resolve(here, '../brand'),
    // The playgrounds' engine: smaltdb's build and its worker, bundled into the site (never loaded from a CDN).
    optimizeDeps: { exclude: ['smaltdb'] },
    worker: { format: 'es' },
  },
  // Markdown for AI agents beside the pages: a twin of each page, /llms.txt and /agents.md (BRAND.md, Documentation).
  buildEnd: (config) => {
    agentDocs(config, {
      product: 'smaltdf',
      version: packageVersion(path.resolve(here, '../../package.json')),
      url: `https://stenhoor.github.io${base}`,
      intro: 'guide/agents.md',
      grammar: GRAMMAR,
      guide: [
        'reference/',
        'reference/frames/',
        'reference/expressions/',
        'reference/aggregates/',
        'reference/windows/',
        'reference/str/',
        'reference/dt/',
        'reference/list/',
        'reference/writing/',
        'guide/errors',
        'guide/polars',
      ],
    })
  },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon-32.svg` }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;700&family=Geist+Mono:wght@400;500&family=Martian+Mono:wght@400;600&display=swap' }],
    ['meta', { property: 'og:title', content: 'smaltdf' }],
    ['meta', { property: 'og:description', content: 'Dataframes for smaltdb. Small and fast.' }],
    ['meta', { property: 'og:image', content: 'https://raw.githubusercontent.com/stenhoor/smalt-brand/main/social/smaltdf.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
  ],
  markdown: {
    theme: { light: smaltLight, dark: smaltDark },
    config(md) {
      // Links that leave docs/ (the comparison cases, sources) point at the file on GitHub.
      const fallback = md.renderer.rules.link_open ?? ((t, i, o, _e, s) => s.renderToken(t, i, o))
      md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
        const href = tokens[idx].attrGet('href')
        if (href && !/^[a-z]+:|^#|^\//i.test(href) && env?.relativePath) {
          const target = path.posix.normalize(path.posix.join(path.posix.dirname(env.relativePath), href))
          if (target.startsWith('../')) {
            tokens[idx].attrSet('href', `${REPO}/blob/HEAD/${target.slice(3)}`)
            tokens[idx].attrSet('target', '_blank')
            tokens[idx].attrSet('rel', 'noreferrer')
          }
        }
        return fallback(tokens, idx, options, env, self)
      }
      // ```ts fences are playgrounds (BRAND.md, Documentation, rule 7): every tested example runs in place.
      md.use(playgroundPlugin, { languages: ['ts'] })
      // ```railroad fences draw rules of the grammar as syntax diagrams (rule 4).
      md.use(railroadPlugin, { grammar: GRAMMAR })
    },
  },
  themeConfig: {
    logo: { light: '/lockup.svg', dark: '/lockup-on-dark.svg', alt: 'smaltdf' },
    siteTitle: false,
    // The four sections of every smalt site (BRAND.md, Documentation, rule 1).
    nav: [
      { text: 'Quick start', link: '/guide/quick-start' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/reference/' },
      { text: 'Playground', link: '/playground' },
      smaltworksMenu(),
    ],
    sidebar: [
      {
        text: 'Quick start',
        items: [{ text: 'Quick start', link: '/guide/quick-start' }],
      },
      {
        text: 'Getting started',
        items: [
          { text: 'Installation', link: '/guide/getting-started' },
          { text: 'Tutorial', link: '/guide/tutorial' },
          { text: 'For AI agents', link: '/guide/agents' },
          { text: 'Status', link: '/guide/status' },
        ],
      },
      {
        text: 'User guide',
        items: [
          { text: 'Frames and expressions', link: '/guide/frames' },
          { text: 'Columns, rows and order', link: '/guide/columns-and-rows' },
          { text: 'Aggregation', link: '/guide/aggregation' },
          { text: 'Joins and concatenation', link: '/guide/joins' },
          { text: 'Windows', link: '/guide/windows' },
          { text: 'Reshaping', link: '/guide/reshaping' },
          { text: 'Data from JavaScript', link: '/guide/javascript-data' },
          { text: 'Dates and times', link: '/guide/dates-and-times' },
          { text: 'Lists and structs', link: '/guide/lists-and-structs' },
          { text: 'Writing', link: '/guide/writing' },
          { text: 'Views', link: '/guide/views' },
          { text: 'Errors', link: '/guide/errors' },
          { text: 'Compared with Polars', link: '/guide/polars' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Overview', link: '/reference/' },
          group('Frames', 'frames'),
          group('Expressions', 'expressions'),
          group('Aggregates', 'aggregates'),
          group('Windows', 'windows'),
          group('Text (str)', 'str'),
          group('Dates and times (dt)', 'dt'),
          group('Lists and structs', 'list'),
          group('Writing and views', 'writing'),
          { text: 'API', link: '/reference/api' },
          { text: 'Plans and engine (smaltdb.dev)', link: `${ENGINE}/reference/engine/plans` },
        ],
      },
      {
        text: 'Design',
        items: [{ text: 'Decisions and order of work', link: '/DESIGN' }],
      },
    ],
    socialLinks: [{ icon: 'github', link: REPO }],
    search: { provider: 'local' },
    outline: { level: [2, 3] },
    footer: smaltworksFooter(base),
  },
})
