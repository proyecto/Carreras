"use strict";
// Componente HUD: Torre de clasificación
const _fmtLap = (sec) => {
  if (!sec || sec <= 0) return "-:--.--";
  const cs = Math.min(59999, Math.round(sec * 100));
  const m = (cs / 6000) | 0,
    sc = ((cs / 100) | 0) % 60,
    cc = cs % 100;
  return m + ":" + (sc < 10 ? "0" : "") + sc + "." + (cc < 10 ? "0" : "") + cc;
};
const HudLeaderboardTower = {
  draw(p, r, Hh, W, allCars = [], totalLaps = null) {
    if (!p || !allCars || !allCars.length) return;

    const getTextWidth = (ctx, txt, fallbackW) => {
      if (ctx && typeof ctx.measureText === "function") {
        const m = ctx.measureText(txt);
        if (m && typeof m.width === "number") return m.width;
      }
      return fallbackW || (txt || "").length * 8;
    };

    const padX = Math.round(r * 0.12);
    const headerH = Math.round(r * 0.32);
    const rowsStartY = Math.round(r * 0.2);
    const rowStepY = Math.round(r * 0.46);
    const cardH = Math.round(r * 0.42);
    const cardW = W - padX * 2;
    const cardX = padX;

    const maxPossibleRows = Math.max(
      1,
      Math.floor((Hh - rowsStartY - Math.round(r * 0.04)) / rowStepY),
    );
    const numRows = Math.min(maxPossibleRows, allCars.length);
    const boxH = Math.min(
      Hh,
      rowsStartY + numRows * rowStepY + Math.round(r * 0.04),
    );

    p.clearRect(0, 0, W, Hh);

    // Fondo de cristal translúcido oscuro
    p.beginPath();
    if (typeof p.roundRect === "function") {
      p.roundRect(0, 0, W, boxH, Math.round(r * 0.14));
    } else {
      p.rect(0, 0, W, boxH);
    }
    p.fillStyle = "rgba(9, 11, 14, 0.78)";
    p.fill();
    p.lineWidth = Math.max(1, Math.round(r * 0.016));
    p.strokeStyle = "rgba(255, 255, 255, 0.16)";
    p.stroke();

    // 1. Título superior del panel
    p.textAlign = "left";
    p.textBaseline = "top";
    p.font =
      "700 " +
      Math.round(r * 0.082) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    p.fillStyle = "rgba(255, 255, 255, 0.45)";
    p.fillText("CLASIFICACIÓN", padX, Math.round(r * 0.08));

    p.textAlign = "right";
    p.font =
      "700 " +
      Math.round(r * 0.075) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    p.fillStyle = "rgba(255, 255, 255, 0.55)";
    const carsCountText =
      allCars.length + (allCars.length === 1 ? " COCHE" : " COCHES");
    p.fillText(carsCountText, W - padX, Math.round(r * 0.085));

    // Línea divisoria superior
    const divY = Math.round(r * 0.175);
    p.beginPath();
    p.moveTo(Math.round(r * 0.1), divY);
    p.lineTo(W - Math.round(r * 0.1), divY);
    p.strokeStyle = "rgba(255, 255, 255, 0.12)";
    p.lineWidth = Math.max(1, Math.round(r * 0.01));
    p.stroke();

    // 2. Tarjetas de clasificación (3 líneas por participante, letra más grande)
    const fL1 = Math.round(r * 0.112);
    const fCar = Math.round(r * 0.098);
    const fLbl = Math.round(r * 0.084);
    const fTime = Math.round(r * 0.098);
    const cardH3 = cardH;
    const rowStep3 = rowStepY;

    for (let i = 0; i < numRows; i++) {
      const c = allCars[i];
      const ry = rowsStartY + i * rowStep3;
      if (ry + cardH3 > Hh) break;

      // Fondo y borde de tarjeta individual
      p.beginPath();
      if (typeof p.roundRect === "function") {
        p.roundRect(cardX, ry, cardW, cardH3, Math.round(r * 0.04));
      } else {
        p.rect(cardX, ry, cardW, cardH3);
      }

      if (c.isPlayer) {
        p.fillStyle = "rgba(255, 90, 54, 0.16)";
        p.fill();
        p.strokeStyle = "rgba(255, 90, 54, 0.45)";
        p.lineWidth = Math.max(1, Math.round(r * 0.012));
        p.stroke();

        // Barra de acento lateral del jugador
        p.fillStyle = "#ff5a36";
        if (typeof p.fillRect === "function") {
          p.fillRect(
            cardX,
            ry + Math.round(r * 0.04),
            Math.max(2, Math.round(r * 0.024)),
            cardH3 - Math.round(r * 0.08),
          );
        } else {
          p.beginPath();
          p.rect(
            cardX,
            ry + Math.round(r * 0.04),
            Math.max(2, Math.round(r * 0.024)),
            cardH3 - Math.round(r * 0.08),
          );
          p.fill();
        }
      } else {
        p.fillStyle =
          i % 2 === 0
            ? "rgba(255, 255, 255, 0.04)"
            : "rgba(255, 255, 255, 0.02)";
        p.fill();
        p.strokeStyle = "rgba(255, 255, 255, 0.07)";
        p.lineWidth = Math.max(1, Math.round(r * 0.01));
        p.stroke();
      }

      const xLeftStart = cardX + Math.round(r * (c.isPlayer ? 0.065 : 0.045));
      const xRightEnd = cardX + cardW - Math.round(r * 0.045);

      // --- FILA 1: Posición + Piloto ---
      const line1Y = ry + Math.round(r * 0.035);
      p.textAlign = "left";
      p.textBaseline = "top";

      const posStr = "P" + (i + 1);
      const posCol =
        i === 0
          ? "#facc15"
          : i === 1
            ? "#cbd5e1"
            : i === 2
              ? "#f59e0b"
              : "rgba(255, 255, 255, 0.60)";
      p.font = "800 " + fL1 + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      p.fillStyle = posCol;
      p.fillText(posStr, xLeftStart, line1Y);
      const posW = getTextWidth(p, posStr + " ", fL1 * 0.65);

      const driverName =
        c.driverName || (c.isPlayer ? "TÚ" : `Rival #${i + 1}`);
      p.font =
        (c.isPlayer ? "800 " : "700 ") +
        fL1 +
        'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      p.fillStyle = c.isPlayer ? "#ff5a36" : "#ffffff";
      p.fillText(driverName, xLeftStart + posW, line1Y);

      // --- FILA 2: Coche ---
      const line2Y = ry + Math.round(r * 0.17);
      let carStr = c.carName || "GT3";
      p.font = "600 " + fCar + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      p.fillStyle = c.isPlayer
        ? "rgba(255, 255, 255, 0.90)"
        : "rgba(255, 255, 255, 0.68)";
      const maxCarW = Math.max(Math.round(r * 0.3), xRightEnd - xLeftStart);
      if (getTextWidth(p, carStr, fCar * 0.6) > maxCarW) {
        while (
          carStr.length > 3 &&
          getTextWidth(p, carStr + "…", fCar * 0.6) > maxCarW
        ) {
          carStr = carStr.slice(0, -1);
        }
        carStr += "…";
      }
      p.fillText(carStr, xLeftStart, line2Y);

      // --- FILA 3: ACTUAL, MEJOR y ÚLTIMA ---
      const line3Y = ry + Math.round(r * 0.29);
      const fLbl3 = Math.round(r * 0.084);
      const fTime3 = Math.round(r * 0.098);

      // ACTUAL (izquierda)
      p.textAlign = "left";
      p.font =
        "700 " + fLbl3 + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      p.fillStyle = "rgba(255, 255, 255, 0.45)";
      p.fillText("ACT ", xLeftStart, line3Y);
      const actLblW = getTextWidth(p, "ACT ", fLbl3 * 0.6);
      p.font =
        "700 " + fTime3 + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      p.fillStyle = c.curLap >= 0 ? "#ffffff" : "rgba(255, 255, 255, 0.40)";
      p.fillText(
        _fmtLap(c.curLap !== undefined ? c.curLap : -1),
        xLeftStart + actLblW,
        line3Y,
      );

      // MEJOR (centro)
      const midX = xLeftStart + Math.round((xRightEnd - xLeftStart) * 0.44);
      p.textAlign = "left";
      p.font =
        "700 " + fLbl3 + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      p.fillStyle = "rgba(255, 255, 255, 0.45)";
      p.fillText("MEJOR", midX, line3Y);
      const mejorLblW = getTextWidth(p, "MEJOR ", fLbl3 * 0.6);
      p.font =
        "700 " + fTime3 + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      p.fillStyle = c.bestLap > 0 ? "#c084fc" : "rgba(255, 255, 255, 0.40)";
      p.fillText(_fmtLap(c.bestLap), midX + mejorLblW, line3Y);

      // ÚLTIMA (derecha)
      p.textAlign = "right";
      p.font =
        "700 " + fTime3 + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      p.fillStyle =
        c.lastLap > 0
          ? "rgba(255, 255, 255, 0.90)"
          : "rgba(255, 255, 255, 0.40)";
      const lastTimeStr = _fmtLap(c.lastLap);
      p.fillText(lastTimeStr, xRightEnd, line3Y);
      const lastTimeW = getTextWidth(p, " " + lastTimeStr, fTime3 * 0.6);

      p.font =
        "700 " + fLbl3 + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
      p.fillStyle = "rgba(255, 255, 255, 0.45)";
      p.fillText("ÚLTIMA", xRightEnd - lastTimeW, line3Y);
    }
  },
};

if (typeof window !== "undefined")
  window.HudLeaderboardTower = HudLeaderboardTower;
if (typeof module !== "undefined" && module.exports)
  module.exports = HudLeaderboardTower;
