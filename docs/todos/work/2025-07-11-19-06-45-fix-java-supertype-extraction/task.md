# Fix Java super type extraction for multi-line type declarations

**Status:** Refining
**Created:** 2025-07-11T19:06:45
**Agent PID:** 9667

## Original Todo
- [ ] the super type
  extraction for Java doesn't quite work. point it at
  ../spine-runtimes/spine-libgdx, and check the super types for
  Constraint.java abstract public class Constraint< //
      T extends Constraint<T, D, P>, //
      D extends ConstraintData<T, P>, //
      P extends Pose> //
      extends PosedActive<D, P, P> implements Update {

      public Constraint (D data, P pose, P constrained) {
          super(data, pose, constrained);
      }

      abstract public T copy (Skeleton skeleton);

      abstract void sort (Skeleton skeleton);

      boolean isSourceActive () {
          return true;
      }
  }
  the type decl is multi-line and somehow we don't get the super type
  propertly.

## Description
The Java super type extraction issue occurs when class declarations span multiple lines. Currently, the `preview` field in the extracted symbol information only shows the first line of multi-line type declarations, which means the `extends` and `implements` clauses are cut off.

For the Constraint.java example:
- Current preview: `"abstract public class Constraint<"`
- Expected preview: `"abstract public class Constraint< T extends Constraint<T, D, P>, D extends ConstraintData<T, P>, P extends Pose> extends PosedActive<D, P, P> implements Update"`

The issue is in the `extractSymbols` method in `language-client.ts` which only extracts a single line for the preview using `lines[symbol.selectionRange.start.line]`.

Note: The actual supertype extraction via LSP Type Hierarchy API works correctly when available, but the Java LSP server (Eclipse JDT.LS) doesn't provide this capability, so having complete preview text is important.

## Implementation Plan
- [ ] Test the current multi-line handling with the Constraint.java example (src/language-client.ts:263-284)
- [ ] Verify the preview field correctly captures the full multi-line declaration
- [ ] Check if line joining needs better formatting (currently uses single space)
- [ ] Ensure the logic properly handles edge cases (brace on same line, different formatting styles)
- [ ] Automated test: Add test case for multi-line Java class declaration in test/fixtures/java/
- [ ] Automated test: Verify preview field contains complete declaration including extends/implements
- [ ] User test: Run `lsp-cli ../spine-runtimes/spine-libgdx java output.json` and verify Constraint.java preview
- [ ] User test: Check that preview shows full declaration with extends and implements clauses

## Notes