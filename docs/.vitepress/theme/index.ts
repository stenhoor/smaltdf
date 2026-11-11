import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import './smaltdb.css'
import { withSmaltworks } from './stage'
import { enablePlaygrounds } from './playground'
import { enableRailroad } from './railroad'
import { dfRunner } from './smaltdf'

export default {
  extends: DefaultTheme,
  Layout: withSmaltworks(DefaultTheme),
  enhanceApp() {
    if (typeof document === 'undefined') return
    enablePlaygrounds({ runners: { ts: dfRunner } })
    enableRailroad()
  },
} satisfies Theme
