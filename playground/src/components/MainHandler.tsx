import { useState } from "react";
import ImageHandler from "./ImageHandler";
import VideoHandler from "./VideoHandler";

type Tab = "image" | "video";

export default function MainHandler() {
  const [tab, setTab] = useState<Tab>("image");

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>media-client</h1>
        <p className="tagline">
          Browser-native image compression &amp; video transcoding. Zero dependencies. One function call.
        </p>
        <div className="install-cmd">
          <code>npm i snapblob</code>
        </div>
      </header>

      <nav className="tab-nav">
        <button
          type="button"
          className={`tab-btn ${tab === "image" ? "active" : ""}`}
          onClick={() => setTab("image")}
        >
          Image Compressor
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === "video" ? "active" : ""}`}
          onClick={() => setTab("video")}
        >
          Video Transcoder
        </button>
      </nav>

      <main>
        {tab === "image" ? <ImageHandler /> : <VideoHandler />}
      </main>

      <footer className="app-footer">
        <a href="https://github.com/aazamov/snapblob" target="_blank" rel="noopener">
          GitHub
        </a>
        <span className="sep" />
        <a href="https://www.npmjs.com/package/snapblob" target="_blank" rel="noopener">
          npm
        </a>
        <span className="sep" />
        <span>MIT License</span>
      </footer>
    </div>
  );
}
