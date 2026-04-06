# snapblob Framework Examples

Example apps demonstrating snapblob integration with popular frameworks.

## Vue 3

```bash
cd examples/vue
npm install
npm run dev
```

Uses Vue 3 Composition API with `<script setup>`, reactive refs, and `v-model` bindings.

## Angular

```bash
cd examples/angular
npm install
npm run dev
```

Uses Angular 19 standalone components with `@if`/`@for` control flow and `FormsModule` for two-way binding.

## Svelte

```bash
cd examples/svelte
npm install
npm run dev
```

Uses Svelte 5 runes (`$state`, `$derived`) with reactive bindings.

---

Each example includes:

- **Image Compressor** — `compressImage()` with validation, options panel, preview, and download
- **Video Transcoder** — `transcodeVideo()` with presets, FFmpeg loading state, abort support, and progress

All examples import directly from the source (`../../src/`) for development. In production, replace with `snapblob/image` and `snapblob/video`.
