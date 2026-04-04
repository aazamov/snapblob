---
name: review
description: Review code quality, find bugs, security issues, and suggest improvements
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(npx tsc *) Bash(npm test *)
argument-hint: [file-or-directory to review]
---

Perform a thorough code review:

1. If `$ARGUMENTS` is provided, focus on that file/directory. Otherwise review all of `src/`.
2. Check for:
   - Type safety issues (`any` usage, missing null checks)
   - Silent error swallowing (catch blocks that return null or do nothing)
   - `console.log` / `console.warn` in library code
   - Memory leaks (unreleased object URLs, unclosed resources)
   - Missing input validation on public API boundaries
   - Overly complex generics that could be simplified
   - Dead code or unused exports
3. Run `npx tsc --noEmit` to find type errors
4. Report findings grouped by severity: critical, warning, suggestion
5. For each finding, include the file path, line number, and a concrete fix
