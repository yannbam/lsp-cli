# LSP-CLI Documentation for LLM Consumption

## Overview
LSP-CLI is a command-line tool that extracts symbol information from source code using Language Server Protocol (LSP) servers. It generates JSON files containing detailed symbol information for various programming languages.

The generated JSON files can be queried with `jq` to navigate and analyse the codebase. This MUST be preferred to using `grep` or `ripgrep`. The JSON also contained file locations of each symbols, which allow coding agents to precisely read the
lines making up a symbol like a method. This MUST be preferred to reading full files unless instructed otherwise or the query doesn't yield results.

## Common Use Cases

1. **Code Navigation**: Find where symbols are defined
2. **Documentation Generation**: Extract all public APIs
3. **Refactoring**: Identify all usages of specific patterns
4. **Code Analysis**: Calculate metrics and complexity
5. **Dependency Analysis**: Understand inheritance hierarchies
6. **API Evolution**: Track changes between versions
7. **Language Porting**: Map constructs between languages
8. **Code Review**: Find complex methods and classes

## Generating the JSON files

### Basic Syntax
```bash
lsp-cli <directory> <language> <output-file>
```

### Parameters
- `<directory>`: Path to the source code directory to analyze
- `<language>`: Programming language (java, cpp, c, csharp, haxe, typescript, dart)
- `<output-file>`: Path where the JSON output will be written

## JSON Output Structure

### Root Structure
```json
{
  "language": "string",     // Language analyzed (java, typescript, etc.)
  "directory": "string",    // Absolute path to analyzed directory
  "symbols": []            // Array of symbol objects
}
```

### Symbol Object Structure
```json
{
  "name": "string",        // Symbol name (e.g., "MyClass", "myMethod")
  "kind": "string",        // Symbol kind (see kinds by language below)
  "file": "string",        // Absolute path to file containing the symbol
  "range": {               // Location in the file
    "start": {
      "line": number,      // 0-based line number
      "character": number  // 0-based character position
    },
    "end": {
      "line": number,
      "character": number
    }
  },
  "preview": "string" | ["string"],  // Code preview (string or array of lines)
  "documentation": "string",         // Optional: JSDoc/JavaDoc/Doxygen/etc. comments
  "supertypes": ["string"],         // Optional: parent classes/interfaces
  "children": [],                    // Optional: nested symbols (methods, fields, inner classes etc.)
  "definition": {                    // Optional: for C/C++ declarations in headers
    "file": "string",              // Path to implementation file (.cpp)
    "range": {                     // Location of definition
      "start": { "line": number, "character": number },
      "end": { "line": number, "character": number }
    },
    "preview": "string"            // First line of implementation
  }
}
```

## Language-Specific Symbol Kinds

### Java
**Top-level symbols:**
- `package`: Package declarations
- `class`: Class definitions
- `interface`: Interface definitions
- `enum`: Enum definitions

**Nested symbols (children):**
- `method`: Methods (instance and static)
- `field`: Class fields/properties
- `constant`: Static final fields
- `constructor`: Class constructors
- `enumMember`: Enum values
- `class`: Inner classes
- `interface`: Inner interfaces
- `enum`: Inner enums

### TypeScript
**Top-level symbols:**
- `class`: Class definitions
- `interface`: Interface definitions
- `enum`: Enum definitions
- `function`: Standalone functions
- `constant`: Const declarations (including arrow functions)
- `variable`: Variable declarations and type aliases
- `module`: Namespaces/modules

**Nested symbols (children):**
- `method`: Class methods
- `property`: Class properties
- `constructor`: Class constructors
- `constant`: Class constants
- `variable`: Class variables
- `enumMember`: Enum values

**Note:** Type aliases (e.g., `type MyType = { x: number }`) are reported as "variable" kind by the TypeScript LSP server

### C++
**Top-level symbols:**
- `namespace`: Namespace definitions
- `class`: Class and struct definitions (structs are reported as "class")
- `function`: Free functions
- `variable`: Global variables

**Nested symbols (children):**
- `class`: Nested class/struct definitions
- `method`: Class methods
- `field`: Class members
- `constructor`: Class constructors
- `enum`: Enum definitions
- `variable`: Local variables
- `function`: Nested functions
- `string`: String literals (LSP server quirk)

**C++ Specific Features:**
- Forward declarations (e.g., `class Foo;`) and friend declarations are automatically filtered out
- For methods/functions declared in headers, the `definition` field links to their implementation in .cpp files

### C
**Top-level symbols:**
- `function`: Function definitions
- `class`: Struct definitions (all structs are reported as "class")
- `variable`: Global variables
- `enum`: Enum definitions

**Nested symbols (children):**
- `field`: Struct members
- `enumMember`: Enum values

