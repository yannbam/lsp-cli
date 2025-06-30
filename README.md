# LSP CLI

A command-line tool that uses Language Server Protocol (LSP) servers to extract symbol information from codebases.

## Installation

```bash
npm install
npm run build
```

## Usage

### Development
```bash
npx tsx src/index.ts <directory> <language> <output-file>
```

### Production (after build)
```bash
./dist/index.js <directory> <language> <output-file>
```

### Global Installation
```bash
npm install -g .
lsp-cli <directory> <language> <output-file>
```

### Options
- `-v, --verbose` - Enable verbose logging

### Supported Languages
- `java` - Java (requires JDK)
- `cpp` - C++ (requires clang/gcc)
- `c` - C (requires clang/gcc)
- `csharp` - C# (requires .NET SDK)
- `haxe` - Haxe (requires Haxe compiler)
- `typescript` - TypeScript (requires Node.js)

### Example

```bash
# Analyze a Java project
npx tsx src/index.ts /path/to/java/project java types.json

# With verbose logging
npx tsx src/index.ts /path/to/java/project java types.json -v
```

## Output

The tool outputs JSON with all symbols found in the codebase:

```json
{
  "language": "java",
  "directory": "/path/to/project",
  "symbols": [
    {
      "name": "MyClass",
      "kind": "class",
      "file": "src/MyClass.java",
      "range": {
        "start": { "line": 10, "character": 0 },
        "end": { "line": 25, "character": 1 }
      },
      "preview": [
        "// Preview lines around the type definition"
      ],
      "members": [
        {
          "name": "myMethod",
          "kind": "method",
          "range": { ... },
          "preview": [ ... ],
          "children": [ ... ]
        }
      ]
    }
  ]
}
```

## Requirements

### Toolchains
Each language requires its toolchain installed:
- Java: JDK 11+
- C/C++: clang or gcc
- C#: .NET SDK
- Haxe: Haxe compiler
- TypeScript: Node.js

### Project Files
For best results, projects should have proper configuration:
- Java: `pom.xml`, `build.gradle`, or `.classpath`
- C/C++: `compile_commands.json` or `.clangd`
- C#: `.csproj` or `.sln`
- Haxe: `build.hxml` or `haxe.json`
- TypeScript: `tsconfig.json`

## LSP Servers

The tool automatically downloads and installs LSP servers to `~/.lsp-cli/servers/` on first use.