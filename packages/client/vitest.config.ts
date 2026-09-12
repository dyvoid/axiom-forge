import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Component tests render into jsdom; the pure-helper tests under
		// src/utils don't need it, so each .test.tsx opts in with a
		// `@vitest-environment jsdom` docblock rather than paying for a DOM
		// everywhere.
		environment: 'node',
		setupFiles: ['./src/test/setup.ts'],
	},
});
