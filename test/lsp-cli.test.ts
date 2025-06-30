import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanupLSPServers, getTestProjectPath, LANGUAGE_DIRS, LSP_SERVER_DIR, setupTestRepo } from './setup';
import { runLSPCLI } from './utils';

describe('LSP CLI Tests', () => {
    beforeAll(async () => {
        // Setup test repository
        await setupTestRepo();
    }, 120000); // 120 second timeout for cloning

    afterEach(() => {
        // Clean up output files
        const outputFiles = Object.keys(LANGUAGE_DIRS).map((lang) => `test-${lang}.json`);
        outputFiles.forEach((file) => {
            if (existsSync(file)) {
                rmSync(file);
            }
        });
    });

    describe('LSP Server Installation', () => {
        beforeAll(() => {
            cleanupLSPServers();
        });

        it('should install TypeScript language server', () => {
            const outputFile = 'test-typescript.json';
            const projectPath = getTestProjectPath('typescript');

            runLSPCLI(join(projectPath, 'spine-core'), 'typescript', outputFile);

            expect(existsSync(join(LSP_SERVER_DIR, 'typescript'))).toBe(true);
            expect(existsSync(outputFile)).toBe(true);
        });

        it('should install C++ language server', () => {
            const outputFile = 'test-cpp.json';
            const projectPath = getTestProjectPath('cpp');

            runLSPCLI(join(projectPath, 'spine-cpp'), 'cpp', outputFile);

            expect(existsSync(join(LSP_SERVER_DIR, 'cpp', 'clangd'))).toBe(true);
            expect(existsSync(outputFile)).toBe(true);
        });

        it('should install C language server', () => {
            const outputFile = 'test-c.json';
            const projectPath = getTestProjectPath('c');

            runLSPCLI(projectPath, 'c', outputFile);

            expect(existsSync(join(LSP_SERVER_DIR, 'c', 'clangd'))).toBe(true);
            expect(existsSync(outputFile)).toBe(true);
        });

        it('should install Java language server', () => {
            const outputFile = 'test-java.json';
            const projectPath = getTestProjectPath('java');

            runLSPCLI(join(projectPath, 'spine-libgdx'), 'java', outputFile);

            expect(existsSync(join(LSP_SERVER_DIR, 'java'))).toBe(true);
            expect(existsSync(outputFile)).toBe(true);
        });

        it('should install C# language server', () => {
            const outputFile = 'test-csharp.json';
            const projectPath = getTestProjectPath('csharp');

            runLSPCLI(projectPath, 'csharp', outputFile);

            expect(existsSync(join(LSP_SERVER_DIR, 'csharp'))).toBe(true);
            expect(existsSync(outputFile)).toBe(true);
        });

        it.skip('should install Haxe language server', () => {
            const outputFile = 'test-haxe.json';
            const projectPath = getTestProjectPath('haxe');

            runLSPCLI(projectPath, 'haxe', outputFile);

            expect(existsSync(join(LSP_SERVER_DIR, 'haxe'))).toBe(true);
            expect(existsSync(outputFile)).toBe(true);
        });
    });
});
