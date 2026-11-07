import { defineConfig, mergeConfig } from 'vitest/config';
import base from './vitest.config.js';

// The Polars comparison tests (compare/): not part of npm test, since they need Python and Polars. mergeConfig would
// add to the base config's include, so it is set after.
const config = mergeConfig(base, defineConfig({}));
config.test = { ...config.test, include: ['compare/**/*.test.ts'] };
export default config;
