export function drawBoxes(ctx, boxes, color = "#00e676") {
  ctx.lineWidth = Math.max(2, ctx.canvas.width / 400);
  ctx.strokeStyle = color;
  for (const b of boxes) {
    ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
  }
}
export function drawTiles(ctx, tiles) {
  const colors = ["#ff5252", "#448aff", "#ffd740", "#e040fb"];
  ctx.lineWidth = Math.max(1, ctx.canvas.width / 800);
  tiles.forEach(([x, y, w, h], i) => {
    ctx.strokeStyle = colors[i % colors.length];
    ctx.strokeRect(x, y, w, h);
  });
}

export function drawHeatmap(ctx, density, dw, dh, alpha = 0.55) {
  let max = 1e-6;
  for (let i = 0; i < density.length; i++) if (density[i] > max) max = density[i];

  const small = document.createElement("canvas");
  small.width = dw;
  small.height = dh;
  const sctx = small.getContext("2d");
  const img = sctx.createImageData(dw, dh);

  for (let i = 0; i < density.length; i++) {
    const t = Math.min(1, density[i] / max);
    img.data[i * 4] = Math.round(255 * Math.min(1, t * 2));            // red
    img.data[i * 4 + 1] = Math.round(255 * (t < 0.5 ? t * 2 : 2 - t * 2)); // green
    img.data[i * 4 + 2] = Math.round(255 * Math.max(0, 1 - t * 2));    // blue
    img.data[i * 4 + 3] = t < 0.05 ? 0 : Math.round(255 * alpha);      // hide empty areas
  }
  sctx.putImageData(img, 0, 0);
  ctx.drawImage(small, 0, 0, ctx.canvas.width, ctx.canvas.height);
}