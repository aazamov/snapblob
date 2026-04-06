import {
  __async,
  __objRest,
  __spreadProps,
  __spreadValues
} from "./chunk-EIB7IA3J.js";

// ../../dist/image/index.mjs
var P = Object.defineProperty;
var W = (e, t, a) => t in e ? P(e, t, {
  enumerable: true,
  configurable: true,
  writable: true,
  value: a
}) : e[t] = a;
var x = (e, t, a) => W(e, typeof t != "symbol" ? t + "" : t, a);
var y = ((e) => (e.PNG = "image/png", e.JPEG = "image/jpeg", e.WEBP = "image/webp", e.GIF = "image/gif", e.SVG = "image/svg+xml", e.TIFF = "image/tiff", e.BMP = "image/bmp", e.ICO = "image/x-icon", e))(y || {});
var O = ((e) => (e.BOX = "box", e.HAMMING = "hamming", e.LANCZOS2 = "lanczos2", e.LANCZOS3 = "lanczos3", e.MKS2013 = "mks2013", e))(O || {});
var d = class extends Error {
  constructor(a, n) {
    super(a);
    x(this, "name", "ImageProcessingError");
    x(this, "cause");
    (n == null ? void 0 : n.cause) !== void 0 && (this.cause = n.cause);
  }
};
var B = class extends Error {
  constructor(a, n) {
    super(a);
    x(this, "name", "ImageValidationError");
    x(this, "cause");
    (n == null ? void 0 : n.cause) !== void 0 && (this.cause = n.cause);
  }
};
var N = 3e4;
function z(e) {
  return __async(this, null, function* () {
    if (typeof createImageBitmap == "function") try {
      const t = yield createImageBitmap(e);
      return {
        width: t.width,
        height: t.height,
        source: t,
        cleanup: () => t.close()
      };
    } catch {
    }
    return U(e);
  });
}
function U(e) {
  const t = URL.createObjectURL(e);
  return new Promise((a, n) => {
    const r = document.createElement("img");
    r.src = t;
    const i = setTimeout(() => {
      URL.revokeObjectURL(t), n(new Error(`Image loading timed out after ${N / 1e3}s.`));
    }, N);
    r.onload = () => {
      clearTimeout(i), a({
        width: r.width,
        height: r.height,
        source: r,
        cleanup: () => URL.revokeObjectURL(t)
      });
    }, r.onerror = () => {
      clearTimeout(i), URL.revokeObjectURL(t), n(new Error("Failed to load image. The file may be corrupted or in an unsupported format."));
    };
  });
}
function j(e, t, a) {
  if (e <= 0 || t <= 0 || !Number.isFinite(e) || !Number.isFinite(t) || !Number.isFinite(a) || a <= 0) return {
    width: Math.max(1, Math.round(e) || 1),
    height: Math.max(1, Math.round(t) || 1)
  };
  if (e / t === a) return {
    width: e,
    height: t
  };
  const n = Math.floor(e / a);
  if (n <= t) return {
    width: e,
    height: Math.max(1, n)
  };
  const r = Math.floor(t * a);
  return {
    width: Math.max(1, r),
    height: t
  };
}
function k(e, t) {
  const a = e[0] >= e[1], n = t[0] >= t[1];
  return a !== n ? [t[1], t[0]] : t;
}
function E(e, t) {
  if (typeof OffscreenCanvas < "u") return new OffscreenCanvas(e, t);
  const a = document.createElement("canvas");
  return a.width = e, a.height = t, a;
}
var b = null;
function S() {
  return __async(this, null, function* () {
    if (!b) {
      const e = yield import("./pica-TMGC6K7Z.js"), t = e.default ?? e;
      b = new t();
    }
    return b;
  });
}
function Z() {
  b = null;
}
function _() {
  return __async(this, null, function* () {
    yield S();
  });
}
function m(e, t) {
  e && e(t);
}
function A(e) {
  if (e.quality !== void 0 && (e.quality < 0 || e.quality > 1 || Number.isNaN(e.quality))) throw new d(`Invalid quality value: ${e.quality}. Must be between 0 and 1.`);
  if (e.maxWidth !== void 0 && (e.maxWidth <= 0 || !Number.isFinite(e.maxWidth))) throw new d(`Invalid maxWidth: ${e.maxWidth}. Must be a positive number.`);
  if (e.maxHeight !== void 0 && (e.maxHeight <= 0 || !Number.isFinite(e.maxHeight))) throw new d(`Invalid maxHeight: ${e.maxHeight}. Must be a positive number.`);
}
function q(_0) {
  return __async(this, arguments, function* (e, t = {}) {
    if (e.size === 0) throw new d("Input file is empty (0 bytes).");
    A(t);
    const {
      maxWidth: a,
      maxHeight: n,
      mimeType: r = y.WEBP,
      quality: i = 0.8,
      resizeFilter: c = O.MKS2013,
      adjustOrientation: u = true,
      onProgress: o,
      skipIfSmaller: f = false
    } = t;
    m(o, 5);
    let h;
    try {
      h = yield z(e);
    } catch (w) {
      throw new d("Failed to load image for compression", {
        cause: w
      });
    }
    m(o, 15);
    const {
      width: l,
      height: s,
      source: g,
      cleanup: p
    } = h;
    try {
      const w = yield S();
      m(o, 25);
      const I = D(l, s, a, n, u), L = I.width !== l || I.height !== s;
      let v;
      return L ? v = yield T(w, g, l, s, I, c, r, i, o) : (m(o, 50), v = yield G(w, g, l, s, r, i), m(o, 85)), m(o, 95), f && v.size >= e.size ? (m(o, 100), new Blob([e], {
        type: e.type
      })) : (m(o, 100), v);
    } catch (w) {
      throw w instanceof d ? w : new d("Image compression failed", {
        cause: w
      });
    } finally {
      p();
    }
  });
}
function D(e, t, a, n, r) {
  if (e <= 0 || t <= 0 || !Number.isFinite(e) || !Number.isFinite(t)) throw new d(`Invalid source dimensions: ${e}x${t}.`);
  let i = a ?? e, c = n ?? t;
  if (r) {
    const g = k([e, t], [i, c]);
    i = g[0], c = g[1];
  }
  i = Math.min(i, e), c = Math.min(c, t);
  const u = e / t, o = j(i, c, u), f = Math.max(1, Math.round(o.width)), h = Math.max(1, Math.round(o.height));
  if (!Number.isFinite(f) || !Number.isFinite(h)) throw new d(`Computed invalid dimensions: ${f}x${h}.`);
  return {
    width: f,
    height: h
  };
}
function G(e, t, a, n, r, i) {
  return __async(this, null, function* () {
    const c = E(a, n), u = c.getContext("2d");
    if (!u) throw new d("Failed to get canvas 2D context");
    u.drawImage(t, 0, 0, a, n);
    const o = yield e.toBlob(c, r, i);
    return M(c), o;
  });
}
function T(e, t, a, n, r, i, c, u, o) {
  return __async(this, null, function* () {
    const f = E(a, n), h = f.getContext("2d");
    if (!h) throw new d("Failed to get source canvas 2D context");
    h.drawImage(t, 0, 0, a, n), m(o, 35);
    const l = E(r.width, r.height);
    m(o, 45), yield e.resize(f, l, {
      filter: i
    }), m(o, 70);
    const s = yield e.toBlob(l, c, u);
    return m(o, 85), M(f), M(l), s;
  });
}
function M(e) {
  try {
    e.width = 0, e.height = 0;
  } catch {
  }
}
function X(_0) {
  return __async(this, arguments, function* (e, t = {}) {
    if (e.length === 0) return [];
    const _a = t, {
      concurrency: a = 3,
      onFileProgress: n
    } = _a, r = __objRest(_a, [
      "concurrency",
      "onFileProgress"
    ]);
    if (a < 1 || !Number.isFinite(a)) throw new d(`Invalid concurrency: ${a}. Must be a positive integer.`);
    const i = e.length, c = new Array(i);
    let u = 0, o = 0;
    function f() {
      return __async(this, null, function* () {
        for (; u < i; ) {
          const s = u;
          u += 1;
          const g = __spreadProps(__spreadValues({}, r), {
            // Suppress per-image onProgress to avoid confusion in batch mode
            onProgress: void 0
          });
          c[s] = yield q(e[s], g), o += 1;
          const p = o / i * 100;
          n == null || n(s, i, p);
        }
      });
    }
    const h = Math.min(a, i), l = [];
    for (let s = 0; s < h; s++) l.push(f());
    return yield Promise.all(l), c;
  });
}
function H(_0) {
  return __async(this, arguments, function* (e, t = {}) {
    const a = [];
    t.allowedTypes !== void 0 && (t.allowedTypes.length === 0 ? a.push("No allowed types specified — all types are rejected.") : t.allowedTypes.includes(e.type) || a.push(`File type "${e.type}" is not allowed. Accepted types: ${t.allowedTypes.join(", ")}`)), t.maxFileSize !== void 0 && e.size > t.maxFileSize && a.push(`File size ${e.size} bytes exceeds maximum of ${t.maxFileSize} bytes`);
    let n, r;
    try {
      const i = yield z(e);
      n = i.width, r = i.height, i.cleanup(), R(n, r, t, a);
    } catch {
      a.push("Failed to load image for dimension validation");
    }
    return {
      valid: a.length === 0,
      width: n,
      height: r,
      errors: a
    };
  });
}
function R(e, t, a, n) {
  if (a.minSize) {
    const [r, i] = a.minSize;
    (e < r || t < i) && n.push(`Image dimensions ${e}x${t} are below minimum ${r}x${i}`);
  }
  if (a.maxSize) {
    const [r, i] = a.maxSize;
    (e > r || t > i) && n.push(`Image dimensions ${e}x${t} exceed maximum ${r}x${i}`);
  }
}
function Q(_0) {
  return __async(this, arguments, function* (e, t = {}) {
    const a = yield H(e, t);
    if (!a.valid) throw new B(a.errors.join("; "));
  });
}
var F = null;
var $ = null;
function C(e) {
  try {
    const t = document.createElement("canvas");
    return t.width = 1, t.height = 1, t.toDataURL(e).startsWith(`data:${e}`);
  } catch {
    return false;
  }
}
function V() {
  return F === null && (F = C("image/webp")), F;
}
function J() {
  return $ === null && ($ = C("image/avif")), $;
}
function Y() {
  return J() ? "image/avif" : V() ? y.WEBP : y.JPEG;
}
export {
  y as ImageMimeType,
  d as ImageProcessingError,
  B as ImageValidationError,
  O as ResizeFilter,
  q as compressImage,
  X as compressImages,
  Z as destroyPica,
  Y as getBestImageFormat,
  z as loadImage,
  _ as preloadPica,
  J as supportsAvif,
  V as supportsWebp,
  H as validateImage,
  Q as validateImageOrThrow
};
//# sourceMappingURL=snapblob_image.js.map
