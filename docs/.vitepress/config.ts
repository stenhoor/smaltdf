import { defineConfig } from 'vitepress'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { smaltLight, smaltDark } from './theme/shiki'

const here = path.dirname(fileURLToPath(import.meta.url))
const REPO = 'https://github.com/stenhoor/smaltdf'
// Served at stenhoor.github.io/smaltdf/ until the site has a domain of its own: then DOCS_BASE is '/'.
const base = process.env.DOCS_BASE ?? '/smaltdf/'
const ENGINE = 'https://smaltdb.dev'

export default defineConfig({
  title: 'smaltdf',
  description: 'Dataframes for smaltdb. Small and fast.',
  base,
  cleanUrls: true,
  srcExclude: ['brand/**'],
  lastUpdated: false,
  // docs/brand holds the logo files; serve them from the site root.
  vite: { publicDir: path.resolve(here, '../brand') },
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon-32.svg` }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;700&family=Geist+Mono:wght@400;500&family=Martian+Mono:wght@400;600&display=swap' }],
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
    },
  },
  themeConfig: {
    logo: { light: '/lockup.svg', dark: '/lockup-on-dark.svg', alt: 'smaltdf' },
    siteTitle: false,
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Reference', link: '/REFERENCE' },
      { text: 'Status', link: '/guide/status' },
      {
        text: 'smaltdb',
        items: [
          { text: 'The engine', link: `${ENGINE}/reference/engine/` },
          { text: 'The plan format', link: `${ENGINE}/reference/engine/plans` },
          { text: 'Engine API', link: `${ENGINE}/reference/api/engine` },
          { text: 'Error codes', link: `${ENGINE}/reference/api/errors` },
          { text: 'Roadmap', link: `${ENGINE}/ROADMAP` },
        ],
      },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Status', link: '/guide/status' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Frames', link: '/REFERENCE#frames' },
          { text: 'Expressions', link: '/REFERENCE#expressions' },
          { text: 'Aggregation', link: '/REFERENCE#aggregation' },
          { text: 'Joins', link: '/REFERENCE#joins' },
          { text: 'Windows', link: '/REFERENCE#windows' },
          { text: 'Reshaping', link: '/REFERENCE#reshaping' },
          { text: 'Data from JavaScript', link: '/REFERENCE#data-from-javascript' },
          { text: 'Writing', link: '/REFERENCE#writing' },
          { text: 'Views', link: '/REFERENCE#views' },
          { text: 'Compared with Polars', link: '/REFERENCE#compared-with-polars' },
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
    footer: { message: 'MIT License', copyright: 'smaltdf' },
  },
})
