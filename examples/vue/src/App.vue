<script setup lang="ts">
import { ref } from "vue";
import ImageCompressor from "./components/ImageCompressor.vue";
import VideoTranscoder from "./components/VideoTranscoder.vue";

const tab = ref<"image" | "video">("image");
</script>

<template>
  <div class="app">
    <header>
      <h1>snapblob</h1>
      <p>Vue 3 Example &mdash; Browser-native media compression</p>
    </header>

    <div class="tabs">
      <button :class="{ active: tab === 'image' }" @click="tab = 'image'">
        Image Compressor
      </button>
      <button :class="{ active: tab === 'video' }" @click="tab = 'video'">
        Video Transcoder
      </button>
    </div>

    <ImageCompressor v-if="tab === 'image'" />
    <VideoTranscoder v-else />
  </div>
</template>
