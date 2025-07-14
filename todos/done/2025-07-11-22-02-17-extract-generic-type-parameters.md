# we need to also extract the generic/template type parameter names for types, i.e. public class Hello<T, Y> extends Foo<T, Y, SomeClass>

**Status:** In Progress
**Created:** 2025-07-11T22:02:17
**Started:** 2025-07-11T22:03:39
**Agent PID:** 12139

## Original Todo
- we need to also extract the generic/template type parameter names for types, i.e. public class Hello<T, Y> extends Foo<T, Y, SomeClass>

## Description

The lsp-cli tool currently strips generic/template type parameters during processing. This enhancement will extract and preserve them in the JSON output.

For a class declaration like:
```java
class A<X, Y> extends B<X, SomeConcreteType> implements C<OtherConcreteType, X>, D<Map<String, List<Y>>>
```

The enhanced output will be:
```json
{
  "name": "A",
  "kind": "class",
  "typeParameters": ["X", "Y"],
  "supertypes": [
    {
      "name": "B",
      "typeArguments": ["X", "SomeConcreteType"]
    },
    {
      "name": "C",
      "typeArguments": ["OtherConcreteType", "X"]
    },
    {
      "name": "D",
      "typeArguments": ["Map<String, List<Y>>"]
    }
  ],
  // ... other fields
}
```

This preserves all type information as strings without deep parsing of nested generics. Tools consuming this data can parse the nested types if needed. The change requires modifying the `supertypes` field from `string[]` to an array of objects with `name` and `typeArguments`.

**Note: This is a breaking change with no backwards compatibility.**

## Implementation Plan

- [x] Update TypeScript type definitions (src/types.ts:13-27)
  - Add `typeParameters?: string[]` field to SymbolInfo
  - Change `supertypes` from `string[]` to `Array<{name: string, typeArguments?: string[]}>`

- [x] Create generic parameter extraction utilities (src/language-client.ts)
  - Add `extractTypeParameters(declaration: string): string[]` method
  - Add `parseTypeArguments(typeWithGenerics: string): {name: string, typeArguments: string[]}` method

- [x] Update symbol extraction (src/language-client.ts:308-323)
  - Extract type parameters from preview when creating SymbolInfo
  - Store them in new `typeParameters` field

- [x] Modify supertype parsing for each language:
  - [x] Java parser (src/language-client.ts:781-848) - parse type arguments instead of stripping
  - [x] TypeScript parser (src/language-client.ts:888-929) - preserve generic parameters
  - [x] C++ parser (src/language-client.ts:931-952) - handle template parameters
  - [x] Haxe parser (src/language-client.ts:954-992) - preserve type parameters
  - [x] Dart parser (src/language-client.ts:994-1034) - handle generic types
  - [x] C# parser (src/language-client.ts:1036-1054) - preserve generic parameters

- [x] Update LSP type hierarchy processing (src/language-client.ts:677-743)
  - Stop stripping generics at line 689
  - Return structured supertype objects instead of strings

- [x] Update tests:
  - [x] Automated test: Update test expectations in test/fixtures.test.ts to validate new structure
  - [x] Automated test: Add specific tests for generic parameter extraction
  - [x] Automated test: Add adversarial tests for edge cases (empty generics `<>`, nested generics, malformed syntax)

- [x] Update README.md and llms.md

- [x] User tests:
  - [x] User test: Run `npm test` to ensure all tests pass (only 1 unrelated test failing)
  - [x] User test: Verify JSON output contains typeParameters and structured supertypes

## Notes
- Tests are currently failing because they expect the old string[] format for supertypes
- Need to update all test assertions to use the helper function getSupertypeNames()
- Tests were running slower than expected - Java tests taking 4+ seconds each
- Fixed performance issue by using beforeAll/afterAll to run LSP analysis once per language test suite
- Implementation challenges addressed:
  - Multi-line generic declarations (e.g., Java's MultiLineDeclaration) required proper angle bracket depth tracking
  - TypeScript type aliases are reported as 'variable' kind by LSP, needed special handling
  - C++ LSP (clangd) doesn't include template declarations in preview, so template parameters cannot be extracted
  - Different LSPs handle generics differently - some strip type arguments, some return empty arrays vs undefined
  - Always prefer parsed supertypes from preview for Java to preserve correct type arguments