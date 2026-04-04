---
paths:
  - "src/**/*.ts"
  - "tests/**/*.ts"
---

# Code Style Rules

- Use `unknown` instead of `any`, then narrow with type guards
- Prefer `interface` over `type` for object shapes (extendable)
- Use `const` by default, `let` only when reassignment is needed
- Prefer named exports over default exports (better tree-shaking)
- Error classes must set `this.name` to the class name
- No `console.log` / `console.warn` / `console.error` in library source — use a configurable logger or throw
- Functions that return Promises must be `async` — no raw `new Promise()` wrapping async operations
- Prefer early returns over deeply nested conditionals
- Max function length: ~40 lines. Extract helpers if longer.
