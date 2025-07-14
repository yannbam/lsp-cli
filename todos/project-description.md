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
- **Check (lint, format, typecheck)**: `npm run check`
- **Test**: `npm test`
- **Build**: `npm run build`

## Structure
src/index.ts           # CLI entry point
src/language-client.ts # LSP client implementation, main logic
src/logger.ts          # Logging
src/server-manager.ts  # LSP server management
src/types.ts           # TypeScript type definitions
src/utils.ts           # Utility functions
test/                  # Test files and fixtures
llms.md                # In-depth user documentation

## Editor
- Open folder: cursor