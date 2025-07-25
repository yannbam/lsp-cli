import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { SymbolInfo } from '../src/types';
import { runLSPCLI } from './utils';

describe('Comment Extraction Tests', () => {
    /**
     * Test TypeScript comment extraction with edge cases
     */
    it('should extract comments from TypeScript with edge cases', () => {
        const outputFile = 'test-typescript-comments.json';
        const fixturesPath = join(__dirname, 'fixtures', 'typescript');

        runLSPCLI(fixturesPath, 'typescript', outputFile);

        expect(existsSync(outputFile)).toBe(true);

        const result = JSON.parse(readFileSync(outputFile, 'utf-8'));
        const symbols = result.symbols as SymbolInfo[];

        // Find CommentTestService class and its methods
        const commentTestService = findSymbolByName(symbols, 'CommentTestService');
        expect(commentTestService).toBeDefined();

        const testMethod =
            findChildByName(commentTestService!, 'testCommentExtraction') ||
            findChildByName(commentTestService!, 'testCommentExtraction()');
        expect(testMethod).toBeDefined();
        expect(testMethod!.comments).toBeDefined();

        // Verify comment extraction patterns
        const comments = testMethod!.comments!;

        // Should contain grouped consecutive comments
        expect(comments).toContain('Step 1: Basic validation\nStep 2: Process data');

        // Should contain end-of-line comments but NOT string contents
        expect(comments).toContain('Validate user input');

        // Verify bug fix: should NOT contain comments that were inside strings
        expect(comments.every((c) => !c.includes('This should not trigger comment detection'))).toBe(true);
        expect(comments.every((c) => !c.includes('file://path/to/file'))).toBe(true);

        // Should contain single-line block comments
        expect(comments).toContain('Single-line block comment');
        expect(comments).toContain('Inline block comment');

        // Should contain multi-line block comments
        expect(comments.some((c) => c.includes('Multi-line block comment'))).toBe(true);

        // Should NOT contain comments that are inside strings
        expect(comments.every((c) => !c.includes('Template literal with'))).toBe(true);
        expect(comments.every((c) => !c.includes('escaped quote and comment'))).toBe(true);

        // Verify grouped vs separate comments
        expect(comments).toContain('Consecutive comment lines\nshould be grouped together\nas a single block');
        expect(comments).toContain('But this end-of-line comment stays separate');
    });

    /**
     * Test Java comment extraction with edge cases
     */
    it('should extract comments from Java with edge cases', () => {
        const outputFile = 'test-java-comments.json';
        const fixturesPath = join(__dirname, 'fixtures', 'java');

        runLSPCLI(fixturesPath, 'java', outputFile);

        expect(existsSync(outputFile)).toBe(true);

        const result = JSON.parse(readFileSync(outputFile, 'utf-8'));
        const symbols = result.symbols as SymbolInfo[];

        // Find CommentTestService and verify comment extraction
        const commentTestService = findSymbolByName(symbols, 'CommentTestService');
        expect(commentTestService).toBeDefined();

        const testMethod =
            findChildByName(commentTestService!, 'testCommentExtraction') ||
            findChildByName(commentTestService!, 'testCommentExtraction()');
        expect(testMethod).toBeDefined();
        expect(testMethod!.comments).toBeDefined();

        const comments = testMethod!.comments!;

        // Verify Java-specific comment patterns are captured
        expect(comments).toContain('Step 1: Basic validation\nStep 2: Process data');
        expect(comments).toContain('Validate user input');
        expect(comments).toContain('Single-line block comment');

        // Verify bug fix: string literals with comment symbols are correctly excluded
        expect(comments.every((c) => !c.includes('This should not trigger comment detection'))).toBe(true);
        expect(comments.every((c) => !c.includes('file://path/to/file'))).toBe(true);
    });

    /**
     * Test C comment extraction
     */
    it('should extract comments from C with edge cases', () => {
        const outputFile = 'test-c-comments.json';
        const fixturesPath = join(__dirname, 'fixtures', 'c');

        runLSPCLI(fixturesPath, 'c', outputFile);

        expect(existsSync(outputFile)).toBe(true);

        const result = JSON.parse(readFileSync(outputFile, 'utf-8'));
        const symbols = result.symbols as SymbolInfo[];

        // Find main function and verify C-style comments
        const mainFunction = findSymbolByName(symbols, 'main');
        expect(mainFunction).toBeDefined();

        // C functions should have comments extracted
        const testStringUtils = findSymbolByName(symbols, 'test_string_utils');
        if (testStringUtils?.comments) {
            const comments = testStringUtils.comments;

            // Verify C-style comments are captured
            expect(comments.some((c) => c.includes('Test string'))).toBe(true);
        }
    });
});

/**
 * Helper function to find symbol by name
 */
function findSymbolByName(symbols: SymbolInfo[], name: string): SymbolInfo | undefined {
    for (const symbol of symbols) {
        if (symbol.name === name) {
            return symbol;
        }
        if (symbol.children) {
            const found = findSymbolByName(symbol.children, name);
            if (found) return found;
        }
    }
    return undefined;
}

/**
 * Helper function to find child symbol by name
 */
function findChildByName(parent: SymbolInfo, name: string): SymbolInfo | undefined {
    if (!parent.children) return undefined;
    return parent.children.find((child) => child.name === name);
}
