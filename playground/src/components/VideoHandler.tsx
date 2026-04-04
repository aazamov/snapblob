import { useState, useCallback, useRef } from "react";
import { transcodeVideo, getVideoInfo } from "../../../src/video";
import { VIDEO_PRESETS, applyPreset } from "../../../src/video/presets";
import type { VideoPresetName } from "../../../src/video/presets";
import type { TranscodeVideoOptions, VideoInfo } from "../../../src/video/types";
import { formatSize, formatDuration, formatDimensions } from "../utils";

const PRESET_OPTIONS: { value: VideoPresetName | "custom"; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "high-quality", label: "High Quality" },
  { value: "small-file", label: "Small File" },
  { value: "social-media", label: "Social Media" },
  { value: "custom", label: "Custom" },
];

const CODEC_OPTIONS = [
  { value: "libx264", label: "H.264 (libx264)" },
  { value: "libx265", label: "H.265 (libx265)" },
  { value: "libvpx-vp9", label: "VP9" },
  { value: "mpeg4", label: "MPEG-4" },
] as const;

const ENCODER_PRESETS = [
  "ultrafast", "superfast", "veryfast", "faster", "fast",
  "medium", "slow", "slower", "veryslow",
] as const;

const FORMAT_OPTIONS = [
  { value: "mp4", label: "MP4" },
  { value: "webm", label: "WebM" },
] as const;

const PIXEL_FORMATS = [
  { value: "yuv420p", label: "YUV 4:2:0 (compatible)" },
  { value: "yuv422p", label: "YUV 4:2:2" },
  { value: "yuv444p", label: "YUV 4:4:4" },
] as const;

interface TranscodeStats {
  originalFileSize: number;
  transcodedFileSize: number;
  ratio: number;
  elapsed: number;
}

