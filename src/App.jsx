import { useEffect, useRef, useState } from "react";
import DebugPage from "./DebugPage";
import { startCamera, stopCamera, grabFrame } from "./camera";
import { loadDensityModel, countDensity } from "./density/engine";
// import { drawHeatmap } from "./draw";

const ESTIMATE_FROM = 40; // from this count on, show the number as an estimate

export default function App() {
  const debug = new URLSearchParams(window.location.search).has("debug");
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (debug) return;
    let stream;
    let cancelled = false;
    (async () => {
      try {
        stream = await startCamera(videoRef.current);
        if (cancelled) return stopCamera(stream);
        await loadDensityModel();
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(String(e.message || e));
      }
    })();
    return () => {
      cancelled = true;
      stopCamera(stream);
    };
  }, [debug]);

  async function handleCount() {
    if (result) {
      setResult(null); // back to the live camera
      return;
    }
    setError("");
    const canvas = canvasRef.current;
    grabFrame(videoRef.current, canvas); // freeze this exact frame
    setBusy(true);
    await new Promise((r) => setTimeout(r, 50)); // let "Counting…" paint first
    try {
      const r = await countDensity(canvas);
      // drawHeatmap(canvas.getContext("2d"), r.density, r.dw, r.dh);
      setResult({ count: Math.round(r.count) });
    } catch (e) {
      console.error(e);
      setError(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  if (debug) return <DebugPage />;

  const frozen = busy || !!result;
  const isEstimate = result && result.count >= ESTIMATE_FROM;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", color: "#fff" }}>
      <video ref={videoRef} playsInline muted
        style={{ width: "100%", height: "100%", objectFit: "contain",
                 display: frozen ? "none" : "block" }} />
      <canvas ref={canvasRef}
        style={{ width: "100%", height: "100%", objectFit: "contain",
                 display: frozen ? "block" : "none" }} />

      {result && (
        <div style={{ position: "absolute", top: 16, left: 0, right: 0, textAlign: "center",
                      textShadow: "0 2px 8px #000" }}>
          <div style={{ fontSize: 48, fontWeight: 700 }}>
            {isEstimate ? "≈ " : ""}{result.count} people
          </div>
          {isEstimate && (
            <div style={{ fontSize: 14, opacity: 0.85 }}>
              Estimate: large crowds can read up to about 20% low
            </div>
          )}
        </div>
      )}

      {error && (
        <p style={{ position: "absolute", top: 70, left: 16, right: 16, color: "#ff8a80" }}>
          {error}
        </p>
      )}

      <button onClick={handleCount} disabled={!ready || busy}
        style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)",
                 padding: "16px 40px", fontSize: 20, borderRadius: 999, border: "none" }}>
        {!ready ? "Loading…" : busy ? "Counting…" : result ? "Count again" : "Count"}
      </button>
    </div>
  );
}