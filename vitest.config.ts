import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        testTimeout: 60000, // 60 seconds default timeout for heavy LSP operations
        hookTimeout: 120000, // 120 seconds for setup hooks
        // Run tests sequentially to avoid LSP server conflicts
        maxConcurrency: 1,
        fileParallelism: false
    },
    resolve: {
        extensions: ['.ts', '.js', '.json']
    }
});
