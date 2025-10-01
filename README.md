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
- `--llm` - Print llms.md documentation to stdout (for LLM consumption)

### Supported Languages
- `java` - Java (requires JDK)
- `cpp` - C++ (requires clang/gcc)
- `c` - C (requires clang/gcc)
- `csharp` - C# (requires .NET SDK)
- `haxe` - Haxe (requires Haxe compiler)
- `typescript` - TypeScript (requires Node.js)
- `dart` - Dart (requires Dart SDK)

### Example

```bash
# Analyze a Java project
npx tsx src/index.ts /path/to/java/project java types.json

# With verbose logging
npx tsx src/index.ts /path/to/java/project java types.json -v

# Print LLM documentation to stdout
lsp-cli --llm
```

## lsp-cli-jq Wrapper

A convenience wrapper that automatically analyzes the current directory and runs jq queries on the results.

### Usage
```bash
lsp-cli-jq <language> <jq_query>
```

### Examples
```bash
# Find all class names in a TypeScript project
lsp-cli-jq typescript '.symbols[] | select(.kind == "class") | .name'

# Get file locations of all methods in a Java project
lsp-cli-jq java '.symbols[] | .. | objects | select(.kind == "method") | "\(.file):\(.range.start.line + 1)"'

# Find functions with TODO comments
lsp-cli-jq typescript '.symbols[] | .. | objects | select(.comments[]? | contains("TODO")) | .name'
```

The wrapper automatically:
- Analyzes the current working directory
- Generates temporary JSON files with cleanup
- Forwards jq queries to the analysis results

Use `lsp-cli-jq --help` for more information and comprehensive examples.

## lsp-cli-file Wrapper

A convenience wrapper for analyzing single source files with formatted output. Built on top of `lsp-cli-jq`.

### Usage
```bash
lsp-cli-file <language> <sourcefile>
```

### Example
```bash
# Analyze a TypeScript file
lsp-cli-file typescript src/MyClass.ts

# Output format:
# ClassName (class):
#     10-50: "export class ClassName {"
#       doc: Class documentation
#     15-20: "constructor() {"
#       doc: Constructor documentation
#       # Implementation comments
#     22-25: "public myMethod(): void {"
#       doc: Method documentation
#       # Method implementation comments
```

The wrapper:
- Uses `lsp-cli-jq` internally to analyze the current directory
- Filters results to show only the specified file
- Formats output with line numbers, documentation, and inline comments
- Shows class structure with methods and constructors

**Note:** Both `lsp-cli-file` and `lsp-cli-jq` are included when you install lsp-cli globally.

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
      "file": "/path/to/project/src/MyClass.java",
      "range": {
        "start": { "line": 10, "character": 0 },
        "end": { "line": 25, "character": 1 }
      },
      "preview": "public class MyClass<T> extends BaseClass<T> implements MyInterface {",
      "documentation": "Class documentation from JavaDoc",
      "typeParameters": ["T"],
      "supertypes": [
        { "name": "BaseClass", "typeArguments": ["T"] },
        { "name": "MyInterface" }
      ],
      "children": [
        {
          "name": "myMethod",
          "kind": "method",
          "range": {
            "start": { "line": 12, "character": 4 },
            "end": { "line": 15, "character": 5 }
          },
          "preview": [
            "public String myMethod(int param) {",
            "    // Method implementation",
            "    return result;",
            "}"
          ]
        },
        {
          "name": "InnerClass",
          "kind": "class",
          "range": {
            "start": { "line": 17, "character": 4 },
            "end": { "line": 22, "character": 5 }
          },
          "preview": "public static class InnerClass {",
          "children": [
            {
              "name": "innerField",
              "kind": "field",
              "range": {
                "start": { "line": 18, "character": 8 },
                "end": { "line": 18, "character": 30 }
              },
              "preview": "private String innerField;"
            }
          ]
        }
      ]
    }
  ]
}
```

**Note:** The actual structure includes:
- `preview`: Can be a single string or array of strings
- `children`: Nested symbols (methods, fields, etc.) instead of `members`
- `typeParameters`: Generic/template type parameter names (e.g., ["T", "U"]) (optional)
- `supertypes`: Parent classes/interfaces as objects with `name` and optional `typeArguments` (optional)
- `documentation`: JSDoc/JavaDoc comments (optional)
- `definition`: For C/C++ declarations, links to implementation (optional)

## Requirements

### Toolchains
Each language requires its toolchain installed:
- Java: JDK 11+
- C/C++: clang or gcc
- C#: .NET SDK
- Haxe: Haxe compiler
- TypeScript: Node.js
- Dart: Dart SDK

### Project Files
For best results, projects should have proper configuration:
- Java: `pom.xml`, `build.gradle`, or `.classpath`
- C/C++: `compile_commands.json` or `.clangd`
- C#: `.csproj` or `.sln`
- Haxe: `build.hxml` or `haxe.json`
- TypeScript: `tsconfig.json`
- Dart: `pubspec.yaml`

## LSP Servers

The tool automatically downloads and installs LSP servers to `~/.lsp-cli/servers/` on first use.