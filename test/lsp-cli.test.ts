import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import { setupTestRepo, cleanupLSPServers, getTestProjectPath, LSP_SERVER_DIR, LANGUAGE_DIRS } from './setup';
import { runLSPCLI, readOutput, findSymbol, findSymbolsByKind } from './utils';

describe('LSP CLI Tests', () => {
  beforeAll(async () => {
    // Setup test repository
    await setupTestRepo();
  }, 60000); // 60 second timeout for cloning

  afterEach(() => {
    // Clean up output files
    const outputFiles = Object.keys(LANGUAGE_DIRS).map(lang => `test-${lang}.json`);
    outputFiles.forEach(file => {
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
        const enumWithValues = enums.find(e => e.children && e.children.length > 0);
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
        
        runLSPCLI(join(projectPath, 'spine-csharp'), 'csharp', outputFile);
        
        const result = readOutput(outputFile);
        expect(result.symbols.length).toBeGreaterThan(0);
        
        const classes = findSymbolsByKind(result.symbols, 'class');
        expect(classes.length).toBeGreaterThan(0);
        
        // Check for properties in classes
        const classWithProps = classes.find(c => 
          c.children && c.children.some(child => child.kind === 'property')
        );
        expect(classWithProps).toBeDefined();
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
      const symbolsWithDocs = result.symbols.filter(s => s.documentation);
      expect(symbolsWithDocs.length).toBeGreaterThan(0);
    });
  });
});