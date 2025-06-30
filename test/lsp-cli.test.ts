import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanupLSPServers, getTestProjectPath, LANGUAGE_DIRS, LSP_SERVER_DIR, setupTestRepo } from './setup';
import { findSymbol, findSymbolsByKind, readOutput, runLSPCLI } from './utils';

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

        it('should install Haxe language server', () => {
            const outputFile = 'test-haxe.json';
            const projectPath = getTestProjectPath('haxe');

            runLSPCLI(projectPath, 'haxe', outputFile);

            expect(existsSync(join(LSP_SERVER_DIR, 'haxe'))).toBe(true);
            expect(existsSync(outputFile)).toBe(true);
        });
    });

    describe('Symbol Extraction', () => {
        describe('TypeScript', () => {
            it('should extract classes with members', () => {
                const outputFile = 'test-typescript-symbols.json';
                const projectPath = getTestProjectPath('typescript');

                runLSPCLI(join(projectPath, 'spine-core', 'src'), 'typescript', outputFile);

                const result = readOutput(outputFile);
                expect(result.symbols.length).toBeGreaterThan(0);

                // Look for a known class
                const skeleton = findSymbol(result.symbols, 'Skeleton', 'class');
                expect(skeleton).toBeDefined();
                expect(skeleton?.children).toBeDefined();
                expect(skeleton?.children?.length).toBeGreaterThan(0);

                // Check for methods
                const methods = findSymbolsByKind(skeleton?.children || [], 'method');
                expect(methods.length).toBeGreaterThan(0);
            });

            it('should extract enums with values', () => {
                const outputFile = 'test-typescript-enums.json';
                const projectPath = getTestProjectPath('typescript');

                runLSPCLI(join(projectPath, 'spine-core', 'src'), 'typescript', outputFile);

                const result = readOutput(outputFile);
                const enums = findSymbolsByKind(result.symbols, 'enum');
                expect(enums.length).toBeGreaterThan(0);

                // Check that enums have children (enum values)
                const enumWithValues = enums.find((e) => e.children && e.children.length > 0);
                expect(enumWithValues).toBeDefined();
            });
        });

        describe('C++', () => {
            it('should extract classes and structs', () => {
                const outputFile = 'test-cpp-symbols.json';
                const projectPath = getTestProjectPath('cpp');

                runLSPCLI(join(projectPath, 'spine-cpp'), 'cpp', outputFile);

                const result = readOutput(outputFile);
                expect(result.symbols.length).toBeGreaterThan(0);

                const classes = findSymbolsByKind(result.symbols, 'class');
                const structs = findSymbolsByKind(result.symbols, 'struct');

                expect(classes.length + structs.length).toBeGreaterThan(0);
            });

            it('should extract global functions', () => {
                const outputFile = 'test-cpp-functions.json';
                const projectPath = getTestProjectPath('cpp');

                runLSPCLI(join(projectPath, 'spine-cpp'), 'cpp', outputFile);

                const result = readOutput(outputFile);
                const functions = findSymbolsByKind(result.symbols, 'function');

                expect(functions.length).toBeGreaterThan(0);
            });
        });

        describe('Java', () => {
            it('should extract interfaces and implementations', () => {
                const outputFile = 'test-java-symbols.json';
                const projectPath = getTestProjectPath('java');

                runLSPCLI(join(projectPath, 'spine-libgdx'), 'java', outputFile);

                const result = readOutput(outputFile);
                expect(result.symbols.length).toBeGreaterThan(0);

                const interfaces = findSymbolsByKind(result.symbols, 'interface');
                expect(interfaces.length).toBeGreaterThan(0);
            });
        });

        describe('C#', () => {
            it('should extract classes with properties', () => {
                const outputFile = 'test-csharp-symbols.json';
                const projectPath = getTestProjectPath('csharp');

                runLSPCLI(projectPath, 'csharp', outputFile);

                const result = readOutput(outputFile);
                expect(result.symbols.length).toBeGreaterThan(0);

                const classes = findSymbolsByKind(result.symbols, 'class');
                expect(classes.length).toBeGreaterThan(0);

                // Check for properties in classes
                const classWithProps = classes.find((c) => c.children?.some((child) => child.kind === 'property'));
                expect(classWithProps).toBeDefined();
            });
        });

        describe('C', () => {
            it('should extract structs and functions', () => {
                const outputFile = 'test-c-symbols.json';
                const projectPath = getTestProjectPath('c');

                runLSPCLI(projectPath, 'c', outputFile);

                const result = readOutput(outputFile);
                expect(result.symbols.length).toBeGreaterThan(0);

                const structs = findSymbolsByKind(result.symbols, 'struct');
                const functions = findSymbolsByKind(result.symbols, 'function');

                expect(structs.length + functions.length).toBeGreaterThan(0);
            });
        });

        describe('Haxe', () => {
            it('should extract classes and interfaces', () => {
                const outputFile = 'test-haxe-symbols.json';
                const projectPath = getTestProjectPath('haxe');

                runLSPCLI(projectPath, 'haxe', outputFile);

                const result = readOutput(outputFile);
                expect(result.symbols.length).toBeGreaterThan(0);

                const classes = findSymbolsByKind(result.symbols, 'class');
                const interfaces = findSymbolsByKind(result.symbols, 'interface');

                expect(classes.length + interfaces.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Documentation Extraction', () => {
        it('should extract documentation comments', () => {
            const outputFile = 'test-docs.json';
            const projectPath = getTestProjectPath('typescript');

            runLSPCLI(join(projectPath, 'spine-core', 'src'), 'typescript', outputFile);

            const result = readOutput(outputFile);

            // Find symbols with documentation
            const symbolsWithDocs = result.symbols.filter((s) => s.documentation);
            expect(symbolsWithDocs.length).toBeGreaterThan(0);
        });
    });
});
