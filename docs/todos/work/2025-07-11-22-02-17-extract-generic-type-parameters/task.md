# we need to also extract the generic/template type parameter names for types, i.e. public class Hello<T, Y> extends Foo<T, Y, SomeClass>

**Status:** Refining
**Created:** 2025-07-11T22:02:17
**Agent PID:** 63629

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

- [ ] Update TypeScript type definitions (src/types.ts:13-27)
  - Add `typeParameters?: string[]` field to SymbolInfo
  - Change `supertypes` from `string[]` to `Array<{name: string, typeArguments?: string[]}>`

- [ ] Create generic parameter extraction utilities (src/language-client.ts)
  - Add `extractTypeParameters(declaration: string): string[]` method
  - Add `parseTypeArguments(typeWithGenerics: string): {name: string, typeArguments: string[]}` method

- [ ] Update symbol extraction (src/language-client.ts:308-323)
  - Extract type parameters from preview when creating SymbolInfo
  - Store them in new `typeParameters` field

- [ ] Modify supertype parsing for each language:
  - [ ] Java parser (src/language-client.ts:781-848) - parse type arguments instead of stripping
  - [ ] TypeScript parser (src/language-client.ts:888-929) - preserve generic parameters
  - [ ] C++ parser (src/language-client.ts:931-952) - handle template parameters
  - [ ] Haxe parser (src/language-client.ts:954-992) - preserve type parameters
  - [ ] Dart parser (src/language-client.ts:994-1034) - handle generic types
  - [ ] C# parser (src/language-client.ts:1036-1054) - preserve generic parameters

- [ ] Update LSP type hierarchy processing (src/language-client.ts:677-743)
  - Stop stripping generics at line 689
  - Return structured supertype objects instead of strings

- [ ] Update tests:
  - [ ] Automated test: Update test expectations in test/fixtures.test.ts to validate new structure
  - [ ] Automated test: Add specific tests for generic parameter extraction
  - [ ] Automated test: Add adversarial tests for edge cases (empty generics `<>`, nested generics, malformed syntax)

- [ ] User tests:
  - [ ] User test: Run `npm test` to ensure all tests pass
  - [ ] User test: Build and run on a Java project with complex generics
  - [ ] User test: Verify JSON output contains typeParameters and structured supertypes