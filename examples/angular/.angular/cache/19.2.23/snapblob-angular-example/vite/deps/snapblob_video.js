import {
  __async,
  __objRest,
  __spreadProps,
  __spreadValues
} from "./chunk-EIB7IA3J.js";

// ../../node_modules/@ffmpeg/util/dist/esm/errors.js
var ERROR_RESPONSE_BODY_READER = new Error("failed to get response body reader");
var ERROR_INCOMPLETED_DOWNLOAD = new Error("failed to complete download");

// ../../node_modules/@ffmpeg/util/dist/esm/const.js
var HeaderContentLength = "Content-Length";

// ../../node_modules/@ffmpeg/util/dist/esm/index.js
var readFromBlobOrFile = (blob) => new Promise((resolve, reject) => {
  const fileReader = new FileReader();
  fileReader.onload = () => {
    const {
      result
    } = fileReader;
    if (result instanceof ArrayBuffer) {
      resolve(new Uint8Array(result));
    } else {
      resolve(new Uint8Array());
    }
  };
  fileReader.onerror = (event) => {
    reject(Error(`File could not be read! Code=${event?.target?.error?.code || -1}`));
  };
  fileReader.readAsArrayBuffer(blob);
});
var fetchFile = (file) => __async(null, null, function* () {
  let data;
  if (typeof file === "string") {
    if (/data:_data\/([a-zA-Z]*);base64,([^"]*)/.test(file)) {
      data = atob(file.split(",")[1]).split("").map((c) => c.charCodeAt(0));
    } else {
      data = yield (yield fetch(file)).arrayBuffer();
    }
  } else if (file instanceof URL) {
    data = yield (yield fetch(file)).arrayBuffer();
  } else if (file instanceof File || file instanceof Blob) {
    data = yield readFromBlobOrFile(file);
  } else {
    return new Uint8Array();
  }
  return new Uint8Array(data);
});
var downloadWithProgress = (url, cb) => __async(null, null, function* () {
  const resp = yield fetch(url);
  let buf;
  try {
    const total = parseInt(resp.headers.get(HeaderContentLength) || "-1");
    const reader = resp.body?.getReader();
    if (!reader) throw ERROR_RESPONSE_BODY_READER;
    const chunks = [];
    let received = 0;
    for (; ; ) {
      const {
        done,
        value
      } = yield reader.read();
      const delta = value ? value.length : 0;
      if (done) {
        if (total != -1 && total !== received) throw ERROR_INCOMPLETED_DOWNLOAD;
        cb && cb({
          url,
          total,
          received,
          delta,
          done
        });
        break;
      }
      chunks.push(value);
      received += delta;
      cb && cb({
        url,
        total,
        received,
        delta,
        done
      });
    }
    const data = new Uint8Array(received);
    let position = 0;
    for (const chunk of chunks) {
      data.set(chunk, position);
      position += chunk.length;
    }
    buf = data.buffer;
  } catch (e) {
    console.log(`failed to send download progress event: `, e);
    buf = yield resp.arrayBuffer();
    cb && cb({
      url,
      total: buf.byteLength,
      received: buf.byteLength,
      delta: 0,
      done: true
    });
  }
  return buf;
});
var toBlobURL = (url, mimeType, progress = false, cb) => __async(null, null, function* () {
  const buf = progress ? yield downloadWithProgress(url, cb) : yield (yield fetch(url)).arrayBuffer();
  const blob = new Blob([buf], {
    type: mimeType
  });
  return URL.createObjectURL(blob);
});

// ../../node_modules/@ffmpeg/ffmpeg/dist/esm/const.js
var CORE_VERSION = "0.12.9";
var CORE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd/ffmpeg-core.js`;
var FFMessageType;
(function(FFMessageType2) {
  FFMessageType2["LOAD"] = "LOAD";
  FFMessageType2["EXEC"] = "EXEC";
  FFMessageType2["FFPROBE"] = "FFPROBE";
  FFMessageType2["WRITE_FILE"] = "WRITE_FILE";
  FFMessageType2["READ_FILE"] = "READ_FILE";
  FFMessageType2["DELETE_FILE"] = "DELETE_FILE";
  FFMessageType2["RENAME"] = "RENAME";
  FFMessageType2["CREATE_DIR"] = "CREATE_DIR";
  FFMessageType2["LIST_DIR"] = "LIST_DIR";
  FFMessageType2["DELETE_DIR"] = "DELETE_DIR";
  FFMessageType2["ERROR"] = "ERROR";
  FFMessageType2["DOWNLOAD"] = "DOWNLOAD";
  FFMessageType2["PROGRESS"] = "PROGRESS";
  FFMessageType2["LOG"] = "LOG";
  FFMessageType2["MOUNT"] = "MOUNT";
  FFMessageType2["UNMOUNT"] = "UNMOUNT";
})(FFMessageType || (FFMessageType = {}));

// ../../node_modules/@ffmpeg/ffmpeg/dist/esm/utils.js
var getMessageID = /* @__PURE__ */ (() => {
  let messageID = 0;
  return () => messageID++;
})();

// ../../node_modules/@ffmpeg/ffmpeg/dist/esm/errors.js
var ERROR_UNKNOWN_MESSAGE_TYPE = new Error("unknown message type");
var ERROR_NOT_LOADED = new Error("ffmpeg is not loaded, call `await ffmpeg.load()` first");
var ERROR_TERMINATED = new Error("called FFmpeg.terminate()");
var ERROR_IMPORT_FAILURE = new Error("failed to import ffmpeg-core.js");

// ../../node_modules/@ffmpeg/ffmpeg/dist/esm/classes.js
var FFmpeg = class {
  #worker = null;
  /**
   * #resolves and #rejects tracks Promise resolves and rejects to
   * be called when we receive message from web worker.
   */
  #resolves = {};
  #rejects = {};
  #logEventCallbacks = [];
  #progressEventCallbacks = [];
  loaded = false;
  /**
   * register worker message event handlers.
   */
  #registerHandlers = () => {
    if (this.#worker) {
      this.#worker.onmessage = ({
        data: {
          id,
          type,
          data
        }
      }) => {
        switch (type) {
          case FFMessageType.LOAD:
            this.loaded = true;
            this.#resolves[id](data);
            break;
          case FFMessageType.MOUNT:
          case FFMessageType.UNMOUNT:
          case FFMessageType.EXEC:
          case FFMessageType.FFPROBE:
          case FFMessageType.WRITE_FILE:
          case FFMessageType.READ_FILE:
          case FFMessageType.DELETE_FILE:
          case FFMessageType.RENAME:
          case FFMessageType.CREATE_DIR:
          case FFMessageType.LIST_DIR:
          case FFMessageType.DELETE_DIR:
            this.#resolves[id](data);
            break;
          case FFMessageType.LOG:
            this.#logEventCallbacks.forEach((f2) => f2(data));
            break;
          case FFMessageType.PROGRESS:
            this.#progressEventCallbacks.forEach((f2) => f2(data));
            break;
          case FFMessageType.ERROR:
            this.#rejects[id](data);
            break;
        }
        delete this.#resolves[id];
        delete this.#rejects[id];
      };
    }
  };
  /**
   * Generic function to send messages to web worker.
   */
  #send = ({
    type,
    data
  }, trans = [], signal) => {
    if (!this.#worker) {
      return Promise.reject(ERROR_NOT_LOADED);
    }
    return new Promise((resolve, reject) => {
      const id = getMessageID();
      this.#worker && this.#worker.postMessage({
        id,
        type,
        data
      }, trans);
      this.#resolves[id] = resolve;
      this.#rejects[id] = reject;
      signal?.addEventListener("abort", () => {
        reject(new DOMException(`Message # ${id} was aborted`, "AbortError"));
      }, {
        once: true
      });
    });
  };
  on(event, callback) {
    if (event === "log") {
      this.#logEventCallbacks.push(callback);
    } else if (event === "progress") {
      this.#progressEventCallbacks.push(callback);
    }
  }
  off(event, callback) {
    if (event === "log") {
      this.#logEventCallbacks = this.#logEventCallbacks.filter((f2) => f2 !== callback);
    } else if (event === "progress") {
      this.#progressEventCallbacks = this.#progressEventCallbacks.filter((f2) => f2 !== callback);
    }
  }
  /**
   * Loads ffmpeg-core inside web worker. It is required to call this method first
   * as it initializes WebAssembly and other essential variables.
   *
   * @category FFmpeg
   * @returns `true` if ffmpeg core is loaded for the first time.
   */
  load = (_a = {}, {
    signal
  } = {}) => {
    var _b = _a, {
      classWorkerURL
    } = _b, config = __objRest(_b, [
      "classWorkerURL"
    ]);
    if (!this.#worker) {
      this.#worker = classWorkerURL ? new Worker(new URL(classWorkerURL, import.meta.url), {
        type: "module"
      }) : (
        // We need to duplicated the code here to enable webpack
        // to bundle worekr.js here.
        new Worker(new URL("./worker.js", import.meta.url), {
          type: "module"
        })
      );
      this.#registerHandlers();
    }
    return this.#send({
      type: FFMessageType.LOAD,
      data: config
    }, void 0, signal);
  };
  /**
   * Execute ffmpeg command.
   *
   * @remarks
   * To avoid common I/O issues, ["-nostdin", "-y"] are prepended to the args
   * by default.
   *
   * @example
   * ```ts
   * const ffmpeg = new FFmpeg();
   * await ffmpeg.load();
   * await ffmpeg.writeFile("video.avi", ...);
   * // ffmpeg -i video.avi video.mp4
   * await ffmpeg.exec(["-i", "video.avi", "video.mp4"]);
   * const data = ffmpeg.readFile("video.mp4");
   * ```
   *
   * @returns `0` if no error, `!= 0` if timeout (1) or error.
   * @category FFmpeg
   */
  exec = (args, timeout = -1, {
    signal
  } = {}) => this.#send({
    type: FFMessageType.EXEC,
    data: {
      args,
      timeout
    }
  }, void 0, signal);
  /**
   * Execute ffprobe command.
   *
   * @example
   * ```ts
   * const ffmpeg = new FFmpeg();
   * await ffmpeg.load();
   * await ffmpeg.writeFile("video.avi", ...);
   * // Getting duration of a video in seconds: ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 video.avi -o output.txt
   * await ffmpeg.ffprobe(["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", "video.avi", "-o", "output.txt"]);
   * const data = ffmpeg.readFile("output.txt");
   * ```
   *
   * @returns `0` if no error, `!= 0` if timeout (1) or error.
   * @category FFmpeg
   */
  ffprobe = (args, timeout = -1, {
    signal
  } = {}) => this.#send({
    type: FFMessageType.FFPROBE,
    data: {
      args,
      timeout
    }
  }, void 0, signal);
  /**
   * Terminate all ongoing API calls and terminate web worker.
   * `FFmpeg.load()` must be called again before calling any other APIs.
   *
   * @category FFmpeg
   */
  terminate = () => {
    const ids = Object.keys(this.#rejects);
    for (const id of ids) {
      this.#rejects[id](ERROR_TERMINATED);
      delete this.#rejects[id];
      delete this.#resolves[id];
    }
    if (this.#worker) {
      this.#worker.terminate();
      this.#worker = null;
      this.loaded = false;
    }
  };
  /**
   * Write data to ffmpeg.wasm.
   *
   * @example
   * ```ts
   * const ffmpeg = new FFmpeg();
   * await ffmpeg.load();
   * await ffmpeg.writeFile("video.avi", await fetchFile("../video.avi"));
   * await ffmpeg.writeFile("text.txt", "hello world");
   * ```
   *
   * @category File System
   */
  writeFile = (path, data, {
    signal
  } = {}) => {
    const trans = [];
    if (data instanceof Uint8Array) {
      trans.push(data.buffer);
    }
    return this.#send({
      type: FFMessageType.WRITE_FILE,
      data: {
        path,
        data
      }
    }, trans, signal);
  };
  mount = (fsType, options, mountPoint) => {
    const trans = [];
    return this.#send({
      type: FFMessageType.MOUNT,
      data: {
        fsType,
        options,
        mountPoint
      }
    }, trans);
  };
  unmount = (mountPoint) => {
    const trans = [];
    return this.#send({
      type: FFMessageType.UNMOUNT,
      data: {
        mountPoint
      }
    }, trans);
  };
  /**
   * Read data from ffmpeg.wasm.
   *
   * @example
   * ```ts
   * const ffmpeg = new FFmpeg();
   * await ffmpeg.load();
   * const data = await ffmpeg.readFile("video.mp4");
   * ```
   *
   * @category File System
   */
  readFile = (path, encoding = "binary", {
    signal
  } = {}) => this.#send({
    type: FFMessageType.READ_FILE,
    data: {
      path,
      encoding
    }
  }, void 0, signal);
  /**
   * Delete a file.
   *
   * @category File System
   */
  deleteFile = (path, {
    signal
  } = {}) => this.#send({
    type: FFMessageType.DELETE_FILE,
    data: {
      path
    }
  }, void 0, signal);
  /**
   * Rename a file or directory.
   *
   * @category File System
   */
  rename = (oldPath, newPath, {
    signal
  } = {}) => this.#send({
    type: FFMessageType.RENAME,
    data: {
      oldPath,
      newPath
    }
  }, void 0, signal);
  /**
   * Create a directory.
   *
   * @category File System
   */
  createDir = (path, {
    signal
  } = {}) => this.#send({
    type: FFMessageType.CREATE_DIR,
    data: {
      path
    }
  }, void 0, signal);
  /**
   * List directory contents.
   *
   * @category File System
   */
  listDir = (path, {
    signal
  } = {}) => this.#send({
    type: FFMessageType.LIST_DIR,
    data: {
      path
    }
  }, void 0, signal);
  /**
   * Delete an empty directory.
   *
   * @category File System
   */
  deleteDir = (path, {
    signal
  } = {}) => this.#send({
    type: FFMessageType.DELETE_DIR,
    data: {
      path
    }
  }, void 0, signal);
};

