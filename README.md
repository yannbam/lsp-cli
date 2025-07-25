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
      "preview": "public class MyClass {",
      "documentation": "Class documentation from JavaDoc",
      "supertypes": ["BaseClass", "MyInterface"],
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
          ],
          "comments": "Method implementation\nreturn result"
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
- `supertypes`: Parent classes/interfaces (optional)
- `documentation`: JSDoc/JavaDoc comments (optional)
- `comments`: Inline comments from within function bodies (optional)
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