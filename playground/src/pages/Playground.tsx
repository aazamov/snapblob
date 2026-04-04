import { useState } from "react";
import ImageHandler from "../components/ImageHandler";
import VideoHandler from "../components/VideoHandler";

type Tab = "image" | "video";

export default function Playground() {
  const [tab, setTab] = useState<Tab>("image");

  return (
    <div className="doc-page">
      <h1>Interactive Playground</h1>
      <p className="doc-lead">
        Try the library right here. Pick a file, tweak options, and see the results instantly.
      </p>

      <nav className="tab-nav" style={{ marginBottom: 24 }}>
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

      {tab === "image" ? <ImageHandler /> : <VideoHandler />}
    </div>
  );
}
