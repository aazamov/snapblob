---
name: release
description: Prepare a new npm release (version bump, changelog, tag)
disable-model-invocation: true
allowed-tools: Bash Read Edit Write Grep
argument-hint: [patch|minor|major]
---

Prepare a release for snapblob:

1. Verify the working tree is clean (`git status`)
2. Run full quality checks: `npx tsc --noEmit && npm test && npm run build`
3. If all pass, determine version bump type from `$ARGUMENTS` (default: `patch`)
4. Update version in `package.json`
5. Update `CHANGELOG.md` with changes since last tag (use `git log --oneline` since last tag)
6. Create a git commit: `chore: release vX.Y.Z`
7. Create a git tag: `vX.Y.Z`
8. Report: new version number, changelog entries, and remind user to `git push --tags && npm publish`

Do NOT push or publish automatically — just prepare everything locally.
