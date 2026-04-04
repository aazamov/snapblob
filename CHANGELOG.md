# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0-alpha.1] - Unreleased

### Breaking Changes
- Removed built-in upload logic — library now returns processed Blob
- Removed axios dependency — use your own HTTP client
- Removed React from dependencies — library is framework-agnostic
- API redesigned: standalone functions `compressImage()` and `transcodeVideo()`

### Added
- `compressImage(file, options)` — standalone image compression function
- `transcodeVideo(file, options)` — standalone video transcoding function  
- `validateImage(file, options)` — standalone image validation
- Subpath exports: `snapblob/image`, `snapblob/video`
- Vitest test suite
- ESLint + Prettier configuration
- MIT License

### Removed
- `BaseFileHandler` upload pipeline (moved to user responsibility)
- axios dependency
- react, react-dom dependencies
- fs dependency
- Django CSRF token handling
