---
name: build
description: Build the library, check types, and report errors
disable-model-invocation: true
allowed-tools: Bash Read Grep
argument-hint: [--fix to auto-fix issues]
---

Build the snapblob library and verify everything compiles:

1. Run `npx tsc --noEmit` to type-check
2. Run `npm run build` to build ESM + CJS output
3. Check that `dist/` contains `index.mjs`, `index.cjs`, and `index.d.ts`
4. Report any errors found

If `$ARGUMENTS` contains `--fix`, attempt to fix any type errors or build issues before reporting.
