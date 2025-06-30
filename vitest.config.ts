import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		testTimeout: 60000, // 60 seconds default timeout for heavy LSP operations
		hookTimeout: 120000 // 120 seconds for setup hooks
	},
	resolve: {
		extensions: ['.ts', '.js', '.json']
	}
});
