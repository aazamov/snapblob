---
paths:
  - "tests/**/*.ts"
  - "src/**/*.test.ts"
---

# Testing Rules

- Test framework: Vitest (compatible with Jest API)
- Test files: `tests/` directory mirroring `src/` structure, or `*.test.ts` colocated
- Use `describe` blocks grouped by function/class
- Test names: `it("should ...")` — describe expected behavior, not implementation
- Mock browser APIs (Canvas, Image, Video) using jsdom or happy-dom
- For FFmpeg tests: mock `@ffmpeg/ffmpeg` — don't load real WASM in unit tests
- Test error cases explicitly — verify error type and message
- Use `vi.fn()` for callback spies
- No `test.skip` or `test.todo` in committed code without a linked issue
