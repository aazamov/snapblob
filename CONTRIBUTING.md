# Contributing to snapblob

Thanks for your interest in contributing. This guide covers everything you need to get started.

## Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- Git

## Setup

```bash
git clone https://github.com/aazamov/snapblob.git
cd snapblob
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with the CORS headers FFmpeg WASM requires.

## Project Structure

```
src/
  index.ts                          # Public API entry point
  constants/
    units.ts                        # DataSize, BitrateUnit, StreamDuration enums
    requests.ts                     # HTTP-related constants
  types/
    media-types.ts                  # Shared media type definitions
  utils/
    files.ts                        # File reading and conversion utilities
    images.ts                       # Image dimension and orientation helpers
    media.ts                        # Media element creation helpers
    requests.ts                     # HTTP request utilities
    general.ts                      # General-purpose utilities
  file-handlers/
    constants/
      mimes.ts                      # MediaImageMimeType, VideoFileMimeType
    base-handler/
      handler.ts                    # Abstract BaseFileHandler class
      types.ts                      # Base handler type definitions
      errors.ts                     # Base error classes
    image-handler/
      handler.ts                    # Image compression logic (Pica)
      constants.ts                  # PicaResizeFilter enum
      types.ts                      # Image handler types
      errors.ts                     # Image-specific errors
    ffmpeg-handler/
      handler.ts                    # FFmpeg WASM video transcoding
      constants.ts                  # Codec, preset, pixel format enums
      types.ts                      # FFmpeg handler types
      errors.ts                     # FFmpeg-specific errors
```

**Key concepts:**
- `file-handlers/base-handler/` -- abstract class with the validate, process, upload lifecycle
- `file-handlers/image-handler/` -- image compression using [Pica](https://github.com/nicedoc/pica) (canvas-based resizing)
- `file-handlers/ffmpeg-handler/` -- video transcoding using [@ffmpeg/ffmpeg](https://github.com/nicedoc/ffmpeg.wasm) (WASM)
- `constants/` and `file-handlers/constants/` -- typed enums consumers use to configure options

## Development Workflow

### Running the dev server

```bash
npm run dev
```

### Building the package

```bash
npm run build
```

This runs TypeScript compilation followed by Vite's library-mode build, producing `dist/index.mjs` (ESM), `dist/index.cjs` (CJS), and `dist/index.d.ts` (type declarations).

### Running tests

```bash
npm test
```

Tests use [Vitest](https://vitest.dev/). Run a specific test file:

```bash
npx vitest run src/utils/files.test.ts
```

Run tests in watch mode during development:

```bash
npx vitest
```

### Linting and formatting

```bash
npm run lint        # ESLint
npm run format      # Prettier (writes changes)
```

Always run both before committing:

```bash
npm run format && npm run lint
```

## How to Add a Feature

1. **Open an issue first.** Describe what you want to build and why. This avoids duplicate work and lets maintainers give early feedback on API design.

2. **Create a branch** from `master`:
   ```bash
   git checkout -b feat/my-feature
   ```

3. **Write the code.** Follow existing patterns in the codebase:
   - Put constants in the relevant `constants.ts` file as enums
   - Put types in the relevant `types.ts` file
   - Put error classes in the relevant `errors.ts` file
   - Export new public API surface from the appropriate `index.ts`

4. **Write tests.** Every new feature should have test coverage. See the testing section below.

5. **Update documentation.** If your change affects the public API, update the README.

6. **Submit a PR.** See the PR process section below.

## How to Write Tests

Tests live next to the code they test, using the `.test.ts` suffix:

```
src/utils/files.ts
src/utils/files.test.ts
```

### Conventions

- Use `describe` blocks to group related tests
- Use clear test names that describe the expected behavior
- Test both success and error paths
- Use test fixtures in `src/__fixtures__/` for sample files (images, videos)

### Example

```typescript
import { describe, it, expect } from "vitest";
import { getFileExtension } from "./files";

describe("getFileExtension", () => {
  it("returns the extension for a standard filename", () => {
    expect(getFileExtension("photo.jpg")).toBe("jpg");
  });

  it("returns the last extension for double extensions", () => {
    expect(getFileExtension("archive.tar.gz")).toBe("gz");
  });

  it("returns an empty string for files without extensions", () => {
    expect(getFileExtension("README")).toBe("");
  });
});
```

### Testing browser APIs

For code that uses Canvas, Image elements, or other browser APIs, use Vitest's `jsdom` environment:

```typescript
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
```

For FFmpeg-dependent tests, mark them as integration tests and skip in CI if the WASM binaries are not available.

## Code Style

- **TypeScript** -- strict mode, no `any` unless absolutely necessary
- **Prettier** -- handles formatting. Config is in the project root.
- **ESLint** -- handles linting. Run `npm run lint` to check.
- **No `console.log`** in library code. Use proper error classes instead.
- **Enums for constants** -- prefer `enum` over string unions for values consumers reference frequently (codecs, presets, MIME types)
- **Named exports** -- no default exports

## Commit Conventions

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add WebP auto-detection for image compression
fix: preserve aspect ratio when only maxWidth is set
docs: add Next.js configuration example
refactor: extract validation logic from BaseFileHandler
test: add unit tests for orientation adjustment
chore: update @ffmpeg/ffmpeg to 0.12.15
```

**Format:** `type: short description`

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `ci`

Keep the subject line under 72 characters. Use the body for additional context if needed.

## PR Process

1. **Ensure CI passes.** Your PR must pass linting, type checking, tests, and build.

2. **Fill out the PR template.** Describe what changed and why. Link the related issue.

3. **Keep PRs focused.** One feature or fix per PR. Large PRs are harder to review and more likely to stall.

4. **Respond to review feedback.** Push new commits to address comments rather than force-pushing amended commits, so reviewers can see what changed.

5. **Squash on merge.** PRs are squash-merged into `master` to keep the commit history clean.

## Release Process

Releases are managed by maintainers:

1. Version is bumped in `package.json` following [semver](https://semver.org/)
2. A changelog entry is added
3. A git tag is created: `git tag v1.0.0`
4. The package is published: `npm publish`
5. A GitHub release is created from the tag

**Versioning guidelines:**
- **Patch** (`1.0.x`) -- bug fixes, documentation updates
- **Minor** (`1.x.0`) -- new features, new constants, backward-compatible changes
- **Major** (`x.0.0`) -- breaking API changes

## Questions?

Open an issue or start a discussion on GitHub. We are happy to help.
