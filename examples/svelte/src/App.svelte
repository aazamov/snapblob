<script lang="ts">
  import ImageCompressor from "./lib/ImageCompressor.svelte";
  import VideoTranscoder from "./lib/VideoTranscoder.svelte";

  let tab = $state<"image" | "video">("image");
</script>

<div class="app">
  <header>
    <h1>snapblob</h1>
    <p>Svelte 5 Example &mdash; Browser-native media compression</p>
  </header>

  <div class="tabs">
    <button class:active={tab === "image"} onclick={() => (tab = "image")}>
      Image Compressor
    </button>
    <button class:active={tab === "video"} onclick={() => (tab = "video")}>
      Video Transcoder
    </button>
  </div>

  {#if tab === "image"}
    <ImageCompressor />
  {:else}
    <VideoTranscoder />
  {/if}
</div>

<style>
  .app {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1.5rem;
  }

  header {
    text-align: center;
    margin-bottom: 2rem;
  }

  header h1 {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  header p {
    color: var(--text-muted);
    margin-top: 0.25rem;
  }

  .tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.5rem;
  }

  .tabs button {
    padding: 0.5rem 1.25rem;
    border: none;
    border-radius: var(--radius);
    background: transparent;
    color: var(--text-muted);
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tabs button.active {
    background: var(--primary);
    color: #fff;
  }
</style>
