---
name: fix-issue
description: Fix a GitHub issue end-to-end
disable-model-invocation: true
allowed-tools: Bash Read Edit Write Grep Glob
argument-hint: <issue-number>
---

Fix GitHub issue #$ARGUMENTS:

1. Read the issue: `gh issue view $ARGUMENTS`
2. Create a feature branch: `git checkout -b fix/$ARGUMENTS`
3. Understand the problem — read relevant source files
4. Implement the fix
5. Write or update tests for the change
6. Run `npx tsc --noEmit && npm test` to verify
7. Commit with message: `fix: <description> (closes #$ARGUMENTS)`
8. Report what was changed and suggest creating a PR
