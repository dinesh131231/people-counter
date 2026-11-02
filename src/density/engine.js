import * as ort from "onnxruntime-web";
import wasmUrl from "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm?url";
import mjsUrl from "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs?url";
import { DENSITY_MODEL_URL, DENSITY_LONG_SIDE } from "../config";

ort.env.wasm.wasmPaths = { wasm: wasmUrl, mjs: mjsUrl };
ort.env.wasm.numThreads = 1; // avoids needing special cross-origin headers

let sessionPromise;

export function loadDensityModel() {
  if (!sessionPromise) {
    sessionPromise = ort.InferenceSession.create(DENSITY_MODEL_URL, {
      executionProviders: ["wasm"],
    });
  }
  return sessionPromise;
}

const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];
const tmp = document.createElement("canvas");
const tctx = tmp.getContext("2d", { willReadFrequently: true });

// Resize keeping the aspect ratio; both sides must be a multiple of 16.
function toInput(canvas, longSide) {
  const s = longSide / Math.max(canvas.width, canvas.height);
  const w = Math.max(16, Math.round((canvas.width * s) / 16) * 16);
  const h = Math.max(16, Math.round((canvas.height * s) / 16) * 16);
  tmp.width = w;
  tmp.height = h;
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(canvas, 0, 0, w, h);

  const { data } = tctx.getImageData(0, 0, w, h);
  const n = w * h;
  const f = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    f[i] = (data[i * 4] / 255 - MEAN[0]) / STD[0];
    f[n + i] = (data[i * 4 + 1] / 255 - MEAN[1]) / STD[1];
    f[2 * n + i] = (data[i * 4 + 2] / 255 - MEAN[2]) / STD[2];
  }
  return { tensor: new ort.Tensor("float32", f, [1, 3, h, w]), w, h };
}

export async function countDensity(canvas, longSide = DENSITY_LONG_SIDE) {
  const session = await loadDensityModel();
  const t0 = performance.now();

  const { tensor, w, h } = toInput(canvas, longSide);
  const out = await session.run({ image: tensor });
  const d = out.density; // shape [1, 1, h/8, w/8]

  let sum = 0;
  for (let i = 0; i < d.data.length; i++) sum += d.data[i];

  return {
    count: sum,
    density: d.data,
    dw: d.dims[3],
    dh: d.dims[2],
    debug: {
      inputSize: `${w}x${h}`,
      densityMap: `${d.dims[3]}x${d.dims[2]}`,
      rawCount: Number(sum.toFixed(1)),
      totalMs: Math.round(performance.now() - t0),
    },
  };
}