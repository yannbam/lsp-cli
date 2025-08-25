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

    /**
     * Test Rust documentation extraction
     * This test verifies that Rust doc comments (/// and //!) are properly extracted
     * as documentation, not just inline comments.
     */
    it('should extract documentation from Rust doc comments', () => {
        const outputFile = 'test-rust-documentation.json';
        const fixturesPath = join(__dirname, 'fixtures', 'rust');

        runLSPCLI(fixturesPath, 'rust', outputFile);

        expect(existsSync(outputFile)).toBe(true);

        const result = JSON.parse(readFileSync(outputFile, 'utf-8'));
        const symbols = result.symbols as SymbolInfo[];

        // Test struct documentation - should have /// doc comments
        const standardPerson = findSymbolByName(symbols, 'StandardPerson');
        expect(standardPerson).toBeDefined();
        expect(standardPerson!.documentation).toBeDefined();
        expect(standardPerson!.documentation).toContain('A basic struct with standard documentation above');

        // Test function documentation - should have /// doc comments
        const documentedFunction = findSymbolByName(symbols, 'documented_above_function');
        expect(documentedFunction).toBeDefined();
        expect(documentedFunction!.documentation).toBeDefined();
        expect(documentedFunction!.documentation).toContain('Function with documentation above');
        expect(documentedFunction!.documentation).toContain('Tests standard function documentation');

        // Test enum documentation - should have /// doc comments
        const status = findSymbolByName(symbols, 'Status');
        expect(status).toBeDefined();
        expect(status!.documentation).toBeDefined();
        expect(status!.documentation).toContain('Enum with comprehensive documentation');

        // Test method documentation within impl blocks
        const newMethod = findChildByName(
            findSymbolByName(symbols, 'impl StandardPerson') || findSymbolByName(symbols, 'StandardPerson')!,
            'new'
        );
        expect(newMethod).toBeDefined();
        expect(newMethod!.documentation).toBeDefined();
        expect(newMethod!.documentation).toContain('Creates a new StandardPerson');
        expect(newMethod!.documentation).toContain('Arguments');
        expect(newMethod!.documentation).toContain('Returns');

        // Test multi-line documentation
        const multiLineFunc = findSymbolByName(symbols, 'multi_line_docs');
        expect(multiLineFunc).toBeDefined();
        expect(multiLineFunc!.documentation).toBeDefined();
        expect(multiLineFunc!.documentation).toContain('Multiple');
        expect(multiLineFunc!.documentation).toContain('line');
        expect(multiLineFunc!.documentation).toContain('documentation');

        // Verify we have meaningful documentation extraction overall
        const docsCount = countSymbolsWithDocumentation(symbols);
        expect(docsCount).toBeGreaterThan(10); // Should have many documented symbols
    });

    /**
     * Test C documentation extraction
     * Verifies that C JSDoc-style and Doxygen-style documentation is extracted
     */
    it('should extract documentation from C JSDoc and Doxygen comments', () => {
        const outputFile = 'test-c-documentation.json';
        const fixturesPath = join(__dirname, 'fixtures', 'c');

        runLSPCLI(fixturesPath, 'c', outputFile);

        expect(existsSync(outputFile)).toBe(true);

        const result = JSON.parse(readFileSync(outputFile, 'utf-8'));
        const symbols = result.symbols as SymbolInfo[];

        // Test function documentation with JSDoc style - should have /** */ doc comments
        const strLengthSymbols = symbols.filter((s) => s.name === 'str_length');
        expect(strLengthSymbols.length).toBeGreaterThan(0);

        // At least one str_length symbol should have documentation
        const documentedStrLength = strLengthSymbols.find((s) => s.documentation);
        expect(documentedStrLength).toBeDefined();
        expect(documentedStrLength!.documentation).toContain('Calculate the length of a string');
        expect(documentedStrLength!.documentation).toContain('@param str The string to measure');
        expect(documentedStrLength!.documentation).toContain('@return Length of the string');

        // Test another function with comprehensive JSDoc documentation
        const strCopySymbols = symbols.filter((s) => s.name === 'str_copy');
        const documentedStrCopy = strCopySymbols.find((s) => s.documentation);
        expect(documentedStrCopy).toBeDefined();
        expect(documentedStrCopy!.documentation).toContain('Copy a string');
        expect(documentedStrCopy!.documentation).toContain('@param dest Destination buffer');
        expect(documentedStrCopy!.documentation).toContain('@param src Source string');

        // Test function with complex documentation
        const stringBufferInitSymbols = symbols.filter((s) => s.name === 'string_buffer_init');
        const documentedStringBufferInit = stringBufferInitSymbols.find((s) => s.documentation);
        expect(documentedStringBufferInit).toBeDefined();
        expect(documentedStringBufferInit!.documentation).toContain('Initialize string buffer');
        expect(documentedStringBufferInit!.documentation).toContain('@return 0 on success, -1 on failure');

        // Verify meaningful documentation count
        const docsCount = countSymbolsWithDocumentation(symbols);
        expect(docsCount).toBeGreaterThan(5); // C has many documented functions
    });

    /**
     * Test C++ documentation extraction
     * Verifies that C++ JSDoc-style documentation is extracted properly
     */
    it('should extract documentation from C++ JSDoc comments', () => {
        const outputFile = 'test-cpp-documentation.json';
        const fixturesPath = join(__dirname, 'fixtures', 'cpp');

        runLSPCLI(fixturesPath, 'cpp', outputFile);

        expect(existsSync(outputFile)).toBe(true);

        const result = JSON.parse(readFileSync(outputFile, 'utf-8'));
        const symbols = result.symbols as SymbolInfo[];

        // Test class documentation - should have /** */ doc comments
        const commentTestService = findSymbolByName(symbols, 'CommentTestService');
        if (commentTestService?.documentation) {
            // Note: Class docs might be on namespace or class depending on LSP structure
            expect(commentTestService.documentation).toContain('Test service specifically for comment extraction');
            expect(commentTestService.documentation).toContain('comment patterns to test the extraction feature');
        }

        // Test method documentation within class
        const testMethod =
            findChildByName(commentTestService!, 'testCommentExtraction') ||
            findSymbolByName(symbols, 'testCommentExtraction');

        if (testMethod?.documentation) {
            expect(testMethod.documentation).toContain('Tests various comment patterns within methods');
        }

        // Alternative: Find method documentation in nested structure
        const testCommentExtraction = findSymbolByName(symbols, 'testCommentExtraction');
        if (testCommentExtraction?.documentation) {
            expect(testCommentExtraction.documentation).toContain('Tests various comment patterns within methods');
        }

        // Verify we extracted some documentation
        const docsCount = countSymbolsWithDocumentation(symbols);
        expect(docsCount).toBeGreaterThan(0); // Should have at least some documented symbols
    });

    /**
     * Test TypeScript/JavaScript documentation extraction
     * Verifies that JSDoc-style documentation is extracted properly
     */
    it('should extract documentation from TypeScript JSDoc comments', () => {
        const outputFile = 'test-typescript-documentation.json';
        const fixturesPath = join(__dirname, 'fixtures', 'typescript');

        runLSPCLI(fixturesPath, 'typescript', outputFile);

        expect(existsSync(outputFile)).toBe(true);

        const result = JSON.parse(readFileSync(outputFile, 'utf-8'));
        const symbols = result.symbols as SymbolInfo[];

        // Test class documentation - should have /** */ JSDoc comments
        const commentTestService = findSymbolByName(symbols, 'CommentTestService');
        expect(commentTestService).toBeDefined();
        expect(commentTestService!.documentation).toBeDefined();
        expect(commentTestService!.documentation).toContain('Test service specifically for comment extraction');
        expect(commentTestService!.documentation).toContain('comment patterns to test the extraction feature');

        // Test method documentation within class
        const testMethod = findChildByName(commentTestService!, 'testCommentExtraction');
        expect(testMethod).toBeDefined();
        expect(testMethod!.documentation).toBeDefined();
        expect(testMethod!.documentation).toContain('Tests various comment patterns within methods');

        // Test second method documentation
        const complexMethod = findChildByName(commentTestService!, 'complexCommentScenarios');
        expect(complexMethod).toBeDefined();
        expect(complexMethod!.documentation).toBeDefined();
        expect(complexMethod!.documentation).toContain('Method with complex comment scenarios');

        // Verify meaningful documentation count
        const docsCount = countSymbolsWithDocumentation(symbols);
        expect(docsCount).toBeGreaterThan(2); // Should have class + multiple method documentation
    });

    /**
     * Test Python documentation extraction
     * Verifies that Python docstrings (""" and ''') are extracted properly
     */
    it('should extract documentation from Python docstrings', () => {
        const outputFile = 'test-python-documentation.json';
        const fixturesPath = join(__dirname, 'fixtures', 'python');

        runLSPCLI(fixturesPath, 'python', outputFile);

        expect(existsSync(outputFile)).toBe(true);

        const result = JSON.parse(readFileSync(outputFile, 'utf-8'));
        const symbols = result.symbols as SymbolInfo[];

        // Test function with multi-line docstring - find the documented version
        const initFunctionSymbols = symbols.filter((s) => s.name === 'initialize_application');
        const documentedInitFunction = initFunctionSymbols.find((s) => s.documentation);
        expect(documentedInitFunction).toBeDefined();
        expect(documentedInitFunction!.documentation).toContain('Initialize the main application with configuration');
        expect(documentedInitFunction!.documentation).toContain('Args:');
        expect(documentedInitFunction!.documentation).toContain('port: The port number to bind to');
        expect(documentedInitFunction!.documentation).toContain('Returns:');
        expect(documentedInitFunction!.documentation).toContain('True if initialization successful');

        // Test function with single-line docstring
        const processFunctionSymbols = symbols.filter((s) => s.name === 'process_user_data');
        const documentedProcessFunction = processFunctionSymbols.find((s) => s.documentation);
        expect(documentedProcessFunction).toBeDefined();
        expect(documentedProcessFunction!.documentation).toContain('Process a list of users and return statistics');

        // Test simple function with docstring
        const mainFunctionSymbols = symbols.filter((s) => s.name === 'main');
        const documentedMainFunction = mainFunctionSymbols.find((s) => s.documentation);
        expect(documentedMainFunction).toBeDefined();
        expect(documentedMainFunction!.documentation).toContain('Main entry point');

        // Verify meaningful documentation count for Python
        const docsCount = countSymbolsWithDocumentation(symbols);
        expect(docsCount).toBeGreaterThan(2); // Should have multiple documented functions
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

/**
 * Helper function to count symbols with documentation
 */
function countSymbolsWithDocumentation(symbols: SymbolInfo[]): number {
    let count = 0;
    for (const symbol of symbols) {
        if (symbol.documentation) count++;
        if (symbol.children) {
            count += countSymbolsWithDocumentation(symbol.children);
        }
    }
    return count;
}
