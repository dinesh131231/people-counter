import { useEffect, useRef, useState } from "react";
import { countDensity } from "./density/engine";
import { drawHeatmap } from "./draw";
import { DENSITY_LONG_SIDE } from "./config";

export default function DebugPage() {
  const canvasRef = useRef(null);
  const bmpRef = useRef(null);
  const [longSide, setLongSide] = useState(DENSITY_LONG_SIDE);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showHeat, setShowHeat] = useState(true);

  async function analyse() {
    const bmp = bmpRef.current;
    if (!bmp) return;
    setBusy(true);
    setError("");
    setResult(null);
    await new Promise((r) => setTimeout(r, 50)); // let "Counting…" paint first
    try {
      const canvas = canvasRef.current;
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext("2d").drawImage(bmp, 0, 0);
      setResult(await countDensity(canvas, longSide));
    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    bmpRef.current = await createImageBitmap(file);
    analyse();
  }

  useEffect(() => {
    if (!result || !bmpRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.drawImage(bmpRef.current, 0, 0);
    if (showHeat) drawHeatmap(ctx, result.density, result.dw, result.dh);
  }, [result, showHeat]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Debug: count people in an image</h2>
      <label>
        Input long side:{" "}
        <select value={longSide} onChange={(e) => setLongSide(+e.target.value)} disabled={busy}>
          {[512, 768, 1024, 1280].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>{" "}
      <input type="file" accept="image/*" onChange={onFile} disabled={busy} />{" "}
      <button onClick={analyse} disabled={busy || !bmpRef.current}>Run again</button>

      {busy && <p>Counting…</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {result && (
        <>
          <h1>Count: {Math.round(result.count)}</h1>
          <label>
            <input type="checkbox" checked={showHeat}
              onChange={(e) => setShowHeat(e.target.checked)} /> Show heatmap
          </label>
          <pre>{JSON.stringify(result.debug, null, 2)}</pre>
        </>
      )}
      <canvas ref={canvasRef} style={{ maxWidth: "100%", marginTop: 12 }} />
    </div>
  );
}