**Notes:**
- The clangd LSP server represents all C structs as "class" kind, including anonymous structs and typedef structs
- Mixed C/C++ projects may show C++ symbols like `namespace` from included headers
- Macro invocations may appear as `string` kind (LSP server quirk)
- Typedef patterns like `typedef struct { ... } Name;` and `typedef struct Name { ... } Name;` are automatically merged to avoid duplicates

### C#
**Note:** C# is current broken

### Dart
**Top-level symbols:**
- `class`: Class definitions
- `enum`: Enum definitions
- `function`: Top-level functions
- `variable`: Top-level variables and constants
- `typedef`: Type aliases

**Nested symbols (children):**
- `method`: Instance and static methods
- `field`: Instance fields
- `constructor`: Class constructors
- `constant`: Class constants
- `property`: Getters and setters
- `enum`: Enum values (Note: Dart LSP reports enum members as 'enum' not 'enumMember')

**Notes:**
- Dart LSP server requires the Dart SDK to be installed
- The LSP server is included with the SDK (`dart language-server` command)
- Supports analysis_options.yaml for project-specific linting rules

## Querying the JSON files

### Key Principle: Token-Efficient Queries
When using lsp-cli output, select ONLY the fields you need. This reduces token usage and improves performance. Use `.file` and `.range` to navigate directly to code instead of reading entire files.

### Essential Queries for Code Navigation

```bash
# 1. Find where a specific function/class is defined (minimal output)
jq -r '.symbols[] | .. | objects | select(.name == "MyClass") |
    "\(.file):\(.range.start.line + 1)"' symbols.json

# 2. List all types (classes/interfaces) in a specific file
jq -r '.symbols[] | select(.file == "/path/to/file.java") |
    select(.kind | IN("class", "interface")) |
    "\(.name) (\(.kind))"' symbols.json

# 3. Get method signatures of a class (no implementation details)
jq -r '.symbols[] | select(.name == "UserService") |
    .children[]? | select(.kind == "method") |
    "\(.name) - line \(.range.start.line + 1)"' symbols.json

# 4. Find implementation location for C++ declarations
jq -r '.symbols[] | .. | objects | select(.definition) |
    "\(.name): \(.definition.file):\(.definition.range.start.line + 1)"' symbols.json

# 5. Get inheritance hierarchy (who extends what)
jq -r '.symbols[] | select(.supertypes) |
    "\(.name) extends \(.supertypes | join(", "))"' symbols.json
```

### Task-Specific Efficient Queries

```bash
# For porting: Extract API surface of a class
jq '.symbols[] | select(.name == "MyClass") | {
    name,
    methods: [.children[]? | select(.kind == "method") | .name],
    fields: [.children[]? | select(.kind | IN("field", "property")) | .name]
}' symbols.json

# For refactoring: Find all classes in a package/namespace
jq -r '.symbols[] | select(.kind == "class") |
    select(.file | contains("/com/example/service/")) |
    .name' symbols.json

# For code review: Identify large classes (method count only)
jq -r '.symbols[] | select(.kind == "class") |
    {name, methods: ([.children[]? | select(.kind == "method")] | length)} |
    select(.methods > 20) | "\(.name): \(.methods) methods"' symbols.json

# For debugging: Find specific method implementation
jq -r '.symbols[] | .. | objects |
    select(.name == "processOrder" and .kind == "method") |
    "\(.file):\(.range.start.line + 1)-\(.range.end.line + 1)"' symbols.json
```

### Navigation Workflow Example

```bash
# Step 1: Find the class
CLASS_LOC=$(jq -r '.symbols[] | select(.name == "OrderService") |
    "\(.file):\(.range.start.line + 1)"' symbols.json)

# Step 2: List its methods (names only)
jq -r '.symbols[] | select(.name == "OrderService") |
    .children[]? | select(.kind == "method") | .name' symbols.json

# Step 3: Get specific method location
jq -r '.symbols[] | select(.name == "OrderService") |
    .children[]? | select(.name == "validateOrder") |
    "\(.file):\(.range.start.line + 1)-\(.range.end.line + 1)"' symbols.json

# Now you can read ONLY those specific lines instead of the entire file
```

## Notes and Limitations

- **0-based indexing**: Line and character positions are 0-based; add 1 for editor navigation
- **LSP Server Variations**: Different servers report constructs differently (e.g., C structs as "class")
- **Preview Truncation**: Long methods may have truncated preview arrays
- **Missing Information**: Not all servers provide supertypes, documentation, or visibility modifiers
- **Configuration Required**: Some LSP servers need project config files (tsconfig.json, compile_commands.json)
- **Static Analysis Only**: No runtime type information or dynamic behavior
- **C# Support**: Currently broken
- **Performance**: Use `select()` early in pipelines; avoid `..` recursive descent when possible