// ../../node_modules/@ffmpeg/ffmpeg/dist/esm/types.js
var FFFSType;
(function(FFFSType2) {
  FFFSType2["MEMFS"] = "MEMFS";
  FFFSType2["NODEFS"] = "NODEFS";
  FFFSType2["NODERAWFS"] = "NODERAWFS";
  FFFSType2["IDBFS"] = "IDBFS";
  FFFSType2["WORKERFS"] = "WORKERFS";
  FFFSType2["PROXYFS"] = "PROXYFS";
})(FFFSType || (FFFSType = {}));

// ../../dist/constants-DPo-HJq3.js
var K = Object.defineProperty;
var Q = (t, e, s) => e in t ? K(t, e, {
  enumerable: true,
  configurable: true,
  writable: true,
  value: s
}) : t[e] = s;
var R = (t, e, s) => Q(t, typeof e != "symbol" ? e + "" : e, s);
var d = class extends Error {
  constructor(s, c) {
    super(s);
    R(this, "name", "VideoTranscodeError");
    R(this, "cause");
    (c == null ? void 0 : c.cause) !== void 0 && (this.cause = c.cause);
  }
};
var L = class extends d {
  constructor() {
    super(...arguments);
    R(this, "name", "VideoValidationError");
  }
};
var f = class extends d {
  constructor() {
    super(...arguments);
    R(this, "name", "VideoAbortError");
  }
};
var Z = {
  /** High quality: preserve detail, larger file */
  "high-quality": {
    codec: "libx264",
    preset: "slow",
    crf: 18,
    maxBitrate: "8M",
    audioBitrate: "192k",
    pixelFormat: "yuv420p"
  },
  /** Balanced: good quality with reasonable file size */
  balanced: {
    codec: "libx264",
    preset: "medium",
    crf: 23,
    maxBitrate: "5M",
    audioBitrate: "128k",
    pixelFormat: "yuv420p"
  },
  /** Small file: aggressive compression */
  "small-file": {
    codec: "libx264",
    preset: "fast",
    crf: 28,
    maxBitrate: "2M",
    audioBitrate: "96k",
    pixelFormat: "yuv420p"
  },
  /** Social media optimized: 720p, good for sharing */
  "social-media": {
    codec: "libx264",
    preset: "fast",
    crf: 26,
    maxBitrate: "3M",
    audioBitrate: "128k",
    pixelFormat: "yuv420p"
  },
  /** Instagram feed: square/portrait video, up to 60s, optimized for mobile feeds */
  "instagram-feed": {
    codec: "libx264",
    crf: 23,
    maxBitrate: "3.5M",
    preset: "fast",
    audioBitrate: "128k",
    pixelFormat: "yuv420p"
  },
  /** Instagram story: 9:16 vertical video, optimized for full-screen mobile playback */
  "instagram-story": {
    codec: "libx264",
    crf: 23,
    maxBitrate: "4M",
    preset: "fast",
    audioBitrate: "128k",
    pixelFormat: "yuv420p"
  },
  /** TikTok: vertical short-form video, optimized for mobile playback */
  tiktok: {
    codec: "libx264",
    crf: 23,
    maxBitrate: "4M",
    preset: "fast",
    audioBitrate: "128k",
    pixelFormat: "yuv420p"
  },
  /** YouTube 1080p: full HD upload, good balance of quality and upload speed */
  "youtube-1080p": {
    codec: "libx264",
    crf: 20,
    maxBitrate: "8M",
    preset: "medium",
    audioBitrate: "192k",
    pixelFormat: "yuv420p"
  },
  /** YouTube 4K: ultra HD upload, maximum quality for large displays */
  "youtube-4k": {
    codec: "libx264",
    crf: 18,
    maxBitrate: "20M",
    preset: "slow",
    audioBitrate: "192k",
    pixelFormat: "yuv420p"
  },
  /** Twitter/X: optimized for timeline video playback with size constraints */
  twitter: {
    codec: "libx264",
    crf: 24,
    maxBitrate: "5M",
    preset: "fast",
    audioBitrate: "128k",
    pixelFormat: "yuv420p"
  }
};
function M(t) {
  const e = Z[t];
  return {
    codec: e.codec,
    preset: e.preset,
    crf: e.crf,
    maxBitrate: e.maxBitrate,
    audioBitrate: e.audioBitrate,
    pixelFormat: e.pixelFormat
  };
}
function Y() {
  return Math.random().toString(36).slice(2, 10);
}
function C(t) {
  if (typeof t == "number") return `${t}`;
  const e = t.trim();
  return /^\d+(\.\d+)?[kKmM]$/.test(e) ? e : /bps$/i.test(e) ? e.replace(/bps$/i, "") : e;
}
function D(t, ...e) {
  return __async(this, null, function* () {
    yield Promise.allSettled(e.map((s) => t.deleteFile(s)));
  });
}
function E(t) {
  return t.split(".").pop() ?? "";
}
var F = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
var G = "https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm";
var _ = null;
var A = false;
var $ = false;
function H() {
  $ = true;
}
var b = [];
var P = 30;
function S(t, e, s) {
  return __async(this, null, function* () {
    if ($ || !_) {
      if (_) try {
        _.terminate();
      } catch {
      }
      _ = new FFmpeg(), A = false, $ = false;
    }
    const c = _;
    if (!A) {
      let a = e ?? F;
      const n = {};
      typeof window < "u" && window.crossOriginIsolated && (a = s ?? G, n.workerURL = yield toBlobURL(`${a}/ffmpeg-core.worker.js`, "text/javascript")), b = [], c.on("log", ({
        message: r
      }) => {
        b.push(r), b.length > P && b.shift(), t == null || t(r);
      });
      try {
        yield c.load(__spreadProps(__spreadValues({}, n), {
          coreURL: yield toBlobURL(`${a}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: yield toBlobURL(`${a}/ffmpeg-core.wasm`, "application/wasm")
        })), A = true;
      } catch (r) {
        throw _ = null, A = false, new d("Failed to load FFmpeg.", {
          cause: r
        });
      }
    }
    return c;
  });
}
function lt() {
  if (_) {
    try {
      _.terminate();
    } catch {
    }
    _ = null, A = false, $ = false, b = [];
  }
}
function dt(t) {
  return __async(this, null, function* () {
    yield S(void 0, t == null ? void 0 : t.baseUrl, t == null ? void 0 : t.mtBaseUrl);
  });
}
function wt(_0) {
  return __async(this, arguments, function* (t, e = {}) {
    if (t.size === 0) throw new L("Input file is empty (0 bytes).");
    const s = e.presetName ? __spreadValues(__spreadValues({}, M(e.presetName)), tt(e)) : __spreadValues({}, e), {
      codec: c = "libx264",
      preset: a,
      crf: n,
      maxBitrate: r,
      audioBitrate: x,
      audioCodec: T,
      pixelFormat: B = "yuv420p",
      outputFormat: O,
      threads: U = 0,
      signal: o,
      onProgress: m,
      onLog: v,
      ffmpegBaseUrl: p,
      ffmpegMTBaseUrl: l
    } = s, h = Y(), i = t instanceof File ? t.name : "input.mp4", y = E(i) || "mp4", z = O ?? y, k = `input_${h}.${y}`, I = `output_${h}.${z}`;
    if (o != null && o.aborted) throw new f("Transcode aborted before start.");
    let g;
    try {
      g = yield S(v, p, l);
    } catch (u) {
      throw u instanceof d ? u : new d("Failed to load FFmpeg.", {
        cause: u
      });
    }
    const q = ({
      progress: u
    }) => {
      m == null || m(u * 100);
    };
    g.on("progress", q);
    const w = ["-y"];
    if (w.push("-i", k), w.push("-threads", `${U}`), w.push("-c:v", c), a && w.push("-preset", a), n != null && w.push("-crf", `${n}`), r != null) {
      const u = C(r);
      w.push("-maxrate", u, "-bufsize", u);
    }
    T && w.push("-c:a", T), x != null && w.push("-b:a", C(x)), B && w.push("-pix_fmt", B), w.push(I);
    try {
      yield g.writeFile(k, yield fetchFile(t));
      const u = () => {
        H();
        try {
          g.terminate();
        } catch {
        }
      };
      o == null || o.addEventListener("abort", u, {
        once: true
      });
      try {
        if (o != null && o.aborted) throw new f("Transcode aborted.");
        if (yield g.exec(w), o != null && o.aborted) throw new f("Transcode aborted during execution.");
      } finally {
        o == null || o.removeEventListener("abort", u);
      }
      const V = yield g.readFile(I), W = z === "webm" ? "video/webm" : "video/mp4";
      return m == null || m(100), new Blob([V], {
        type: W
      });
    } catch (u) {
      if (u instanceof f) throw u;
      if (o != null && o.aborted) throw new f("Transcode aborted.", {
        cause: u
      });
      const V = b.length > 0 ? `
FFmpeg logs:
${b.slice(-5).join(`
`)}` : "";
      throw new d(`Transcoding failed.${V}`, {
        cause: u
      });
    } finally {
      g.off("progress", q), yield D(g, k, I);
    }
  });
}
var X = 3e4;
function bt(t) {
  return __async(this, null, function* () {
    if (t.size === 0) throw new L("Input file is empty (0 bytes).");
    const e = URL.createObjectURL(t);
    try {
      return yield new Promise((s, c) => {
        const a = document.createElement("video");
        a.preload = "metadata", a.src = e;
        const n = setTimeout(() => {
          c(new L(`Video metadata loading timed out after ${X / 1e3}s.`));
        }, X);
        a.onloadedmetadata = () => {
          clearTimeout(n), s({
            duration: a.duration,
            width: a.videoWidth,
            height: a.videoHeight,
            fileSize: t.size,
            mimeType: t.type || "video/mp4"
          });
        }, a.onerror = () => {
          clearTimeout(n), c(new L("Failed to load video metadata. The file may be corrupted or in an unsupported format."));
        };
      });
    } finally {
      URL.revokeObjectURL(e);
    }
  });
}
function tt(t) {
  const e = {};
  for (const [s, c] of Object.entries(t)) c !== void 0 && (e[s] = c);
  return e;
}
var et = {
  mp3: "libmp3lame",
  aac: "aac",
  opus: "libopus",
  wav: "pcm_s16le"
};
var at = {
  mp3: "mp3",
  aac: "m4a",
  opus: "ogg",
  wav: "wav"
};
var rt = {
  mp3: "audio/mpeg",
  aac: "audio/mp4",
  opus: "audio/ogg",
  wav: "audio/wav"
};
function ht(_0) {
  return __async(this, arguments, function* (t, e = {}) {
    if (t.size === 0) throw new L("Input file is empty (0 bytes).");
    const {
      format: s = "mp3",
      bitrate: c = "128k",
      signal: a,
      onProgress: n,
      onLog: r,
      ffmpegBaseUrl: x,
      ffmpegMTBaseUrl: T
    } = e, B = et[s], O = at[s], U = rt[s], o = Y(), m = `audio_input_${o}.mp4`, v = `audio_output_${o}.${O}`;
    if (a != null && a.aborted) throw new f("Audio extraction aborted before start.");
    let p;
    try {
      p = yield S(r, x, T);
    } catch (i) {
      throw i instanceof d ? i : new d("Failed to load FFmpeg.", {
        cause: i
      });
    }
    const l = ({
      progress: i
    }) => {
      n == null || n(i * 100);
    };
    p.on("progress", l);
    const h = ["-y", "-i", m, "-vn", "-c:a", B];
    s !== "wav" && h.push("-b:a", C(c)), h.push(v);
    try {
      yield p.writeFile(m, yield fetchFile(t));
      const i = () => {
        H();
        try {
          p.terminate();
        } catch {
        }
      };
      a == null || a.addEventListener("abort", i, {
        once: true
      });
      try {
        if (a != null && a.aborted) throw new f("Audio extraction aborted.");
        if (yield p.exec(h), a != null && a.aborted) throw new f("Audio extraction aborted during execution.");
      } finally {
        a == null || a.removeEventListener("abort", i);
      }
      const y = yield p.readFile(v);
      return n == null || n(100), new Blob([y], {
        type: U
      });
    } catch (i) {
      if (i instanceof f) throw i;
      if (a != null && a.aborted) throw new f("Audio extraction aborted.", {
        cause: i
      });
      const y = b.length > 0 ? `
FFmpeg logs:
${b.slice(-5).join(`
`)}` : "";
      throw new d(`Audio extraction failed.${y}`, {
        cause: i
      });
    } finally {
      p.off("progress", l), yield D(p, m, v);
    }
  });
}
var it = {
  jpeg: "jpg",
  png: "png",
  webp: "webp"
};
var ot = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};
function yt(_0) {
  return __async(this, arguments, function* (t, e = {}) {
    if (t.size === 0) throw new L("Input file is empty (0 bytes).");
    const {
      time: s = 0,
      width: c,
      format: a = "jpeg",
      quality: n = 5,
      signal: r,
      onLog: x,
      ffmpegBaseUrl: T,
      ffmpegMTBaseUrl: B
    } = e, O = it[a], U = ot[a], o = Y(), m = `thumb_input_${o}.mp4`, v = `thumb_output_${o}.${O}`;
    if (r != null && r.aborted) throw new f("Thumbnail extraction aborted before start.");
    let p;
    try {
      p = yield S(x, T, B);
    } catch (i) {
      throw i instanceof d ? i : new d("Failed to load FFmpeg.", {
        cause: i
      });
    }
    const l = ["-y"];
    l.push("-ss", `${s}`), l.push("-i", m), l.push("-frames:v", "1");
    const h = [];
    c && h.push(`scale=${c}:-1`), h.length > 0 && l.push("-vf", h.join(",")), a === "jpeg" && l.push("-q:v", `${n}`), l.push(v);
    try {
      yield p.writeFile(m, yield fetchFile(t));
      const i = () => {
        H();
        try {
          p.terminate();
        } catch {
        }
      };
      r == null || r.addEventListener("abort", i, {
        once: true
      });
      try {
        if (r != null && r.aborted) throw new f("Thumbnail extraction aborted.");
        if (yield p.exec(l), r != null && r.aborted) throw new f("Thumbnail extraction aborted during execution.");
      } finally {
        r == null || r.removeEventListener("abort", i);
      }
      const y = yield p.readFile(v);
      return new Blob([y], {
        type: U
      });
    } catch (i) {
      if (i instanceof f) throw i;
      if (r != null && r.aborted) throw new f("Thumbnail extraction aborted.", {
        cause: i
      });
      const y = b.length > 0 ? `
FFmpeg logs:
${b.slice(-5).join(`
`)}` : "";
      throw new d(`Thumbnail extraction failed.${y}`, {
        cause: i
      });
    } finally {
      yield D(p, m, v);
    }
  });
}
var st = ((t) => (t.H264 = "libx264", t.H265 = "libx265", t.MPEG4 = "mpeg4", t.MPEG2 = "mpeg2video", t.VP8 = "libvpx", t.VP9 = "libvpx-vp9", t.AV1_AOM = "libaom-av1", t.AV1_SVT = "libsvtav1", t.PRORES = "prores_ks", t.THEORA = "libtheora", t.XVID = "libxvid", t.H264_NVENC = "h264_nvenc", t.H265_NVENC = "hevc_nvenc", t.H264_QSV = "h264_qsv", t.H265_QSV = "hevc_qsv", t.H264_VIDEOTOOLBOX = "h264_videotoolbox", t.H265_VIDEOTOOLBOX = "hevc_videotoolbox", t.H264_AMF = "h264_amf", t.H265_AMF = "hevc_amf", t))(st || {});
var ct = ((t) => (t.AAC = "aac", t.AAC_FDK = "libfdk_aac", t.MP3 = "libmp3lame", t.MP2 = "mp2", t.AC3 = "ac3", t.EAC3 = "eac3", t.OPUS = "libopus", t.VORBIS = "libvorbis", t.DCA = "dca", t.FLAC = "flac", t.ALAC = "alac", t.WAVPACK = "wavpack", t.TRUEHD = "truehd", t.PCM_S16LE = "pcm_s16le", t.PCM_S24LE = "pcm_s24le", t))(ct || {});
var nt = ((t) => (t.ULTRAFAST = "ultrafast", t.SUPERFAST = "superfast", t.VERYFAST = "veryfast", t.FASTER = "faster", t.FAST = "fast", t.MEDIUM = "medium", t.SLOW = "slow", t.SLOWER = "slower", t.VERYSLOW = "veryslow", t))(nt || {});
var pt = ((t) => (t.YUV420P = "yuv420p", t.YUV422P = "yuv422p", t.YUV444P = "yuv444p", t.YUV420P10LE = "yuv420p10le", t.YUV422P10LE = "yuv422p10le", t.YUV444P10LE = "yuv444p10le", t.NV12 = "nv12", t.P010LE = "p010le", t.YUVA420P = "yuva420p", t.YUVA444P = "yuva444p", t.YUYV422 = "yuyv422", t.UYVY422 = "uyvy422", t.RGB24 = "rgb24", t.BGR24 = "bgr24", t.GBRP = "gbrp", t.GBRP10LE = "gbrp10le", t.RGBA = "rgba", t.BGRA = "bgra", t.GRAY = "gray", t.PAL8 = "pal8", t))(pt || {});
export {
  nt as EncoderH264Preset,
  ct as FFMPEGAudioEncoder,
  pt as FFMPEGPixelFormat,
  st as FFMPEGVideoEncoder,
  Z as VIDEO_PRESETS,
  f as VideoAbortError,
  d as VideoTranscodeError,
  L as VideoValidationError,
  M as applyPreset,
  lt as destroyFFmpeg,
  ht as extractAudio,
  bt as getVideoInfo,
  yt as getVideoThumbnail,
  dt as preloadFFmpeg,
  wt as transcodeVideo
};
//# sourceMappingURL=snapblob_video.js.map