export default function VideoHandler() {
  // --- State ---
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [transcodedUrl, setTranscodedUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<TranscodeStats | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false);

  // --- Preset ---
  const [selectedPreset, setSelectedPreset] = useState<VideoPresetName | "custom">("balanced");

  // --- Custom options ---
  const [codec, setCodec] = useState("libx264");
  const [encoderPreset, setEncoderPreset] = useState<TranscodeVideoOptions["preset"]>("fast");
  const [crf, setCrf] = useState(23);
  const [maxBitrate, setMaxBitrate] = useState("5M");
  const [audioBitrate, setAudioBitrate] = useState("128k");
  const [audioCodec, setAudioCodec] = useState("aac");
  const [pixelFormat, setPixelFormat] = useState("yuv420p");
  const [outputFormat, setOutputFormat] = useState("mp4");
  const [threads, setThreads] = useState(0);
  const [resWidth, setResWidth] = useState(1280);
  const [resHeight, setResHeight] = useState(720);
  const [useResolution, setUseResolution] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When preset changes, update the custom fields to reflect preset values
  const handlePresetChange = useCallback((presetName: VideoPresetName | "custom") => {
    setSelectedPreset(presetName);
    if (presetName !== "custom") {
      const p = VIDEO_PRESETS[presetName];
      setCodec(p.codec);
      setEncoderPreset(p.preset as TranscodeVideoOptions["preset"]);
      setCrf(p.crf);
      setMaxBitrate(p.maxBitrate);
      setAudioBitrate(p.audioBitrate);
      setPixelFormat(p.pixelFormat);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (transcodedUrl) URL.revokeObjectURL(transcodedUrl);
  }, [originalUrl, transcodedUrl]);

  const handleFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      cleanup();
      setError(null);
      setProcessing(true);
      setProgress(0);
      setStats(null);
      setTranscodedUrl(null);
      setLoadingFFmpeg(true);

      const origUrl = URL.createObjectURL(file);
      setOriginalUrl(origUrl);

      // Get video info
      try {
        const info = await getVideoInfo(file);
        setVideoInfo(info);
      } catch {
        setVideoInfo(null);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      const startTime = performance.now();

      try {
        // Build options
        const options: TranscodeVideoOptions = {};

        if (selectedPreset !== "custom") {
          Object.assign(options, applyPreset(selectedPreset));
        } else {
          options.codec = codec;
          options.preset = encoderPreset;
          options.crf = crf;
          options.maxBitrate = maxBitrate;
          options.audioBitrate = audioBitrate;
          options.audioCodec = audioCodec;
          options.pixelFormat = pixelFormat;
        }

        options.outputFormat = outputFormat;
        options.threads = threads;
        options.signal = controller.signal;
        options.onProgress = (p) => {
          setLoadingFFmpeg(false);
          setProgress(p);
        };

        if (useResolution) {
          // TODO: resolution is not directly in TranscodeVideoOptions in optimized version
          // but codec/crf/bitrate are the main controls
        }

        const blob = await transcodeVideo(file, options);
        const elapsed = performance.now() - startTime;

        const transUrl = URL.createObjectURL(blob);
        setTranscodedUrl(transUrl);
        setStats({
          originalFileSize: file.size,
          transcodedFileSize: blob.size,
          ratio: blob.size / file.size,
          elapsed,
        });
      } catch (err) {
        if (err instanceof Error && (err.name === "VideoAbortError" || err.message.includes("abort"))) {
          setError("Transcoding cancelled");
        } else {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        setProcessing(false);
        setLoadingFFmpeg(false);
        abortRef.current = null;
      }
    },
    [
      cleanup, selectedPreset, codec, encoderPreset, crf, maxBitrate,
      audioBitrate, audioCodec, pixelFormat, outputFormat, threads,
      useResolution, resWidth, resHeight,
    ]
  );

  const handleCancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return (
    <section className="handler-section">
      <div className="section-header">
        <div>
          <h2>Video Transcoder</h2>
          <p className="section-sub">
            <code>transcodeVideo(file, options)</code> +{" "}
            <code>getVideoInfo(file)</code>
          </p>
        </div>
        <button
          className="toggle-btn"
          onClick={() => setShowOptions(!showOptions)}
          type="button"
        >
          {showOptions ? "Hide Options" : "Show Options"}
        </button>
      </div>

      {/* --- OPTIONS PANEL --- */}
      {showOptions && (
        <div className="options-panel">
          <div className="options-group">
            <h4>Preset</h4>
            <div className="preset-buttons">
              {PRESET_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`preset-btn ${selectedPreset === p.value ? "active" : ""}`}
                  onClick={() => handlePresetChange(p.value)}
                  disabled={processing}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="options-group">
            <h4>Video</h4>
            <div className="options-grid">
              <label>
                Codec
                <select value={codec} onChange={(e) => { setCodec(e.target.value); setSelectedPreset("custom"); }}>
                  {CODEC_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Encoder Preset
                <select value={encoderPreset} onChange={(e) => { setEncoderPreset(e.target.value as TranscodeVideoOptions["preset"]); setSelectedPreset("custom"); }}>
                  {ENCODER_PRESETS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label>
                CRF ({crf}) <span className="hint">{crf <= 20 ? "high quality" : crf <= 26 ? "balanced" : "small file"}</span>
                <input type="range" min={0} max={51} value={crf}
                  onChange={(e) => { setCrf(Number(e.target.value)); setSelectedPreset("custom"); }} />
              </label>
              <label>
                Max Bitrate
                <input type="text" value={maxBitrate}
                  onChange={(e) => { setMaxBitrate(e.target.value); setSelectedPreset("custom"); }}
                  placeholder="e.g. 2.5M, 500k" />
              </label>
              <label>
                Pixel Format
                <select value={pixelFormat} onChange={(e) => { setPixelFormat(e.target.value); setSelectedPreset("custom"); }}>
                  {PIXEL_FORMATS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="options-group">
            <h4>Audio</h4>
            <div className="options-grid">
              <label>
                Audio Codec
                <input type="text" value={audioCodec}
                  onChange={(e) => { setAudioCodec(e.target.value); setSelectedPreset("custom"); }}
                  placeholder="aac, libopus..." />
              </label>
              <label>
                Audio Bitrate
                <input type="text" value={audioBitrate}
                  onChange={(e) => { setAudioBitrate(e.target.value); setSelectedPreset("custom"); }}
                  placeholder="128k, 192k..." />
              </label>
            </div>
          </div>

          <div className="options-group">
            <h4>Output</h4>
            <div className="options-grid">
              <label>
                Format
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
                  {FORMAT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Threads (0 = auto)
                <input type="number" value={threads} min={0} max={16}
                  onChange={(e) => setThreads(Number(e.target.value))} />
              </label>
              <label className="checkbox-label">
                <input type="checkbox" checked={useResolution}
                  onChange={(e) => setUseResolution(e.target.checked)} />
                Resize Output
              </label>
              {useResolution && (
                <>
                  <label>
                    Width
                    <input type="number" value={resWidth} min={1}
                      onChange={(e) => setResWidth(Number(e.target.value))} />
                  </label>
                  <label>
                    Height
                    <input type="number" value={resHeight} min={1}
                      onChange={(e) => setResHeight(Number(e.target.value))} />
                  </label>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- FILE INPUT --- */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/ogg,video/quicktime"
        onChange={handleFile}
        disabled={processing}
      />

      {/* --- VIDEO INFO --- */}
      {videoInfo && (
        <div className="message info">
          Source: {formatDimensions(videoInfo.width, videoInfo.height)} | {videoInfo.duration.toFixed(1)}s | {videoInfo.mimeType}
        </div>
      )}

      {/* --- ERROR --- */}
      {error && <div className="message error">{error}</div>}

      {/* --- PROGRESS --- */}
      {processing && (
        <div className="progress-section">
          {loadingFFmpeg && <p className="loading-text">Loading FFmpeg WASM (~30MB first time)...</p>}
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
            <span className="progress-text">
              {loadingFFmpeg ? "Loading..." : `${Math.round(progress)}%`}
            </span>
          </div>
          <button className="btn btn-danger" onClick={handleCancel} type="button">
            Cancel
          </button>
        </div>
      )}

      {/* --- PREVIEW --- */}
      <div className="preview-grid">
        <div className="preview-card">
          <h3>Original</h3>
          <div className="preview-box">
            {originalUrl ? <video controls src={originalUrl} /> : <span className="placeholder">No video</span>}
          </div>
          {stats && (
            <div className="stat-list">
              {videoInfo && <span>{formatDimensions(videoInfo.width, videoInfo.height)}</span>}
              <span>{formatSize(stats.originalFileSize)}</span>
            </div>
          )}
        </div>
        <div className="preview-card">
          <h3>Transcoded</h3>
          <div className="preview-box">
            {transcodedUrl ? <video controls src={transcodedUrl} /> : <span className="placeholder">{processing ? "Transcoding..." : "No result"}</span>}
          </div>
          {stats && (
            <div className="stat-list">
              <span>{formatSize(stats.transcodedFileSize)}</span>
              <span className={stats.ratio < 1 ? "stat-good" : "stat-bad"}>
                {stats.ratio < 1
                  ? `${Math.round((1 - stats.ratio) * 100)}% smaller`
                  : `${Math.round((stats.ratio - 1) * 100)}% larger`}
              </span>
              <span className="stat-muted">{formatDuration(stats.elapsed)}</span>
            </div>
          )}
        </div>
      </div>

      {/* --- DOWNLOAD --- */}
      {transcodedUrl && (
        <div className="actions">
          <a href={transcodedUrl} download={`transcoded.${outputFormat}`} className="btn btn-primary">
            Download {formatSize(stats?.transcodedFileSize ?? 0)}
          </a>
          <button type="button" className="btn btn-secondary"
            onClick={() => {
              cleanup();
              setOriginalUrl(null);
              setTranscodedUrl(null);
              setStats(null);
              setVideoInfo(null);
              setError(null);
              setProgress(0);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}>
            Reset
          </button>
        </div>
      )}

      {/* --- CODE PREVIEW --- */}
      {stats && (
        <details className="code-preview">
          <summary>View generated code</summary>
          <pre>{`import { transcodeVideo${selectedPreset !== "custom" ? ", applyPreset" : ""} } from "snapblob/video";

const blob = await transcodeVideo(file, {${selectedPreset !== "custom"
  ? `\n  ...applyPreset("${selectedPreset}"),`
  : `\n  codec: "${codec}",\n  preset: "${encoderPreset}",\n  crf: ${crf},\n  maxBitrate: "${maxBitrate}",\n  audioCodec: "${audioCodec}",\n  audioBitrate: "${audioBitrate}",\n  pixelFormat: "${pixelFormat}",`}
  outputFormat: "${outputFormat}",${threads > 0 ? `\n  threads: ${threads},` : ""}
  onProgress: (p) => console.log(p + "%"),
  signal: abortController.signal,
});

// blob → ${outputFormat.toUpperCase()} (${formatSize(stats.transcodedFileSize)})`}</pre>
        </details>
      )}
    </section>
  );
}
