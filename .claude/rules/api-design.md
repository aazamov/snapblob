---
paths:
  - "src/**/*.ts"
---

# API Design Rules

- Every public function/class must have JSDoc with `@param`, `@returns`, `@throws`, and `@example`
- Options objects over positional arguments (more than 2 params = use an object)
- All options should have sensible defaults — user should be able to call with minimal config
- Return `Blob` from processing functions, not `File` — let consumer wrap if needed
- Use `AbortSignal` for cancellation support on long operations
- Progress callbacks use `(progress: number) => void` where progress is 0-100
- Validate inputs at public API boundary, trust internal calls
- Export types alongside functions — users shouldn't need deep imports
