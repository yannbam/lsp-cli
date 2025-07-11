# Project: lsp-cli

Command-line tool that extracts symbol information from codebases using Language Server Protocol (LSP) servers. Supports multiple programming languages and generates structured JSON output for code analysis.

## Features
- Symbol extraction (classes, methods, functions, fields)
- Multi-language support (Java, C++, C, C#, Haxe, TypeScript, Dart)
- Documentation extraction (JSDoc, JavaDoc, etc.)
- Hierarchical symbol relationships
- Automatic LSP server management
- Cross-reference support for C/C++

## Commands
- **Check**: `npm run check`
- **Test**: `npm test`
- **Build**: `npm run build`
- **Typecheck**: `npm run typecheck`
- **Lint**: `npm run lint`
- **Format**: `npm run format`

## Structure
src/index.ts          # CLI entry point
src/language-client.ts # LSP client implementation
src/server-manager.ts  # LSP server management
src/types.ts          # TypeScript type definitions
src/utils.ts          # Utility functions
test/                 # Test files and fixtures