---
name: test
description: Run tests and report results with coverage
disable-model-invocation: true
allowed-tools: Bash Read Grep Edit Write
argument-hint: [file-pattern or --coverage]
---

Run the test suite for snapblob:

1. If `$ARGUMENTS` is provided and is a file pattern, run `npx vitest run $ARGUMENTS`
2. If `$ARGUMENTS` contains `--coverage`, run `npx vitest run --coverage`
3. Otherwise run `npm test`
4. Report results: total, passed, failed, skipped
5. If any tests fail, read the failing test file and the source file it tests, diagnose the issue, and suggest a fix
