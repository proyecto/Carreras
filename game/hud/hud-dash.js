"use strict";
// Display cockpit Porsche DDU (#hdash)
function hudDrawDash() {
  const H = HUD,
    d = H.dash;
  if (!H.cdash || !d) return;
  const W = H.cdash.width,
    Hh = H.cdash.height;
  d.clearRect(0, 0, W, Hh);

  const sx = W / 340,
    sy = Hh / 203;
  d.save();
  d.scale(sx, sy);

  // Franja superior transparente (0..48): 16 LEDs de RPM encima de PORSCHE
  const rpm = typeof VEH !== "undefined" && VEH.rpm ? VEH.rpm : 0;
  const maxRpm =
    typeof CARS !== "undefined" &&
    CARS.active &&
    CARS.active.hud &&
    CARS.active.hud.maxRpm
      ? CARS.active.hud.maxRpm * 1000
      : 9000;
  const rpmRatio = Math.max(
    0,
    Math.min(1, (rpm - 2000) / Math.max(1000, maxRpm - 2000)),
  );
  const nLeds = 16;
  const litLeds = Math.round(rpmRatio * nLeds);
  for (let li = 0; li < nLeds; li++) {
    const lx = 74 + li * 14.2;
    const on = li < litLeds;
    const col = li < 5 ? "#38bdf8" : li < 11 ? "#22c55e" : "#ef4444";
    d.beginPath();
    d.arc(lx, 5, 3.2, 0, Math.PI * 2);
    d.fillStyle = on ? col : "rgba(255,255,255,0.06)";
    d.fill();
  }

  // Desplazar el DDU negro debajo de PORSCHE (y = 48)
  d.translate(0, 48);
  d.fillStyle = "#05080f";
  d.fillRect(0, 0, 340, 155);

  const box = (x, y, w, h, stroke, fill) => {
    if (fill) {
      d.fillStyle = fill;
      d.fillRect(x, y, w, h);
    }
    d.strokeStyle = stroke;
    d.lineWidth = 1.2;
    d.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  };
  const txt = (str, x, y, font, col, align = "left") => {
    d.font = font;
    d.fillStyle = col;
    d.textAlign = align;
    d.textBaseline = "middle";
    d.fillText(str, x, y);
  };

  // Cabecera: RACE 1 + Velocidad + Lap + DRY
  txt("RACE 1", 12, 13, "700 10px monospace", "#ef4444", "left");
  box(134, 4, 72, 20, "#38bdf8", "#0a1220");
  const kmh = typeof GS !== "undefined" ? Math.round(GS.speed * 3.6) : 0;
  txt(String(kmh), 170, 14, "700 15px monospace", "#ffffff", "center");

  box(212, 5, 58, 16, "#38bdf8", "#0a1220");
  const lapN =
    typeof VEH !== "undefined" && VEH.laps !== undefined ? VEH.laps + 1 : 1;
  txt(`Lap  ${lapN}`, 241, 13, "700 10px monospace", "#ffffff", "center");
  box(286, 5, 42, 16, "#64748b", "#0a1220");
  txt("DRY", 307, 13, "700 10px monospace", "#e2e8f0", "center");

  // Columna izquierda: MAP / AC / THR / FC1
  const leftItems = [
    ["MAP", "4", "#22c55e"],
    ["AC", "0", "#38bdf8"],
    ["THR", "2", "#eab308"],
    ["FC1", "1", "#38bdf8"],
  ];
  leftItems.forEach(([lbl, val, col], idx) => {
    const y = 28 + idx * 22;
    box(8, y, 48, 19, col, "#08101c");
    txt(lbl, 13, y + 9.5, "700 9.5px monospace", "#cbd5e1", "left");
    txt(val, 51, y + 9.5, "700 10px monospace", "#ffffff", "right");
  });

  // Temperaturas y presiones
  const temps = [
    ["Oil temp", "25.0"],
    ["Oil press", "0.00"],
    ["Water temp", "23.00"],
    ["Water press", "0.4"],
  ];
  box(58, 28, 74, 86, "#38bdf8", "#0c192c");
  temps.forEach(([lbl, val], idx) => {
    const y = 38 + idx * 21;
    txt(lbl, 60, y, "600 7px sans-serif", "#bae6fd", "left");
    txt(val, 130, y, "700 9px monospace", "#ffffff", "right");
  });

  // Centro: Marcha gigante
  box(134, 28, 72, 80, "#38bdf8", "#060c16");
  const gVal = typeof VEH !== "undefined" ? VEH.gear : 0;
  const gStr = gVal < 0 ? "R" : gVal === 0 ? "N" : String(gVal);
  txt(gStr, 170, 70, "700 54px sans-serif", "#ffffff", "center");

  // Derecha: Laptime + Outlap + Brake Bias
  box(210, 28, 102, 42, "#38bdf8", "#0c192c");
  txt("Laptime", 261, 35, "600 8px sans-serif", "#bae6fd", "center");
  const curLap =
    typeof LAP !== "undefined" && LAP[3] === 1 && typeof VEH !== "undefined"
      ? Math.max(0, VEH.time - LAP[0])
      : 0;
  const cs = Math.min(59999, Math.round(curLap * 100));
  const mn = (cs / 6000) | 0,
    sc = ((cs / 100) | 0) % 60,
    cc = cs % 100;
  const tStr = `${mn}:${sc < 10 ? "0" : ""}${sc}.${cc < 10 ? "0" : ""}${cc}`;
  txt(tStr, 261, 54, "700 17px monospace", "#ffffff", "center");

  box(210, 72, 102, 34, "#38bdf8", "#08101c");
  txt(
    "Time Diff   Pred. Time",
    261,
    79,
    "600 7.5px sans-serif",
    "#94a3b8",
    "center",
  );
  txt("Outlap", 261, 94, "700 11px sans-serif", "#ffffff", "center");

  box(210, 114, 102, 20, "#38bdf8", "#0c192c");
  txt("Brake Bias", 216, 124, "600 8.5px sans-serif", "#bae6fd", "left");
  txt("0.50", 306, 124, "700 11px monospace", "#ffffff", "right");

  // Inferior izquierda: TC-LA, TC-LO, ABS
  const tcLvl =
    typeof VEH !== "undefined" && VEH.tcLevel !== undefined ? VEH.tcLevel : 3;
  box(58, 117, 46, 17, "#ef4444", "#08101c");
  txt(`TC-LA ${tcLvl}`, 81, 125.5, "700 8.5px monospace", "#ffffff", "center");
  box(106, 117, 46, 17, "#22c55e", "#08101c");
  txt("TC-LO 0", 129, 125.5, "700 8.5px monospace", "#ffffff", "center");
  box(82, 136, 46, 15, "#3b82f6", "#08101c");
  txt("ABS 0", 105, 143.5, "700 8.5px monospace", "#ffffff", "center");

  // Inferior centro: TYRE 6.30
  box(154, 111, 52, 39, "#eab308", "#08101c");
  txt("TYRE", 180, 117, "700 8px sans-serif", "#facc15", "center");
  txt("6.30  6.30", 180, 129, "700 8.5px monospace", "#ffffff", "center");
  txt("6.30  6.30", 180, 141, "700 8.5px monospace", "#ffffff", "center");

  d.restore();
}
