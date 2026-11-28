"use strict";
// Renderizado del minimapa, curva y radar
function hudDrawMinimap() {
  const H = HUD,
    m = H.m,
    trk = typeof TRK !== "undefined" ? TRK : null;
  if (!H.cm || !m || !H.bgMap || !trk || trk.N < 2) return;
  const W = H.cm.width,
    Hh = H.cm.height,
    r = H.L[3];
  const curM = typeof VEH !== "undefined" ? VEH.s : 0;
  const curTrackS = ((curM % trk.L) + trk.L) % trk.L;

  const yS1 = Math.round(r * 0.9);
  const yS2 = Math.round(r * 1.42);

  m.clearRect(0, 0, W, Hh);
  m.drawImage(H.bgMap, 0, 0);

  // Datos de tiempos de vuelta
  const curLapSec =
    typeof LAP !== "undefined" && LAP[3] === 1 && typeof VEH !== "undefined"
      ? Math.max(0, VEH.time - LAP[0])
      : 0;
  const lastLapSec = typeof LAP !== "undefined" && LAP[1] > 0 ? LAP[1] : -1;
  const bestLapSec = typeof LAP !== "undefined" && LAP[2] > 0 ? LAP[2] : -1;
  const lapCount =
    typeof VEH !== "undefined" && VEH.laps !== undefined ? VEH.laps : 0;

  // Lista de rivales para minimapa (exclusivamente modelos reales)
  const rivals = [];
  if (typeof GAME !== "undefined" && GAME.rivalEnabled === false) {
    // Modo práctica en solitario: sin rivales
  } else if (
    typeof gridManagerInstance !== "undefined" &&
    gridManagerInstance.rivals &&
    gridManagerInstance.rivals.length
  ) {
    for (const rCar of gridManagerInstance.rivals) {
      if (rCar.veh) rivals.push(rCar);
    }
  } else if (
    typeof VEH_RIVAL !== "undefined" &&
    typeof CARS !== "undefined" &&
    CARS.rival
  ) {
    rivals.push({
      veh: VEH_RIVAL,
      name: CARS.rival.name || "RIVAL",
      col: CARS.rival.accent || "#38bdf8",
    });
  }

  // Modo horizontal compacto (pegado debajo del retrovisor: 3 columnas)
  if (W > Hh * 2) {
    const xS1 = Math.round(W * 0.36);
    const xS2 = Math.round(W * 0.68);
    const padX = Math.round(Hh * 0.14);
    const fSm = Math.max(9, Math.round(Hh * 0.14));
    const fMd = Math.max(11, Math.round(Hh * 0.18));
    const fLg = Math.max(13, Math.round(Hh * 0.22));
    const fmtT = (sec) => {
      if (sec < 0) return "-:--.--";
      const cs = Math.min(59999, Math.round(sec * 100));
      const mn = (cs / 6000) | 0,
        sc = ((cs / 100) | 0) % 60,
        cc = cs % 100;
      return `${mn}:${sc < 10 ? "0" : ""}${sc}.${cc < 10 ? "0" : ""}${cc}`;
    };

    // Columna 1: Siguiente curva y nombre
    const corners =
      trk.corners && trk.corners.length
        ? trk.corners
        : (trk.spec && trk.spec.corners) || [];
    let cInfo = null,
      cDist = 0,
      inC = false;
    for (let ci = 0; ci < corners.length; ci++) {
      const c = corners[ci],
        s0 = c.s0 !== undefined ? c.s0 : c.s,
        s1 = c.s1 !== undefined ? c.s1 : s0 + 30;
      if (
        s0 !== undefined &&
        (s0 <= s1
          ? curTrackS >= s0 - 6 && curTrackS <= s1 + 6
          : curTrackS >= s0 - 6 || curTrackS <= s1 + 6)
      ) {
        cInfo = c;
        inC = true;
        break;
      }
    }
    if (!cInfo) {
      let minD = 1e9;
      for (let ci = 0; ci < corners.length; ci++) {
        const c = corners[ci],
          s0 = c.s0 !== undefined ? c.s0 : c.s;
        if (s0 === undefined) continue;
        const d = (s0 - curTrackS + trk.L) % trk.L;
        if (d < minD) {
          minD = d;
          cInfo = c;
          cDist = d;
        }
      }
    }
    m.textBaseline = "top";
    m.font = `700 ${fSm}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
    m.fillStyle = inC ? "#ff5a36" : "rgba(255,255,255,0.6)";
    m.fillText(inC ? "EN CURVA" : "PRÓXIMA CURVA", padX, Math.round(Hh * 0.1));

    const cName = cInfo ? cInfo.name || cInfo.id || "Curva" : "Recta";
    let cDir = cInfo && cInfo.dir ? cInfo.dir : 0;
    if (!cDir && cInfo && trk.k) {
      const sMid = Math.floor(
        ((cInfo.s0 !== undefined ? cInfo.s0 : cInfo.s) || 0) % trk.N,
      );
      const kVal = trk.k[sMid < 0 ? sMid + trk.N : sMid] || 0;
      if (Math.abs(kVal) > 0.001) cDir = kVal > 0 ? 1 : -1;
    }
    const dirTxt = cDir ? (cDir < 0 ? "↰ IZQ" : "↱ DER") : "";
    m.font = `700 ${fLg}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
    m.fillStyle = "#ffffff";
    m.fillText(cName, padX, Math.round(Hh * 0.3), xS1 - padX * 2);

    m.font = `600 ${fMd}px "Helvetica Neue",Helvetica,Arial,sans-serif`;
    m.fillStyle = "#facc15";
    const subC = inC
      ? dirTxt || "EN CURVA"
      : `${dirTxt ? dirTxt + " · " : ""}a ${Math.round(cDist)} m`;
    m.fillText(subC.trim(), padX, Math.round(Hh * 0.62), xS1 - padX * 2);

    // Columna 2: Gráfica radar de la próxima curva (heading-up)
    const radPad = Math.round(Hh * 0.1);
    const radarX = xS1 + radPad;
    const radarY = radPad;
    const radarW = xS2 - xS1 - radPad * 2;
    const radarH = Hh - radPad * 2;
    m.save();
    m.beginPath();
    m.roundRect(radarX, radarY, radarW, radarH, Math.round(Hh * 0.08));
    m.fillStyle = "rgba(7, 11, 17, 0.88)";
    m.fill();
    m.lineWidth = 1;
    m.strokeStyle = "rgba(255, 255, 255, 0.14)";
    m.stroke();
    m.clip();

    const rcx = radarX + radarW * 0.5;
    const rcy = radarY + radarH * 0.82;
    const rScale = (radarH * 0.72) / 160;

    // Arcos guía de distancia
    m.strokeStyle = "rgba(255, 255, 255, 0.08)";
    m.lineWidth = 1;
    for (const distM of [50, 100, 150]) {
      m.beginPath();
      m.arc(rcx, rcy, distM * rScale, Math.PI, 0, false);
      m.stroke();
    }

    // Proyección de la carretera delante del coche
    if (trk.N > 2 && trk.x && trk.z) {
      const i0 = ((Math.floor(curM) % trk.N) + trk.N) % trk.N;
      const i1 = (i0 + 4) % trk.N;
      const fx = trk.x[i1] - trk.x[i0],
        fz = trk.z[i1] - trk.z[i0];
      const fLen = Math.hypot(fx, fz) || 1;
      const ux = fx / fLen,
        uz = fz / fLen;
      const rx = -uz,
        rz = ux;
      const x0 = trk.x[i0],
        z0 = trk.z[i0];

      m.beginPath();
      for (let ds = 0; ds <= 180; ds += 4) {
        const idx = (i0 + ds) % trk.N;
        const dx = trk.x[idx] - x0,
          dz = trk.z[idx] - z0;
        const px = rcx + (dx * rx + dz * rz) * rScale;
        const py = rcy - (dx * ux + dz * uz) * rScale;
        if (ds === 0) m.moveTo(px, py);
        else m.lineTo(px, py);
      }
      m.lineCap = "round";
      m.lineJoin = "round";
      m.lineWidth = Math.max(4, Math.round(Hh * 0.07));
      m.strokeStyle = "rgba(255, 255, 255, 0.22)";
      m.stroke();
      m.lineWidth = Math.max(1.5, Math.round(Hh * 0.025));
      m.strokeStyle = "#facc15";
      m.stroke();
    }

    // Triángulo del coche
    m.beginPath();
    m.moveTo(rcx, rcy - 4);
    m.lineTo(rcx - 3.5, rcy + 3);
    m.lineTo(rcx + 3.5, rcy + 3);
    m.closePath();
    m.fillStyle = "#ff5a36";
    m.fill();
    m.restore();

    // Columna 3: Posición en el minimapa (jugador + rivales)
    const [cX, cZ, midX, midZ, sc] = H.mapTrans;
    if (sc > 0) {
      for (const rv of rivals) {
        if (!rv.veh) continue;
        m.beginPath();
        m.arc(
          cX + (rv.veh.x - midX) * sc,
          cZ + (rv.veh.z - midZ) * sc,
          Math.max(2.5, Hh * 0.035),
          0,
          TAU,
        );
        m.fillStyle = rv.col || "#38bdf8";
        m.fill();
      }
      if (typeof GS !== "undefined") {
        m.beginPath();
        m.arc(
          cX + (GS.cx - midX) * sc,
          cZ + (GS.cz - midZ) * sc,
          Math.max(3.5, Hh * 0.048),
          0,
          TAU,
        );
        m.fillStyle = "#ff5a36";
        m.fill();
        m.lineWidth = 1.5;
        m.strokeStyle = "#ffffff";
        m.stroke();
      }
    }
    return;
  }

  // Delegación modular con HudComponents (Patrón Composite/Component)
  if (typeof HudComponents !== "undefined") {
    // SECCIÓN 1: Aviso de próxima curva oficial (0 a yS1)
    HudComponents.CornerAdvisory.draw(m, r, Hh, W, trk, curM);

    // SECCIÓN 2: Telemetría de cronometraje de vuelta (yS1 a yS2)
    HudComponents.LapTelemetry.draw(m, r, Hh, W, yS1, {
      curTime: curLapSec,
      lastTime: lastLapSec,
      bestTime: bestLapSec,
      lapCount: lapCount,
    });

    // SECCIÓN 3: Minimapa del circuito con radar de rivales (yS2 a Hh)
    const trackName =
      (trk.spec && (trk.spec.name || trk.spec.id)) || "CIRCUITO";
    const distText =
      ((curM * 0.001) % (trk.L * 0.001)).toFixed(1) +
      " / " +
      (trk.L * 0.001).toFixed(1) +
      " km";
    HudComponents.Minimap.draw(
      m,
      r,
      Hh,
      W,
      yS2,
      H.mapTrans,
      [GS.cx, GS.cy, GS.cz],
      rivals,
      typeof VEH !== "undefined" ? VEH.time : 0,
      trackName,
      distText,
    );
    return;
  }

  // ---------------------------------------------------------------------------
  // RUTA DE FALLBACK (en caso de no disponer de HudComponents)
  // ---------------------------------------------------------------------------
  const lookAhead = 650;
  const curS = Math.floor(curM);
  let maxK = 0,
    apexDist = 0,
    apexK = 0;
  if (trk.k) {
    for (let ds = 15; ds < lookAhead; ds += 5) {
      let sIdx = (curS + ds) % trk.N;
      if (sIdx < 0) sIdx += trk.N;
      const k = trk.k[sIdx];
      const absK = Math.abs(k);
      if (absK > maxK) {
        maxK = absK;
        apexK = k;
        apexDist = ds;
      }
    }
  }

  const corners =
    trk.corners && trk.corners.length
      ? trk.corners
      : (trk.spec && trk.spec.corners) || [];
  let inCorner = null,
    nextCorner = null,
    minNextDist = 1e9;
  for (let ci = 0; ci < corners.length; ci++) {
    const c = corners[ci];
    const s0 = c.s0 !== undefined ? c.s0 : c.s;
    const s1 = c.s1 !== undefined ? c.s1 : s0 !== undefined ? s0 + 30 : 0;
    if (s0 !== undefined && s1 !== undefined) {
      if (s0 <= s1) {
        if (curTrackS >= s0 - 6 && curTrackS <= s1 + 6) {
          inCorner = c;
          break;
        }
      } else {
        if (curTrackS >= s0 - 6 || curTrackS <= s1 + 6) {
          inCorner = c;
          break;
        }
      }
    }
  }
  if (!inCorner) {
    for (let ci = 0; ci < corners.length; ci++) {
      const c = corners[ci];
      const cS = c.s0 !== undefined ? c.s0 : c.s;
      if (cS === undefined) continue;
      const distToS0 = (cS - curTrackS + trk.L) % trk.L;
      if (distToS0 > 0 && distToS0 < minNextDist && distToS0 < 650) {
        minNextDist = distToS0;
        nextCorner = c;
      }
    }
  }

  const padX = Math.round(r * 0.14);
  m.textAlign = "left";
  m.textBaseline = "top";

  // 1. Curva (Sección 1)
  m.font =
    "600 " +
    Math.round(r * 0.075) +
    'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  m.fillStyle = "rgba(255, 255, 255, 0.45)";
  m.fillText(
    inCorner
      ? "EN CURVA"
      : nextCorner || maxK > 0.0035
        ? "PRÓXIMA CURVA"
        : "TRAMO ACTUAL",
    padX,
    Math.round(r * 0.075),
  );

  let cornerTitle = "RECTA";
  let titleColor = "#ffffff";
  if (inCorner) {
    cornerTitle = inCorner.name ? inCorner.name.toUpperCase() : "EN CURVA";
    titleColor = "#facc15";
  } else if (nextCorner) {
    cornerTitle = nextCorner.name
      ? nextCorner.name.toUpperCase()
      : "CURVA ADELANTE";
    titleColor = "#38bdf8";
  } else if (maxK > 0.0035) {
    cornerTitle = "CURVA ADELANTE";
    titleColor = "rgba(255, 255, 255, 0.90)";
  }

  let titleFontSz = Math.round(r * 0.125);
  m.font =
    "800 " + titleFontSz + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  if (typeof m.measureText === "function") {
    const maxTitleW = W - padX * 2;
    while (titleFontSz > 7 && m.measureText(cornerTitle).width > maxTitleW) {
      titleFontSz -= 0.5;
      m.font =
        "800 " + titleFontSz + 'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    }
  }
  m.fillStyle = titleColor;
  m.fillText(cornerTitle, padX, Math.round(r * 0.18));

  if (inCorner) {
    const k =
      inCorner.k !== undefined
        ? inCorner.k
        : inCorner.ang !== undefined
          ? inCorner.ang >= 0
            ? 1
            : -1
          : trk.k
            ? trk.k[curS % trk.N]
            : 0;
    const isRight = k >= 0;
    const radius = Math.round(inCorner.R || (maxK > 0 ? 1 / maxK : 60));
    const arrow = isRight
      ? radius < 55
        ? "⤹ R"
        : "↱ R"
      : radius < 55
        ? "⤸ L"
        : "↰ L";
    const badgeColor =
      radius < 55 ? "#ef4444" : radius < 95 ? "#facc15" : "#4ade80";
    m.fillStyle = badgeColor;
    m.font =
      "700 " +
      Math.round(r * 0.098) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillText(
      arrow + " EN EL ÁPICE · R " + radius + "m",
      padX,
      Math.round(r * 0.32),
    );
  } else if (nextCorner) {
    const k =
      nextCorner.k !== undefined
        ? nextCorner.k
        : nextCorner.ang !== undefined
          ? nextCorner.ang >= 0
            ? 1
            : -1
          : apexK;
    const isRight = k >= 0;
    const radius = Math.round(nextCorner.R || (maxK > 0 ? 1 / maxK : 60));
    const distM = Math.round(minNextDist);
    const arrow = isRight
      ? radius < 55
        ? "⤹ R"
        : "↱ R"
      : radius < 55
        ? "⤸ L"
        : "↰ L";
    const badgeColor =
      radius < 55 ? "#ef4444" : radius < 95 ? "#facc15" : "#4ade80";
    m.fillStyle = badgeColor;
    m.font =
      "700 " +
      Math.round(r * 0.098) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillText(
      arrow + " A " + distM + "m · R " + radius + "m",
      padX,
      Math.round(r * 0.32),
    );
  } else if (maxK > 0.0035) {
    const isRight = apexK >= 0;
    const radius = Math.round(1 / maxK);
    const arrow = isRight
      ? radius < 55
        ? "⤹ R"
        : "↱ R"
      : radius < 55
        ? "⤸ L"
        : "↰ L";
    const badgeColor =
      radius < 55 ? "#ef4444" : radius < 95 ? "#facc15" : "#4ade80";
    m.fillStyle = badgeColor;
    m.font =
      "700 " +
      Math.round(r * 0.098) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillText(
      arrow + " A " + apexDist + "m · R " + radius + "m",
      padX,
      Math.round(r * 0.32),
    );
  } else {
    m.fillStyle = "#4ade80";
    m.font =
      "700 " +
      Math.round(r * 0.095) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillText("GAS A FONDO", padX, Math.round(r * 0.32));
  }

  // 2. Telemetría de vueltas (Sección 2)
  m.font =
    "600 " +
    Math.round(r * 0.075) +
    'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  m.fillStyle = "rgba(255, 255, 255, 0.45)";
  m.fillText("TIEMPOS DE VUELTA", padX, yS1 + Math.round(r * 0.075));
  m.textAlign = "right";
  m.font =
    "700 " +
    Math.round(r * 0.075) +
    'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  const totalLaps =
    typeof GAME !== "undefined" && GAME.totalLaps ? GAME.totalLaps : null;
  const isFinished = totalLaps && lapCount >= totalLaps;
  const lapNum = isFinished ? totalLaps : lapCount + 1;
  const lapTxt = isFinished
    ? "META · " + totalLaps + "/" + totalLaps
    : "VUELTA " + lapNum + (totalLaps ? " / " + totalLaps : "");
  m.fillStyle = isFinished ? "#4ade80" : "#ff5a36";
  m.fillText(lapTxt, W - padX, yS1 + Math.round(r * 0.075));

  const fmtTime = (s) => {
    if (s === undefined || s === null || s < 0) return "-:--.--";
    const totalCs = Math.round(s > 10000 ? s : s * 100);
    if (totalCs <= 0) return "0:00.00";
    const min = Math.floor(totalCs / 6000),
      sec = Math.floor((totalCs % 6000) / 100),
      cs = Math.floor(totalCs % 100);
    return `${min}:${sec < 10 ? "0" : ""}${sec}.${cs < 10 ? "0" : ""}${cs}`;
  };
  const rowStep = Math.round(r * 0.105);
  const rowY0 = yS1 + Math.round(r * 0.175);
  const tRows = [
    { label: "VUELTA", time: curLapSec, col: "#ffffff" },
    { label: "ÚLTIMA", time: lastLapSec, col: "rgba(255, 255, 255, 0.85)" },
    { label: "MEJOR", time: bestLapSec, col: "#c084fc" },
  ];
  for (let i = 0; i < tRows.length; i++) {
    const ry = rowY0 + i * rowStep;
    m.textAlign = "left";
    m.font =
      "700 " +
      Math.round(r * 0.082) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillStyle = "rgba(255, 255, 255, 0.50)";
    m.fillText(tRows[i].label, padX, ry);
    m.textAlign = "right";
    m.font =
      "800 " +
      Math.round(r * 0.092) +
      'px "Helvetica Neue",Helvetica,Arial,sans-serif';
    m.fillStyle = tRows[i].col;
    m.fillText(fmtTime(tRows[i].time), W - padX, ry);
  }

  // 3. Radar Minimapa (Sección 3 ampliada)
  const trackTitle = (trk.spec && (trk.spec.name || trk.spec.id)) || "CIRCUITO";
  m.textAlign = "left";
  m.font =
    "600 " +
    Math.round(r * 0.075) +
    'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  m.fillStyle = "rgba(255, 255, 255, 0.45)";
  m.fillText("CIRCUITO", padX, yS2 + Math.round(r * 0.075));
  m.textAlign = "right";
  m.font =
    "700 " +
    Math.round(r * 0.075) +
    'px "Helvetica Neue",Helvetica,Arial,sans-serif';
  m.fillStyle = "rgba(255, 255, 255, 0.55)";
  m.fillText(trackTitle.toUpperCase(), W - padX, yS2 + Math.round(r * 0.075));

  const cX = H.mapTrans[0],
    cZ = H.mapTrans[1];
  const midTrackX = H.mapTrans[2],
    midTrackZ = H.mapTrans[3];
  const scale = H.mapTrans[4];
  const px = cX + (GS.cx - midTrackX) * scale;
  const py = cZ + (GS.cz - midTrackZ) * scale;

  m.beginPath();
  m.arc(px, py, Math.max(2, r * 0.038), 0, TAU);
  m.fillStyle = "#ff5a36";
  m.fill();
}

// Renderiza la tabla de clasificación en el panel derecho (#hp)
