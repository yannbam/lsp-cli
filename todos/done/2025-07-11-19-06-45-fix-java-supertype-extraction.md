# Fix Java super type extraction for multi-line type declarations

**Status:** In Progress
**Created:** 2025-07-11T19:06:45
**Started:** 2025-07-11T19:08:15
**Agent PID:** 22866

## Description
The Java super type extraction has two issues:

1. **Preview field** (FIXED): The preview field now correctly captures multi-line class declarations including extends/implements clauses.

2. **Supertypes field** (RESOLVED): The `supertypes` field works correctly when:
   - The Java code is valid and all referenced types can be resolved
   - The Java LSP server (Eclipse JDT.LS) supports Type Hierarchy API
   - Multi-line declarations are handled properly

For the Constraint.java example:
- When types are unresolved: `null`
- When types are resolved: `["Update", "PosedActive<D, P, P2>"]` ✓

Note: The actual supertype extraction via LSP Type Hierarchy API works correctly when available, but the Java LSP server (Eclipse JDT.LS) doesn't provide this capability, so having complete preview text is important.

## Implementation Plan
- [x] Test the current multi-line handling with the Constraint.java example (src/language-client.ts:263-284)
- [x] Verify the preview field correctly captures the full multi-line declaration
- [x] Check if line joining needs better formatting (currently uses single space)
- [x] Ensure the logic properly handles edge cases (brace on same line, different formatting styles)
- [x] Implement fallback parser for Java supertypes extraction from preview (src/language-client.ts:669-793)
- [x] Handle complex generic type parameters in extends/implements clauses
- [x] Automated test: Add test case for multi-line Java class declaration in test/fixtures/java/
- [x] Automated test: Verify preview field contains complete declaration including extends/implements
- [x] Automated test: Verify supertypes are extracted correctly (stripped of generics)
- [x] User test: Run `lsp-cli ../spine-runtimes/spine-libgdx java output.json` and verify Constraint.java preview
- [x] User test: Check that preview shows full declaration with extends and implements clauses
- [x] User test: Verify supertypes field is populated correctly

## Notes
- The multi-line handling is already implemented and working correctly!
- The preview correctly captures full declarations including extends/implements clauses
- Line joining uses single space which works well
- Edge cases like brace on same line are handled properly
- The preview includes inline comments (//), which is expected behavior as it preserves the actual source code
- **IMPORTANT FINDING**: The Java LSP Type Hierarchy API has limitations:
  - Sometimes returns malformed supertypes with generic parameters split incorrectly
  - Often returns only the extended class but not implemented interfaces
  - Works inconsistently depending on whether types are resolvable
- **SOLUTION**: Implemented a fallback parser that extracts supertypes from the preview text for Java
  - Handles complex nested generic parameters correctly
  - Strips generic parameters from supertype names (as requested)
  - Used when LSP returns no/malformed supertypes or fewer than expected
  - Properly handles both extends and implements clauses