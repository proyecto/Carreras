// ---- world/props-vegas.js ----
// Circuito Urbano Nocturno de F1 de Las Vegas:
// 1. Túnel de contención continuo e infranqueable de Muro Jersey (1m) + Catch Fencing FIA (3,5m).
// 2. Escapatorias urbanas de asfalto pintado (C1, C5, C12, C14) con barreras Tecpro (rojo/blanco).
// 3. Pintura en el asfalto de la pista antes de C14: texto gigante "LAS VEGAS" y Flechas de neón rosa y azul cian.
// 4. PADDOCK BUILDING OFICIAL F1 LAS VEGAS: Edificio de boxes oficial de 3 plantas en negro mate con MONUMENTAL LOGO F1 EN LA AZOTEA (f1Red).
// 5. Los tres emblemáticos edificios con forma de Y (tri-wing towers) de Las Vegas (The Venetian/Palazzo, The Mirage, Caesars Tower).
// 6. Monumentos: MSG Sphere (Planet Earth, earthColor), High Roller (28 Cabinas, nRim = 56, The LINQ), The Venetian & Campanile,
//    Wynn/Encore, Caesars Palace, Paris Las Vegas (TORRE EIFFEL 165m + GLOBO AEROSTÁTICO de neón),
//    FUENTES DEL BELLAGIO (lago con chorros de agua iluminados) y The Cosmopolitan (LEDs azules).
// 7. Iluminación nocturna con farolas F1 cada 35m y puentes peatonales con pantallas LED.

function buildVegasUrbanProps(ctx) {
  const { mb, md, mp, S1, S2, SP, TRK, hw, frame, P, col, sign, REG, Bx, gantry, figure, sitter, stander, CROWD, mkRng } = ctx;
  const rnd = typeof mkRng === 'function' ? mkRng(777) : Math.random;
  const PI = Math.PI, PI2 = PI * 2;
  const sI = s => (((Math.round(s / TRK.ds)) % TRK.N) + TRK.N) % TRK.N;
  const locQ = new Float64Array(6);

  // Asegurar registro de colisionadores físicos de edificios
  if (!TRK.buildingColliders) TRK.buildingColliders = [];

  // Helper para registrar un OBB (Oriented Bounding Box) en TRK.buildingColliders
  const addBuildingCollider = (cx, cz, halfW, halfD, tx, tz, nx, nz) => {
    const rx = Math.abs(tx * halfW) + Math.abs(nx * halfD);
    const rz = Math.abs(tz * halfW) + Math.abs(nz * halfD);
    TRK.buildingColliders.push({
      cx, cz, hw: halfW, hd: halfD, tx, tz, nx, nz,
      minX: cx - rx, maxX: cx + rx, minZ: cz - rz, maxZ: cz + rz
    });
  };

  // =========================================================================
  // 1. SISTEMA DE VALLADO CONTINUO Y TÚNEL DE CONTENCIÓN EN LÍNEA (Muro Jersey + Catch Fencing)
  // =========================================================================
  const wallStep = 4.0;
  const nSegs = Math.round(TRK.L / wallStep);
  const dS = TRK.L / nSegs;

  const getWallD = (s, side) => {
    const u = ((s / TRK.ds) % TRK.N + TRK.N) % TRK.N;
    const i0 = Math.floor(u), f = u - i0, i1 = (i0 + 1) % TRK.N;
    const bar = side < 0 ? TRK.barL : TRK.barR;
    const b0 = bar ? bar[i0] : (hw + 0.85), b1 = bar ? bar[i1] : (hw + 0.85);
    return side * (b0 + (b1 - b0) * f);
  };

  const th = 0.42; // Espesor del muro Jersey hacia el exterior

  for (const side of [-1, 1]) {
    let i0MB = mb.ni, j0MD = md.ni, count = 0;
    const flushWall = () => {
      if (count > 0) {
        S1.add(mb, i0MB, 3, 750);
        S2.add(md, j0MD, 7, 950);
        i0MB = mb.ni; j0MD = md.ni; count = 0;
      }
    };

    for (let st = 0; st < nSegs; st++) {
      const s0 = st * dS, s1 = (st + 1) * dS;
      const d0 = getWallD(s0, side), d1 = getWallD(s1, side);
      const p0 = P(s0, d0), p1 = P(s1, d1);

      const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1e-3) continue;

      const tx = dx / segLen, tz = dz / segLen;
      // Normal hacia el interior de la pista:
      const inX = tz * side, inZ = -tx * side;
      // Normal hacia el exterior:
      const outX = -inX, outZ = -inZ;

      const x0 = p0[0], y0 = p0[1], z0 = p0[2];
      const x1 = p1[0], y1 = p1[1], z1 = p1[2];
      const x0_t = p0[0], y0_t = p0[1] + 1.0, z0_t = p0[2];
      const x1_t = p1[0], y1_t = p1[1] + 1.0, z1_t = p1[2];

      const x0_tb = x0_t + outX * th, y0_tb = y0_t, z0_tb = z0_t + outZ * th;
      const x1_tb = x1_t + outX * th, y1_tb = y1_t, z1_tb = z1_t + outZ * th;
      const x0_bb = x0 + outX * th, y0_bb = y0 - 0.25, z0_bb = z0 + outZ * th;
      const x1_bb = x1 + outX * th, y1_bb = y1 - 0.25, z1_bb = z1 + outZ * th;

      // A. Cara frontal de hormigón del muro Jersey (hacia la pista):
      mb.mat(2, 90, 80); col(mb, 0.74, 0.75, 0.77);
      if (side < 0) {
        mb.quad(x0, y0 - 0.25, z0, x1, y1 - 0.25, z1, x1_t, y1_t, z1_t, x0_t, y0_t, z0_t, 0, 0, segLen, 1.25);
      } else {
        mb.quad(x1, y1 - 0.25, z1, x0, y0 - 0.25, z0, x0_t, y0_t, z0_t, x1_t, y1_t, z1_t, 0, 0, segLen, 1.25);
      }

      // Paneles de publicidad oficial F1 montados de cara al asfalto:
      const sponsorIdx = Math.floor(st / 4 + (side > 0 ? 6 : 0)) % 12;
      const brandKey = 'b' + sponsorIdx;
      const rBan = (REG && REG[brandKey]) ? REG[brandKey] : (REG && REG['b0'] ? REG['b0'] : null);
      if (rBan) {
        md.mat(7, 0, 0); col(md, 1, 1, 1);
        const offF = 0.015;
        const bx0 = x0 + inX * offF, bz0 = z0 + inZ * offF;
        const bx1 = x1 + inX * offF, bz1 = z1 + inZ * offF;
        if (side < 0) {
          md.quad(bx0, y0 + 0.12, bz0, bx1, y1 + 0.12, bz1, bx1, y1 + 0.88, bz1, bx0, y0 + 0.88, bz0, rBan[0], rBan[3], rBan[2], rBan[1]);
        } else {
          md.quad(bx1, y1 + 0.12, bz1, bx0, y0 + 0.12, bz0, bx0, y0 + 0.88, bz0, bx1, y1 + 0.88, bz1, rBan[2], rBan[3], rBan[0], rBan[1]);
        }
      }

      // Banda reflectora amarilla de advertencia F1:
      mb.mat(11, 0, 0); col(mb, 0.96, 0.82, 0.12);
      const yMid0 = y0 + 0.62, yMid1 = y1 + 0.62;
      if (side < 0) {
        mb.quad(x0 + inX * 0.005, yMid0, z0 + inZ * 0.005, x1 + inX * 0.005, yMid1, z1 + inZ * 0.005, x1 + inX * 0.005, yMid1 + 0.12, z1 + inZ * 0.005, x0 + inX * 0.005, yMid0 + 0.12, z0 + inZ * 0.005, 0, 0, segLen, 0.12);
      } else {
        mb.quad(x1 + inX * 0.005, yMid1, z1 + inZ * 0.005, x0 + inX * 0.005, yMid0, z0 + inZ * 0.005, x0 + inX * 0.005, yMid0 + 0.12, z0 + inZ * 0.005, x1 + inX * 0.005, yMid1 + 0.12, z1 + inZ * 0.005, 0, 0, segLen, 0.12);
      }

      // Coronación superior biselada del muro de hormigón:
      mb.mat(2, 90, 80); col(mb, 0.68, 0.69, 0.71);
      mb.quad(x0_t, y0_t, z0_t, x1_t, y1_t, z1_t, x1_tb, y1_tb, z1_tb, x0_tb, y0_tb, z0_tb, 0, 0, segLen, th);

      // Cara posterior exterior (hacia los edificios):
      mb.mat(2, 80, 80); col(mb, 0.58, 0.59, 0.62);
      mb.quad(x1_tb, y1_tb, z1_tb, x0_tb, y0_tb, z0_tb, x0_bb, y0_bb, z0_bb, x1_bb, y1_bb, z1_bb, 0, 0, segLen, 1.25);

      // B. Postes verticales de acero negro cada 4 metros (en p0):
      mb.mat(11, 0, 0, 110); col(mb, 0.12, 0.13, 0.15);
      mb.cyl(p0[0], p0[1] + 1.0, p0[2], 0.045, p0[1] + 4.5, 0.045, 6, false, true);
      const armTipX = p0[0] + inX * 0.42, armTipY = p0[1] + 4.65, armTipZ = p0[2] + inZ * 0.42;
      mb.tube([[p0[0], p0[1] + 4.45, p0[2]], [armTipX, armTipY, armTipZ]], 0.035, 5);

      // C. Valla metálica negra FIA Catch Fencing (3,5 m de altura en md, doble cara):
      md.mat(7, 0, 0); col(md, 0.12, 0.13, 0.15, 0.68);
      if (side < 0) {
        md.quad(x0, y0 + 1.0, z0, x1, y1 + 1.0, z1, x1, y1 + 4.5, z1, x0, y0 + 4.5, z0, 0, 0, segLen, 3.5);
      } else {
        md.quad(x1, y1 + 1.0, z1, x0, y0 + 1.0, z0, x0, y0 + 4.5, z0, x1, y1 + 4.5, z1, 0, 0, segLen, 3.5);
      }

      // D. 4 Cables tensores horizontales de acero:
      md.mat(11, 0, 0); col(md, 0.42, 0.44, 0.46);
      for (const ch of [1.8, 2.7, 3.6, 4.4]) {
        if (side < 0) {
          md.quad(x0, y0 + ch, z0, x1, y1 + ch, z1, x1, y1 + ch + 0.03, z1, x0, y0 + ch + 0.03, z0, 0, 0, segLen, 1);
        } else {
          md.quad(x1, y1 + ch, z1, x0, y0 + ch, z0, x0, y0 + ch + 0.03, z0, x1, y1 + ch + 0.03, z1, 0, 0, segLen, 1);
        }
      }

      count++;
      if (count >= 24) flushWall();
    }
    flushWall();
  }

  // Muro divisor de boxes (Pit Wall) continuo entre la pista y el carril de aceleración:
  {
    const pwStep = 4.0;
    const nPwSegs = Math.round((TRK.pit.s1 - TRK.pit.s0) / pwStep);
    const dPwS = (TRK.pit.s1 - TRK.pit.s0) / nPwSegs;
    const pwI0 = mb.ni, pwfI0 = md.ni;

    for (let st = 0; st < nPwSegs; st++) {
      const s0 = TRK.pit.s0 + st * dPwS, s1 = TRK.pit.s0 + (st + 1) * dPwS;
      const p0 = P(s0, TRK.pit.wallD), p1 = P(s1, TRK.pit.wallD);
      const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1e-3) continue;
      const tx = dx / segLen, tz = dz / segLen;
      const inX = tz, inZ = -tx;

      mb.mat(2, 90, 80); col(mb, 0.74, 0.75, 0.77);
      mb.quad(p1[0], p1[1] - 0.25, p1[2], p0[0], p0[1] - 0.25, p0[2], p0[0], p0[1] + 1.05, p0[2], p1[0], p1[1] + 1.05, p1[2], 0, 0, segLen, 1.3);

      const pBrandKey = 'b' + (st % 12);
      const rPitBan = (REG && REG[pBrandKey]) ? REG[pBrandKey] : (REG && REG['b0'] ? REG['b0'] : null);
      if (rPitBan) {
        md.mat(7, 0, 0); col(md, 1, 1, 1);
        const bx0 = p0[0] + inX * 0.015, bz0 = p0[2] + inZ * 0.015;
        const bx1 = p1[0] + inX * 0.015, bz1 = p1[2] + inZ * 0.015;
        md.quad(bx1, p1[1] + 0.12, bz1, bx0, p0[1] + 0.12, bz0, bx0, p0[1] + 0.88, bz0, bx1, p1[1] + 0.88, bz1, rPitBan[2], rPitBan[3], rPitBan[0], rPitBan[1]);
      }

      mb.mat(11); col(mb, 0.15, 0.16, 0.18);
      mb.cyl(p0[0], p0[1] + 1.05, p0[2], 0.045, p0[1] + 3.8, 0.045, 6, false, true);

      md.mat(7); col(md, 0.18, 0.18, 0.20, 0.65);
      md.quad(p1[0], p1[1] + 1.05, p1[2], p0[0], p0[1] + 1.05, p0[2], p0[0], p0[1] + 3.75, p0[2], p1[0], p1[1] + 3.75, p1[2], 0, 0, segLen, 2.7);
    }
    S1.add(mb, pwI0, 3, 500);
    S2.add(md, pwfI0, 7, 700);
  }

  // =========================================================================
  // 2. ESCAPATORIAS URBANAS ASFALTADAS CON BARRERAS TECPRO
  // =========================================================================
  function tecproWall(sStart, sEnd, side, offsetWall) {
    const tpI0 = mb.ni;
    const bLen = 1.6, bH = 1.25, bD = 0.65;
    const nBlocks = Math.max(4, Math.round(Math.abs(sEnd - sStart) / bLen));
    const step = (sEnd - sStart) / nBlocks;

    for (let b = 0; b < nBlocks; b++) {
      const s0 = sStart + b * step, s1 = sStart + (b + 1) * step;
      const d0 = getWallD(s0, side) - side * offsetWall, d1 = getWallD(s1, side) - side * offsetWall;
      const p0 = P(s0, d0), p1 = P(s1, d1);
      const dx = p1[0] - p0[0], dz = p1[2] - p0[2];
      const segLen = Math.hypot(dx, dz);
      if (segLen < 1e-3) continue;

      const tx = dx / segLen, tz = dz / segLen;
      const inX = tz * side, inZ = -tx * side;
      const isRed = (b % 2 === 0);

      mb.mat(2, 60, 40);
      if (isRed) col(mb, 0.88, 0.06, 0.06); else col(mb, 0.95, 0.95, 0.95);

      const x0 = p0[0], y0 = p0[1], z0 = p0[2];
      const x1 = p1[0], y1 = p1[1], z1 = p1[2];
      const x0_t = x0, y0_t = y0 + bH, z0_t = z0;
      const x1_t = x1, y1_t = y1 + bH, z1_t = z1;
      const x0_b = x0 - inX * bD, y0_b = y0 + bH, z0_b = z0 - inZ * bD;
      const x1_b = x1 - inX * bD, y1_b = y1 + bH, z1_b = z1 - inZ * bD;

      if (side < 0) {
        mb.quad(x0, y0, z0, x1, y1, z1, x1_t, y1_t, z1_t, x0_t, y0_t, z0_t, 0, 0, segLen, bH);
        mb.quad(x0_t, y0_t, z0_t, x1_t, y1_t, z1_t, x1_b, y1_b, z1_b, x0_b, y0_b, z0_b, 0, 0, segLen, bD);
      } else {
        mb.quad(x1, y1, z1, x0, y0, z0, x0_t, y0_t, z0_t, x1_t, y1_t, z1_t, 0, 0, segLen, bH);
        mb.quad(x1_t, y1_t, z1_t, x0_t, y0_t, z0_t, x0_b, y0_b, z0_b, x1_b, y1_b, z1_b, 0, 0, segLen, bD);
      }
    }
    S1.add(mb, tpI0, 3, 750);
  }

  // A. Curva 1 (Koval Hairpin, s = 80..160, exterior derecha):
  {
    const ro1I0 = mb.ni;
    for (let s = 80; s <= 160; s += 8) {
      const m = frame(s, hw + 7.0, 0, 0);
      mb.push(m);
      mb.mat(2, 40, 60); col(mb, 0.05, 0.35, 0.95); // Azul eléctrico FIA
      Bx(mb, -4.0, 4.0, 0.01, 0.04, -3.5, 3.5);
      mb.mat(11); col(mb, 0.96, 0.96, 0.98);
      for (let lx = -3.0; lx <= 3.0; lx += 3.0) {
        Bx(mb, lx - 0.15, lx + 0.15, 0.041, 0.045, -3.4, 3.4);
      }
      mb.pop();
    }
    S1.add(mb, ro1I0, 3, 850);
    tecproWall(95, 145, 1, 0.45);

    // Cartelera oficial Heineken 0.0
    const hnkI0 = mb.ni;
    for (let s = 112; s <= 138; s += 8) {
      const m = frame(s, hw + 13.9, 0, 0);
      mb.push(m);
      mb.mat(2, 60, 40); col(mb, 0.0, 0.48, 0.2); // Verde Heineken
      Bx(mb, -4.0, 4.0, 1.15, 3.85, -0.1, 0.1);
      if (REG && (REG['heineken'] || REG['b0'])) {
        sign(mb, -3.9, 1.25, -0.12, 7.8, 0, 0, 2.5, REG['heineken'] ? 'heineken' : 'b0', 0);
      }
      mb.pop();
    }
    S1.add(mb, hnkI0, 3, 750);
  }

  // B. Curva 5 (Frenada hacia la Esfera, s = 1880..2010, exterior izquierda):
  {
    const ro5I0 = mb.ni;
    for (let s = 1880; s <= 2010; s += 8) {
      const m = frame(s, -(hw + 7.0), 0, 0);
      mb.push(m);
      const ph = ((s - 1880) / 24) | 0;
      mb.mat(2, 50, 70);
      if (ph % 3 === 0) col(mb, 0.0, 0.88, 1.0);       // Azul cian
      else if (ph % 3 === 1) col(mb, 1.0, 0.05, 0.58);  // Magenta neón
      else col(mb, 0.10, 0.10, 0.12);                   // Negro asfalto mate
      Bx(mb, -4.0, 4.0, 0.01, 0.04, -3.5, 3.5);
      mb.pop();
    }
    S1.add(mb, ro5I0, 3, 850);
    tecproWall(1900, 1980, -1, 0.45);
  }

  // C. Curva 12 (Entrada al Strip, s = 3300..3430, exterior derecha):
  {
    const ro12I0 = mb.ni;
    for (let s = 3300; s <= 3430; s += 8) {
      const m = frame(s, hw + 7.0, 0, 0);
      mb.push(m);
      mb.mat(2, 40, 60); col(mb, 0.06, 0.18, 0.42);
      Bx(mb, -4.0, 4.0, 0.01, 0.04, -3.5, 3.5);
      mb.mat(11); col(mb, 0.0, 0.88, 1.0);
      Bx(mb, -1.8, 1.8, 0.041, 0.045, -0.5, 0.5);
      mb.pop();
    }
    S1.add(mb, ro12I0, 3, 850);
    tecproWall(3320, 3400, 1, 0.45);
  }

  // D. Curva 14 (Final del Strip, s = 5010..5190, exterior derecha):
  {
    const ro14I0 = mb.ni;
    for (let s = 5010; s <= 5190; s += 8) {
      const m = frame(s, hw + 7.5, 0, 0);
      mb.push(m);
      mb.mat(2, 30, 40); col(mb, 0.08, 0.14, 0.28);
      Bx(mb, -4.0, 4.0, 0.01, 0.04, -4.2, 4.2);
      mb.pop();
    }
    S1.add(mb, ro14I0, 3, 850);
    tecproWall(5040, 5160, 1, 0.45);

    // E. Pintura monumental en el asfalto antes de Curva 14 (s = 4940):
    // Rótulo monumental "LAS VEGAS" y Flechas de neón rosa y azul cian
    const mDecal = frame(4940, 0.0, 0, 0.02);
    const lvI0 = mb.ni;
    mb.push(mDecal);
    mb.mat(2, 20, 20); col(mb, 0.06, 0.06, 0.08);
    Bx(mb, -18.0, 18.0, 0.01, 0.025, -(hw - 0.5), hw - 0.5);
    mb.mat(6, 255, 0); col(mb, 1.0, 0.95, 0.85);
    for (let u = -10.0; u <= 10.0; u += 2.5) {
      Bx(mb, u - 0.8, u + 0.8, 0.026, 0.035, -3.5, 3.5);
    }
    // Flechas de neón rosa y azul cian:
    mb.mat(6, 250, 0); col(mb, 1.0, 0.12, 0.65); // Rosa neón
    Bx(mb, 2.0, 14.0, 0.035, 0.045, -hw + 1.5, -hw + 3.2);
    mb.mat(6, 250, 0); col(mb, 0.0, 0.88, 1.0);  // Azul cian neón
    Bx(mb, 4.0, 16.0, 0.035, 0.045, -hw + 3.6, -hw + 5.2);
    mb.pop();
    S1.add(mb, lvI0, 7, 650);
  }

  // =========================================================================
  // 3. PADDOCK BUILDING OFICIAL F1 LAS VEGAS (3 PLANTAS, NEGRO MATE, LOGO F1 LED)
  // =========================================================================
  // Edificio de boxes oficial: fachada en d = 19.5m, longitud 280m (s de -140 a 140), altura 14m
  {
    const padI0 = mb.ni;
    const bldS0 = TRK.pit.bldS0, bldS1 = TRK.pit.bldS1, padLen = bldS1 - bldS0;
    const padMidS = (bldS0 + bldS1) * 0.5;
    const padDepth = 15.0; // Profundidad de 15m (de d=19.5 a d=34.5)
    // Matriz local: origen en la fachada del paddock (s = padMidS, d = 19.5m)
    const mPad = frame(padMidS, TRK.pit.bldD0, 0, 0);
    mb.push(mPad);

    // Bloque principal: u = [-140, 140], y = [0, 14], v = [0, 15] (se extiende hacia el exterior)
    mb.mat(2, 60, 40); col(mb, 0.09, 0.10, 0.11); // Negro mate oficial F1
    Bx(mb, -padLen * 0.5, padLen * 0.5, 0.0, 14.0, 0.0, padDepth);

    // 20 Garajes de boxes en planta baja (y = [0, 3.8]):
    const nBays = 20;
    const bayW = padLen / nBays;
    for (let b = 0; b < nBays; b++) {
      const u0 = -padLen * 0.5 + b * bayW + 0.3;
      const u1 = u0 + bayW - 0.6;
      mb.mat(11); col(mb, 0.16, 0.17, 0.19);
      Bx(mb, u0, u1, 0.0, 3.8, -0.05, 0.05); // Portón de garaje
      mb.mat(6, 200, 0); col(mb, 1.0, 0.90, 0.70);
      Bx(mb, u0 + 1.0, u1 - 1.0, 3.4, 3.7, -0.08, -0.02); // Letrero iluminado
    }

    // Cristaleras panorámicas de hospitalidad VIP en plantas 2 y 3:
    mb.mat(6, 180, 0); col(mb, 1.0, 0.94, 0.78);
    Bx(mb, -padLen * 0.48, padLen * 0.48, 5.0, 8.8, -0.08, 0.05);
    Bx(mb, -padLen * 0.48, padLen * 0.48, 9.8, 13.6, -0.08, 0.05);

    // Línea de neón rojo F1 en la cornisa superior de la fachada:
    mb.mat(6, 255, 0); col(mb, 1.0, 0.05, 0.02);
    Bx(mb, -padLen * 0.5, padLen * 0.5, 13.9, 14.15, -0.1, 0.1);

    // MONUMENTAL LOGO F1 EN LA AZOTEA (Tiras LED rojas visibles desde arriba):
    const f1Red = [1.0, 0.04, 0.02];
    mb.mat(6, 255, 0); col(mb, f1Red[0], f1Red[1], f1Red[2]);
    // Barra superior de la 'F'
    Bx(mb, -26.0, 14.0, 14.05, 14.3, 3.0, 4.8);
    // Barra media de la 'F'
    Bx(mb, -22.0, 4.0, 14.05, 14.3, 7.5, 9.3);
    // Columna vertical de la 'F'
    Bx(mb, -26.0, -22.5, 14.05, 14.3, 3.0, 13.0);
    // Chevron y número '1'
    Bx(mb, 20.0, 24.5, 14.05, 14.3, 3.0, 13.0);
    Bx(mb, 14.0, 22.0, 14.05, 14.3, 3.0, 4.8);

    mb.pop();
    S1.add(mb, padI0, 7, 2500);

    // Registrar collider del edificio de boxes
    const pPadCenter = P(padMidS, TRK.pit.bldD0 + padDepth * 0.5);
    addBuildingCollider(pPadCenter[0], pPadCenter[2], padLen * 0.5, padDepth * 0.5, pPadCenter[3], pPadCenter[4], -pPadCenter[4], pPadCenter[3]);

    // Grada principal F1 Las Vegas enfrente (lado izquierdo, s = -100..100, fachada en d = -14.0m):
    // Estructura abierta y escalonada de 18 filas con asientos tricolor (Rojo F1, Blanco y Azul Eléctrico),
    // público animando, escaleras de acceso entre sectores, marquesina en voladizo e iluminación de focos LED.
    const stI0 = mb.ni, stD0 = md.ni;
    const standLen = 200.0, standDepth = 22.0;
    const mStand = frame(0, -14.0, 0, 0);
    mb.push(mStand); md.push(mStand);

    const nRow = 18, rowRise = 0.52, rowRun = 1.05, yBase = 1.25;
    const nSec = 6, aisleW = 2.4;
    const secW = (standLen - (nSec + 1) * aisleW) / nSec; // ~28.3m
    const seatTones = [
      [0.92, 0.12, 0.12], // F1 Red
      [0.96, 0.96, 0.96], // Pure White
      [0.08, 0.45, 0.95], // Electric Blue
      [0.92, 0.12, 0.12], // F1 Red
      [0.96, 0.96, 0.96], // Pure White
      [0.08, 0.45, 0.95]  // Electric Blue
    ];

    // 1. Murete frontal de hormigón con cartelería oficial F1 (facing track en v = 0)
    mb.mat(3); col(mb, 0.65, 0.65, 0.66);
    Bx(mb, -standLen * 0.5, standLen * 0.5, 0.0, yBase + 0.15, -0.6, 0.0);
    if (typeof sign === 'function') {
      const bannerW = 24.0;
      for (let bx = -standLen * 0.5 + 4.0; bx < standLen * 0.5 - bannerW; bx += bannerW + 6.0) {
        const brand = ['heineken', 'name', 'b1', 'b5', 'b2'][Math.floor((bx + 100) / 30) % 5];
        sign(md, bx + bannerW, 0.25, 0.02, -bannerW, 0, 0, 1.05, brand);
      }
    }

    // 2. Filas escalonadas de asientos por sector y escaleras de acceso
    for (let sec = 0; sec < nSec; sec++) {
      const u0 = -standLen * 0.5 + aisleW + sec * (secW + aisleW);
      const u1 = u0 + secW;
      const sTone = seatTones[sec % seatTones.length];

      for (let r = 0; r < nRow; r++) {
        const vFront = -0.7 - r * rowRun;
        const vBack = vFront - rowRun;
        const yFloor = yBase + r * rowRise;
        const yTop = yFloor + rowRise;

        // Estructura de hormigón: peldaño (huella y contrahuella)
        mb.mat(3); col(mb, 0.55, 0.56, 0.58);
        mb.quad(u0, yFloor, vFront, u1, yFloor, vFront, u1, yTop, vFront, u0, yTop, vFront); // Riser
        mb.quad(u0, yTop, vFront, u1, yTop, vFront, u1, yTop, vBack, u0, yTop, vBack);       // Tread

        // Asientos individuales de polímero moldeado con respaldo
        md.mat(8); col(md, sTone[0], sTone[1], sTone[2]);
        const seatV0 = vFront - 0.22, seatV1 = vBack + 0.18;
        md.quad(u0, yTop + 0.38, seatV0, u1, yTop + 0.38, seatV0, u1, yTop + 0.38, seatV1, u0, yTop + 0.38, seatV1); // Base del asiento
        md.quad(u0, yTop + 0.38, seatV1, u1, yTop + 0.38, seatV1, u1, yTop + 0.82, seatV1, u0, yTop + 0.82, seatV1); // Respaldo
      }

      // Escaleras laterales de acceso (en u0 - aisleW y u1)
      const uAisle0 = u0 - aisleW, uAisle1 = u0;
      mb.mat(2, 100, 150); col(mb, 0.72, 0.73, 0.75);
      for (let r = 0; r < nRow; r++) {
        const vF = -0.7 - r * rowRun, vB = vF - rowRun;
        const yF = yBase + r * rowRise, yT = yF + rowRise;
        mb.quad(uAisle0, yF, vF, uAisle1, yF, vF, uAisle1, yT, vF, uAisle0, yT, vF);
        mb.quad(uAisle0, yT, vF, uAisle1, yT, vF, uAisle1, yT, vB, uAisle0, yT, vB);
      }
    }

    // 3. Público en las gradas (sitter / stander con ropa festiva de F1)
    if (mp && SP && typeof sitter === 'function') {
      const qCrowd0 = mp.ni;
      mp.push(mStand);
      for (let sec = 0; sec < nSec; sec++) {
        const u0 = -standLen * 0.5 + aisleW + sec * (secW + aisleW);
        const u1 = u0 + secW;
        for (let r = 0; r < nRow; r++) {
          const vBack = -0.7 - (r + 1) * rowRun;
          const yFloor = yBase + r * rowRise + rowRise;
          for (let ux = u0 + 0.55; ux < u1 - 0.55; ux += 0.85) {
            if (rnd() < 0.82) {
              if (rnd() < 0.12 && typeof stander === 'function') {
                stander(ux + (rnd() - 0.5) * 0.2, yFloor + 0.05, vBack + 0.4, (CROWD && CROWD.length) ? CROWD[Math.floor(rnd() * CROWD.length)] : [0.9, 0.2, 0.2], 0.95);
              } else {
                sitter(ux, yFloor + 0.38, vBack + 0.25, 0.95);
              }
            }
          }
        }
      }
      mp.pop();
      SP.add(mp, qCrowd0, 1, 950);
    }

    // 4. Muro de cierre trasero y cerchas estructurales
    const yTopStand = yBase + nRow * rowRise; // ~10.6 m
    const vBackTotal = -0.7 - nRow * rowRun;  // ~-19.6 m
    mb.mat(3); col(mb, 0.35, 0.36, 0.38);
    mb.quad(standLen * 0.5, 0, vBackTotal, -standLen * 0.5, 0, vBackTotal, -standLen * 0.5, yTopStand + 3.0, vBackTotal, standLen * 0.5, yTopStand + 3.0, vBackTotal); // Pared trasera
    // Testeros laterales
    mb.quad(-standLen * 0.5, 0, 0, -standLen * 0.5, 0, vBackTotal, -standLen * 0.5, yTopStand + 3.0, vBackTotal, -standLen * 0.5, yBase, 0);
    mb.quad(standLen * 0.5, 0, vBackTotal, standLen * 0.5, 0, 0, standLen * 0.5, yBase, 0, standLen * 0.5, yTopStand + 3.0, vBackTotal);

    // 5. Cubierta arquitectónica en voladizo (White Canopy Roof)
    const yRoofBack = yTopStand + 5.5; // ~16.1 m
    const yRoofFront = yTopStand + 2.8; // ~13.4 m
    mb.mat(11); col(mb, 0.92, 0.93, 0.95);
    // Panel superior de la cubierta
    mb.quad(-standLen * 0.52, yRoofBack, vBackTotal - 1.5, standLen * 0.52, yRoofBack, vBackTotal - 1.5, standLen * 0.52, yRoofFront, 0.5, -standLen * 0.52, yRoofFront, 0.5);
    // Borde frontal estilizado
    mb.mat(2, 120, 80); col(mb, 0.82, 0.12, 0.12);
    Bx(mb, -standLen * 0.52, standLen * 0.52, yRoofFront - 0.25, yRoofFront + 0.15, 0.4, 0.6);

    // Pilares y tirantes de acero traseros
    mb.mat(2, 130, 90); col(mb, 0.22, 0.24, 0.28);
    for (let px = -standLen * 0.48; px <= standLen * 0.48 + 1.0; px += standLen / 8) {
      mb.cyl(px, 0.0, vBackTotal - 1.0, 0.35, yRoofBack + 2.5, 0.35, 10, false, true);
      // Tirante diagonal hacia el frente de la cubierta
      mb.tube([[px, yRoofBack + 2.3, vBackTotal - 1.0], [px, yRoofFront + 0.1, -1.0]], 0.08, 6);
    }

    // 6. Focos de iluminación LED nocturna apuntando al público y pista
    mb.mat(6, 255, 0); col(mb, 1.0, 0.98, 0.92); // Emisivo blanco cálido de estadio F1
    for (let lx = -standLen * 0.48; lx <= standLen * 0.48; lx += 12.0) {
      Bx(mb, lx - 1.8, lx + 1.8, yRoofFront - 0.4, yRoofFront - 0.1, 0.1, 0.45);
    }

    // 7. Pantallas gigantes LED en ambos extremos de la grada
    mb.mat(6, 220, 0); col(mb, 0.15, 0.65, 1.0); // Resplandor azul de transmisión de TV
    for (const sx of [-standLen * 0.5 + 1.5, standLen * 0.5 - 1.5]) {
      Bx(mb, sx - 0.2, sx + 0.2, yTopStand - 4.0, yTopStand + 2.5, -1.2, 0.2);
    }

    mb.pop(); md.pop();
    S1.add(mb, stI0, 3, 2200);
    if (md.ni > stD0) S2.add(md, stD0, 7, 1600);

    const pStandCenter = P(0, -14.0 - standDepth * 0.5);
    addBuildingCollider(pStandCenter[0], pStandCenter[2], standLen * 0.5, standDepth * 0.5, pStandCenter[3], pStandCenter[4], -pStandCenter[4], pStandCenter[3]);
  }

  // =========================================================================
  // 4. LOS TRES EDIFICIOS CON FORMA DE 'Y' (TRI-WING TOWERS DE LAS VEGAS)
  // =========================================================================
  function buildTriWingTower(cx, cy, cz, h, wingLen, wingWid, yaw, facadeMat, wallColor, winColor, crownColor) {
    const twI0 = mb.ni;
    const coreR = wingWid * 0.9;
    // 1. Núcleo central hexagonal de ascensores
    mb.mat(facadeMat, 80, 100); col(mb, wallColor[0], wallColor[1], wallColor[2]);
    mb.cyl(cx, cy, cz, coreR, cy + h, coreR, 12, true, true);

    // 2. Las tres alas simétricas a 120 grados
    for (let w = 0; w < 3; w++) {
      const ang = yaw + (w * PI2 / 3);
      const c = Math.cos(ang), s = Math.sin(ang);
      const nx = -s, nz = c;
      const midDist = coreR * 0.5 + wingLen * 0.5;
      const wx = cx + c * midDist, wz = cz + s * midDist;

      const mW = m4basis(m4(), c, 0, s, 0, 1, 0, nx, 0, nz, wx, cy, wz);
      mb.push(mW);

      mb.mat(facadeMat, 80, 100); col(mb, wallColor[0], wallColor[1], wallColor[2]);
      Bx(mb, -wingLen * 0.5, wingLen * 0.5, 0, h, -wingWid * 0.5, wingWid * 0.5);

      const nFloors = Math.floor(h / 3.8);
      for (let fl = 2; fl < nFloors - 1; fl += 2) {
        const y0 = fl * 3.8, y1 = y0 + 2.1;
        mb.mat(6, 170, 0); col(mb, winColor[0], winColor[1], winColor[2]);
        Bx(mb, -wingLen * 0.46, wingLen * 0.46, y0, y1, -wingWid * 0.52, -wingWid * 0.49);
        Bx(mb, -wingLen * 0.46, wingLen * 0.46, y0, y1, wingWid * 0.49, wingWid * 0.52);
      }

      mb.mat(6, 255, 0); col(mb, crownColor[0], crownColor[1], crownColor[2]);
      Bx(mb, wingLen * 0.48, wingLen * 0.51, 10.0, h, -0.25, 0.25);
      mb.pop();

      addBuildingCollider(wx, wz, wingLen * 0.5, wingWid * 0.5, c, s, nx, nz);
    }

    // 3. Corona iluminada en el ático
    mb.mat(6, 250, 0); col(mb, crownColor[0], crownColor[1], crownColor[2]);
    mb.cyl(cx, cy + h, cz, coreR * 1.05, cy + h + 6.0, coreR * 0.75, 12, true, true);
    S1.add(mb, twI0, 7, 4500);
  }

  // Torre Y 1: The Venetian / The Palazzo (Sands Ave / Curva 9, exterior)
  buildTriWingTower(-560.0, 0.0, -1450.0, 185.0, 52.0, 20.0, 0.35, 2, [0.82, 0.76, 0.62], [1.0, 0.94, 0.75], [1.0, 0.85, 0.3]);
  // Torre Y 2: The Mirage / TI (Strip norte, lado oeste)
  buildTriWingTower(-820.0, 0.0, -550.0, 142.0, 44.0, 18.0, 0.82, 2, [0.72, 0.62, 0.38], [1.0, 0.90, 0.65], [1.0, 0.65, 0.1]);
  // Torre Y 3: Caesars Palace Tower / Mandalay (Strip sur)
  buildTriWingTower(-520.0, 0.0, -220.0, 156.0, 48.0, 19.0, -0.45, 2, [0.85, 0.78, 0.68], [0.95, 0.92, 1.0], [0.2, 0.85, 1.0]);

  // =========================================================================
  // 5. MSG SPHERE (ORBE MONUMENTAL PLANET EARTH)
  // =========================================================================
  const spherePos = (TRK.spec && TRK.spec.spherePos) || [-750.0, 0.0, -1410.0];
  const sphR = (TRK.spec && TRK.spec.sphereR) || 64.0;
  const sphH = 88.0;
  const sphCX = spherePos[0], sphCY = spherePos[1], sphCZ = spherePos[2];

  const sphBaseI0 = mb.ni;
  mb.mat(3); col(mb, 0.22, 0.24, 0.26);
  mb.cyl(sphCX, sphCY - 0.5, sphCZ, sphR + 42.0, sphCY + 0.1, sphR + 40.0, 48, true, false);
  mb.mat(2); col(mb, 0.42, 0.44, 0.46);
  mb.cyl(sphCX, sphCY, sphCZ, sphR + 18.0, sphCY + 4.5, sphR + 14.0, 48, true, false);
  mb.mat(6, 255, 0); col(mb, 0.0, 0.88, 1.0);
  mb.cyl(sphCX, sphCY + 4.4, sphCZ, sphR + 14.1, sphCY + 4.8, sphR + 13.9, 48, false, true);
  S1.add(mb, sphBaseI0, 7, 5000);

  const sphI0 = md.ni;
  const nLat = 32, nLon = 56;
  function earthColor(lat, lon) {
    const latN = lat / (PI * 0.5);
    const n1 = Math.sin(lat * 5.0 + Math.sin(lon * 4.0)) * Math.cos(lon * 3.0);
    const n2 = Math.sin(lat * 11.0) * Math.cos(lon * 9.0 + lat * 4.0);
    const isLand = (n1 + n2 * 0.5) > 0.15 && latN < 0.88;
    const isCloud = (Math.sin(lat * 7.0 + lon * 5.0 + n2 * 2.0) + Math.cos(lat * 3.0 - lon * 8.0)) > 0.75;
    if (isCloud) return [0.95, 0.98, 1.0];
    if (latN > 0.82) return [0.92, 0.96, 1.0];
    if (isLand) {
      if (Math.abs(latN) < 0.25) return [0.12, 0.58, 0.22];
      if (Math.abs(latN) < 0.55) return [0.22, 0.65, 0.28];
      return [0.65, 0.55, 0.28];
    }
    return [0.03, 0.22, 0.75];
  }

  const vGrid = [];
  for (let j = 0; j <= nLat; j++) {
    const phi = (j / nLat) * (PI * 0.5);
    const y = sphCY + 4.5 + Math.sin(phi) * sphH;
    const rRing = Math.cos(phi) * sphR;
    const row = [];
    for (let k = 0; k <= nLon; k++) {
      const theta = (k / nLon) * PI2;
      const x = sphCX + Math.cos(theta) * rRing;
      const z = sphCZ + Math.sin(theta) * rRing;
      const ec = earthColor(phi, theta);
      md.mat(6, 255, 0); col(md, ec[0], ec[1], ec[2]);
      row.push(md.v(x, y, z, Math.cos(theta) * Math.cos(phi), Math.sin(phi), Math.sin(theta) * Math.cos(phi), k / nLon, j / nLat));
    }
    vGrid.push(row);
  }
  for (let j = 0; j < nLat; j++) {
    for (let k = 0; k < nLon; k++) {
      const v0 = vGrid[j][k], v1 = vGrid[j][k + 1], v2 = vGrid[j + 1][k + 1], v3 = vGrid[j + 1][k];
      md.quadI(v0, v3, v2, v1);
    }
  }
  S2.add(md, sphI0, 7, 5000);

  // =========================================================================
  // 6. THE HIGH ROLLER (NORIA GIGANTE MONUMENTAL DE THE LINQ)
  // =========================================================================
  const hrPos = (TRK.spec && TRK.spec.highRollerPos) || [90.0, 0.0, -900.0];
  const hrCX = hrPos[0], hrCY = hrPos[1], hrCZ = hrPos[2];
  const hrHubY = hrCY + 88.0, hrR = 78.0, hrW = 5.6;
  const hrM = m4basis(m4(), 0, 0, -1, 0, 1, 0, 1, 0, 0, hrCX, hrCY, hrCZ);
  const hrI0 = md.ni;
  md.push(hrM);

  md.mat(11); col(md, 0.85, 0.86, 0.90);
  for (const sX of [-1, 1]) {
    for (const sZ of [-1, 1]) {
      const legBaseX = sX * 28.0, legBaseZ = sZ * 18.0;
      md.cyl(legBaseX, 0.0, legBaseZ, 1.6, hrHubY, sZ * 3.8, 12, true, true);
    }
  }
  md.mat(2); col(md, 0.3, 0.32, 0.36);
  md.cyl(0, hrHubY, -hrW * 0.8, 4.2, hrHubY, hrW * 0.8, 4.2, 16, true, true);

  const nRim = 56;
  for (let i = 0; i < nRim; i++) {
    const a0 = (i / nRim) * PI2, a1 = ((i + 1) / nRim) * PI2;
    const y0 = hrHubY + Math.sin(a0) * hrR, y1 = hrHubY + Math.sin(a1) * hrR;
    const z0 = Math.cos(a0) * hrR, z1 = Math.cos(a1) * hrR;
    md.mat(6, 250, 0); col(md, 0.85, 0.20, 1.0);
    for (const sX of [-hrW * 0.5, hrW * 0.5]) {
      md.cyl(sX, y0, z0, 0.45, sX, y1, z1, 0.45, 6, false, true);
    }
  }

  const nCabins = 28;
  for (let c = 0; c < nCabins; c++) {
    const ang = (c / nCabins) * PI2;
    const cy = hrHubY + Math.sin(ang) * hrR, cz = Math.cos(ang) * hrR;
    md.mat(6, 220, 0); col(md, 1.0, 0.94, 0.82);
    md.cyl(0, cy - 2.4, cz, 3.2, cy + 2.4, 3.2, 12, true, true);
    md.mat(6, 255, 0); col(md, 0.85, 0.20, 1.0);
    md.cyl(0, cy - 0.2, cz, 3.4, cy + 0.2, 3.4, 12, false, true);
  }
  md.pop();
  S2.add(md, hrI0, 7, 5000);

  // =========================================================================
  // 7. THE VENETIAN RESORT & CAMPANARIO DE SAN MARCOS (CURVAS 5 A 9)
  // =========================================================================
  {
    const venI0 = mb.ni;
    const mVen = frame(2400, -(hw + 38.0), 0, 0);
    mb.push(mVen);
    mb.mat(2, 90, 80); col(mb, 0.88, 0.82, 0.72);
    Bx(mb, -45.0, 45.0, 0.0, 32.0, -20.0, 20.0);
    mb.mat(6, 180, 0); col(mb, 1.0, 0.92, 0.75);
    for (let ar = -36.0; ar <= 36.0; ar += 12.0) {
      Bx(mb, ar - 4.0, ar + 4.0, 2.0, 10.0, 19.6, 20.5);
    }
    // CAMPANARIO DE SAN MARCOS
    mb.mat(2, 80, 60); col(mb, 0.78, 0.52, 0.38);
    Bx(mb, -6.0, 6.0, 0.0, 72.0, -28.0, -18.0);
    mb.mat(6, 220, 0); col(mb, 0.95, 0.95, 0.90);
    Bx(mb, -5.5, 5.5, 72.0, 82.0, -27.5, -18.5);
    mb.mat(2, 60, 40); col(mb, 0.22, 0.58, 0.46);
    mb.cyl(0.0, 82.0, -23.0, 6.0, 94.0, 0.1, 4, true, false);
    mb.mat(6, 255, 0); col(mb, 1.0, 0.85, 0.2);
    mb.cyl(0.0, 94.0, -23.0, 0.8, 97.5, 0.2, 6, true, true);
    mb.pop();
    S1.add(mb, venI0, 7, 4000);

    const pVenCenter = P(2400, -(hw + 38.0));
    addBuildingCollider(pVenCenter[0], pVenCenter[2], 45.0, 20.0, pVenCenter[3], pVenCenter[4], -pVenCenter[4], pVenCenter[3]);
  }

  // =========================================================================
  // 8. GRAN RECTA DEL STRIP (WYNN/ENCORE, CAESARS, PARIS, BELLAGIO, COSMO)
  // =========================================================================

  // A. Lado Derecho: Wynn & Encore Las Vegas (s = 3620, 3720)
  {
    const wynnI0 = mb.ni;
    for (const wS of [3620, 3720]) {
      const mW = frame(wS, hw + 42.0, 0, 0);
      mb.push(mW);
      mb.mat(2, 80, 180); col(mb, 0.38, 0.24, 0.14);
      Bx(mb, -28.0, 28.0, 0.0, 175.0, -14.0, 14.0);
      mb.mat(6, 180, 0); col(mb, 1.0, 0.90, 0.65);
      for (let y = 10; y < 165; y += 7) {
        Bx(mb, -27.0, 27.0, y, y + 3.0, -14.2, -13.8);
      }
      mb.mat(6, 255, 0); col(mb, 0.98, 0.98, 1.0);
      Bx(mb, -24.0, 24.0, 175.0, 179.0, -14.5, -13.5);
      mb.pop();
      const pW = P(wS, hw + 42.0);
      addBuildingCollider(pW[0], pW[2], 28.0, 14.0, pW[3], pW[4], -pW[4], pW[3]);
    }
    S1.add(mb, wynnI0, 7, 4500);
  }

  // B. Lado Derecho: Caesars Palace (s = 4150)
  {
    const caesI0 = mb.ni;
    const mC = frame(4150, hw + 38.0, 0, 0);
    mb.push(mC);
    mb.mat(2, 90, 80); col(mb, 0.94, 0.94, 0.96);
    Bx(mb, -45.0, 45.0, 0.0, 42.0, -18.0, 18.0);
    mb.mat(2, 90, 60); col(mb, 0.96, 0.96, 0.98);
    for (let x = -40.0; x <= 40.0; x += 3.5) {
      mb.cyl(x, 0.0, -19.5, 0.65, 18.0, 0.55, 12, true, true);
    }
    mb.mat(2, 90, 80); col(mb, 0.94, 0.94, 0.96);
    Bx(mb, -42.0, 42.0, 18.0, 21.0, -21.0, -17.0);
    mb.mat(6, 240, 0); col(mb, 1.0, 0.88, 0.5);
    Bx(mb, -28.0, 28.0, 21.0, 29.0, -20.5, -18.0);
    mb.mat(2, 80, 80); col(mb, 0.90, 0.90, 0.94);
    Bx(mb, -35.0, 35.0, 42.0, 120.0, 0.0, 25.0);
    mb.pop();
    S1.add(mb, caesI0, 7, 4500);
    const pC = P(4150, hw + 38.0);
    addBuildingCollider(pC[0], pC[2], 45.0, 18.0, pC[3], pC[4], -pC[4], pC[3]);
  }

  // C. Lado Izquierdo: Paris Las Vegas (TORRE EIFFEL + GLOBO AEROSTÁTICO, s = 4200)
  {
    const parisI0 = md.ni;
    const mP = frame(4200, -(hw + 38.0), 0, 0);
    md.push(mP);
    // TORRE EIFFEL
    md.mat(11); col(md, 0.92, 0.78, 0.42);
    for (const sx of [-16.0, 16.0]) {
      for (const sz of [-16.0, 16.0]) {
        md.cyl(sx, 0.0, sz, 2.8, sx * 0.45, 52.0, sz * 0.45, 1.8, 8, true, true);
      }
    }
    md.mat(6, 220, 0); col(md, 1.0, 0.85, 0.4);
    md.cyl(0.0, 28.0, 0.0, 18.0, 34.0, 18.0, 16, false, true);
    md.mat(2); col(md, 0.85, 0.72, 0.35);
    Bx(md, -14.0, 14.0, 50.0, 54.0, -14.0, 14.0);
    Bx(md, -8.0, 8.0, 94.0, 97.0, -8.0, 8.0);
    for (const sx of [-7.0, 7.0]) {
      for (const sz of [-7.0, 7.0]) {
        md.cyl(sx * 1.0, 54.0, sz * 1.0, 1.6, sx * 0.45, 94.0, sz * 0.45, 1.1, 6, true, true);
      }
    }
    md.cyl(0.0, 97.0, 0.0, 4.2, 155.0, 1.2, 8, true, true);
    md.cyl(0.0, 155.0, 0.0, 1.8, 165.0, 0.2, 6, true, true);
    md.mat(6, 255, 0); col(md, 1.0, 0.98, 0.9);
    md.cyl(0.0, 165.0, 0.0, 0.8, 167.5, 0.8, 8, true, true);

    // GLOBO AEROSTÁTICO
    const bCX = 32.0, bCY = 45.0, bCZ = 0.0;
    for (let f = 0; f < 12; f++) {
      md.mat(6, 250, 0);
      if (f % 3 === 0) col(md, 0.1, 0.45, 1.0);
      else if (f % 3 === 1) col(md, 0.96, 0.96, 0.98);
      else col(md, 1.0, 0.1, 0.15);
      md.cyl(bCX, bCY - 12.0, bCZ, 9.5, bCY + 12.0, 11.5, 8, true, true);
    }
    md.mat(6, 255, 0); col(md, 1.0, 0.85, 0.15);
    md.cyl(bCX, bCY - 14.5, bCZ, 12.0, bCY - 12.5, 12.0, 16, false, true);
    md.mat(2); col(md, 0.45, 0.35, 0.22);
    Bx(md, bCX - 3.0, bCX + 3.0, bCY - 22.0, bCY - 18.0, bCZ - 3.0, bCZ + 3.0);
    md.mat(11); col(md, 0.2, 0.22, 0.25);
    md.cyl(bCX, 0.0, bCZ, 2.5, bCY - 22.0, 1.5, 8, true, true);
    md.pop();
    S2.add(md, parisI0, 7, 5000);

    const pP = P(4200, -(hw + 38.0));
    addBuildingCollider(pP[0], pP[2], 20.0, 20.0, pP[3], pP[4], -pP[4], pP[3]);
  }

  // D. Lado Derecho: FUENTES DEL BELLAGIO y Grada VIP (s = 4700)
  {
    const bellI0 = mb.ni;
    const mBel = frame(4700, hw + 10.0, 0, 0);
    mb.push(mBel);
    mb.mat(2, 80, 80); col(mb, 0.18, 0.18, 0.22);
    Bx(mb, -35.0, 35.0, 0.0, 7.5, 0.0, 8.0);
    mb.mat(6, 200, 0); col(mb, 1.0, 0.92, 0.72);
    Bx(mb, -33.0, 33.0, 3.5, 4.2, -0.2, 0.2);
    Bx(mb, -33.0, 33.0, 7.0, 7.6, -0.2, 0.2);

    // LAGO DE LAS FUENTES DEL BELLAGIO (140 m x 65 m de agua detrás de la grada VIP)
    mb.mat(3, 40, 220); col(mb, 0.02, 0.08, 0.18);
    Bx(mb, -70.0, 70.0, 0.01, 0.05, 10.0, 74.0);
    mb.mat(2, 90, 80); col(mb, 0.88, 0.86, 0.82);
    Bx(mb, -72.0, 72.0, 0.0, 1.1, 9.0, 10.2);
    Bx(mb, -72.0, 72.0, 0.0, 1.1, 73.8, 75.0);

    // CHORROS DE AGUA ILUMINADOS:
    for (let wj = -58.0; wj <= 58.0; wj += 6.5) {
      const hJet = 35.0 + Math.abs(Math.sin(wj * 0.18)) * 42.0;
      mb.mat(6, 255, 0); col(mb, 0.95, 0.98, 1.0);
      mb.cyl(wj, 0.1, 28.0, 0.75, hJet, 0.25, 6, false, true);
      col(mb, 1.0, 0.90, 0.55);
      mb.cyl(wj, 0.1, 56.0, 0.65, hJet * 0.75, 0.22, 6, false, true);
    }
    mb.pop();
    S1.add(mb, bellI0, 7, 4500);

    const pB = P(4700, hw + 14.0);
    addBuildingCollider(pB[0], pB[2], 35.0, 4.0, pB[3], pB[4], -pB[4], pB[3]);
  }

  // E. Lado Derecho: The Cosmopolitan (s = 4900, 5010)
  {
    const cosmoI0 = mb.ni;
    for (const cS of [4900, 5010]) {
      const mCosmo = frame(cS, hw + 36.0, 0, 0);
      mb.push(mCosmo);
      mb.mat(2, 60, 140); col(mb, 0.11, 0.12, 0.15);
      Bx(mb, -22.0, 22.0, 0.0, 175.0, -16.0, 16.0);
      mb.mat(6, 255, 0); col(mb, 0.0, 0.85, 1.0);
      for (let y = 8; y < 172; y += 4.5) {
        Bx(mb, -22.4, 22.4, y, y + 0.35, -16.3, -15.8);
        Bx(mb, -22.4, 22.4, y, y + 0.35, 15.8, 16.3);
      }
      mb.pop();
      const pCos = P(cS, hw + 36.0);
      addBuildingCollider(pCos[0], pCos[2], 22.0, 16.0, pCos[3], pCos[4], -pCos[4], pCos[3]);
    }
    S1.add(mb, cosmoI0, 7, 4500);
  }

  // =========================================================================
  // 9. CAÑÓN URBANO DE RASCACIELOS CONTINUO (ZONA DE EXCLUSIÓN NO-BUILD ZONE >= 16M / >= 22M)
  // =========================================================================
  const stepS = 40;
  const nSteps = Math.floor(TRK.L / stepS);

  for (let st = 0; st < nSteps; st++) {
    const s = st * stepS;
    for (const side of [-1, 1]) {
      // Exclusiones explícitas para no interferir con monumentos ni paddock
      if (s >= 2100 && s <= 3750 && side < 0) continue; // MSG Sphere y Venetian
      if (s >= 800 && s <= 1200 && side < 0) continue;  // High Roller
      if (s >= 4500 && s <= 4900 && side > 0) continue; // Fuentes del Bellagio
      if (s >= 4000 && s <= 4350) continue;             // Caesars y Paris Eiffel Tower
      if (s >= TRK.pit.bldS0 - 30 && s <= TRK.pit.bldS1 + 35 && side > 0) continue; // Paddock
      if (s >= TRK.stand.s0 - 30 && s <= TRK.stand.s1 + 30 && side < 0) continue;   // Grada principal

      const w = 24.0 + rnd() * 14.0;
      const depth = 20.0 + rnd() * 10.0;
      const h = 55.0 + rnd() * 85.0;

      // Distancia mínima estricta según sector:
      // Curva superior izquierda (s ≈ 2500..3350): mínimo 22.0m desde el eje central
      const isUpperLeftCurve = (s >= 2500 && s <= 3350);
      const minRequiredDist = isUpperLeftCurve ? 22.0 : 16.0;

      // Distancia inicial desde el eje central:
      let curD = side * Math.max(minRequiredDist + depth * 0.5, getWallD(s, side) + side * (depth * 0.5 + 2.0));

      let valid = false;
      let finalX = 0, finalZ = 0, finalTx = 0, finalTz = 0, finalNx = 0, finalNz = 0;

      // Intentar hasta 4 desplazamientos hacia el exterior para asegurar la No-Build Zone
      for (let attempt = 0; attempt < 4; attempt++) {
        const pC = P(s, curD);
        finalX = pC[0]; finalZ = pC[2];
        finalTx = pC[3]; finalTz = pC[4];
        finalNx = -finalTz; finalNz = finalTx;

        // Bounding box en coordenadas locales (u a lo largo de tx/tz, v a lo largo de nx/nz)
        const halfW = w * 0.5, halfD = depth * 0.5;
        const testCorners = [
          [-halfW, -halfD], [halfW, -halfD],
          [-halfW, halfD],  [halfW, halfD],
          [0, -halfD],      [0, halfD],
          [-halfW, 0],      [halfW, 0]
        ];

        let minObservedDist = Infinity;
        for (const [lu, lv] of testCorners) {
          const wx = finalX + finalTx * lu + finalNx * lv;
          const wz = finalZ + finalTz * lu + finalNz * lv;
          locQ[0] = wx; locQ[1] = wz;
          trackLocateQ(-1, locQ);
          const dCenterline = Math.abs(locQ[3]);
          if (dCenterline < minObservedDist) minObservedDist = dCenterline;
        }

        if (minObservedDist >= minRequiredDist) {
          valid = true;
          break;
        } else {
          // Desplazar hacia el exterior a lo largo de la normal
          const pushAmount = (minRequiredDist - minObservedDist) + 1.5;
          curD += side * pushAmount;
          if (Math.abs(curD) > 55.0) break; // Demasiado lejos
        }
      }

      // Si no cumple holgura de seguridad, descartar edificio
      if (!valid) continue;

      const distToSph = Math.hypot(finalX - sphCX, finalZ - sphCZ);
      const distToHR = Math.hypot(finalX - hrCX, finalZ - hrCZ);
      if (distToSph < 185.0 && s >= 2500 && s <= 3750 && side < 0) continue;
      if (distToHR < 125.0 && s >= 820 && s <= 1140 && side < 0) continue;

      const m = frame(s, curD, 0, 0);
      const bI0 = mb.ni;
      mb.push(m);
      mb.mat(2, 60, 100); col(mb, 0.16 + rnd() * 0.18, 0.17 + rnd() * 0.18, 0.20 + rnd() * 0.22);
      Bx(mb, -w * 0.5, w * 0.5, 0, h, -depth * 0.5, depth * 0.5);

      const nFl = Math.floor(h / 4.2);
      for (let fl = 2; fl < nFl; fl += 2) {
        mb.mat(6, 170, 0); col(mb, 1.0, 0.94, 0.78);
        Bx(mb, -w * 0.46, w * 0.46, fl * 4.2, fl * 4.2 + 2.2, -depth * 0.52, -depth * 0.48);
      }

      const neonC = [[1.0, 0.15, 0.65], [0.1, 0.92, 1.0], [1.0, 0.85, 0.25], [0.75, 0.25, 1.0]][st % 4];
      mb.mat(6, 255, 0); col(mb, neonC[0], neonC[1], neonC[2]);
      Bx(mb, -w * 0.52, w * 0.52, h - 1.2, h, -depth * 0.53, -depth * 0.47);
      mb.pop();
      S1.add(mb, bI0, 7, 2800);

      // Registrar collider físico del edificio
      addBuildingCollider(finalX, finalZ, w * 0.5, depth * 0.5, finalTx, finalTz, finalNx, finalNz);
    }
  }

  // =========================================================================
  // 10. FAROLAS F1 CADA 35M Y PUENTES PEATONALES CON PANTALLAS LED
  // =========================================================================
  const floodStep = 35;
  const nFloods = Math.floor(TRK.L / floodStep);
  for (let f = 0; f < nFloods; f++) {
    const s = f * floodStep;
    for (const side of [-1, 1]) {
      const wallD = getWallD(s, side);
      const d = wallD + side * 1.6; // Mástil colocado estrictamente 1.6 m DETRÁS de la valla perimetral
      const pM = P(s, d);
      const tx = pM[3], tz = pM[4];
      const inX = tz * side, inZ = -tx * side;
      const xM = pM[0], yM = pM[1], zM = pM[2];
      const flI0 = mb.ni;

      mb.mat(1); col(mb, 0.85, 0.86, 0.90);
      mb.cyl(xM, yM, zM, 0.22, yM + 15.5, 0.12, 8, true, true);

      mb.mat(2, 80, 80); col(mb, 0.55, 0.56, 0.58);
      mb.cyl(xM, yM - 0.2, zM, 0.45, yM + 0.45, 0.42, 8, true, true);

      // Brazo superior de celosía que se extiende 4.0 m hacia la pista por encima del vallado
      const armEndX = xM + inX * 4.0, armEndY = yM + 15.2, armEndZ = zM + inZ * 4.0;
      mb.tube([[xM, yM + 15.2, zM], [armEndX, armEndY, armEndZ]], 0.08, 6);
      mb.tube([[xM, yM + 13.8, zM], [xM + inX * 2.2, yM + 15.2, zM + inZ * 2.2]], 0.05, 5);

      for (let q = 0; q < 4; q++) {
        const t = 1.6 + q * 0.75;
        const fx = xM + inX * t, fy = yM + 15.0, fz = zM + inZ * t;
        mb.mat(2, 120, 140); col(mb, 0.14, 0.15, 0.17);
        mb.box(fx, fy, fz, 0.45, 0.35, 0.45);
        mb.mat(6, 255, 0); col(mb, 1.0, 0.98, 0.94);
        mb.box(fx, fy - 0.16, fz, 0.40, 0.04, 0.40);
      }

      S1.add(mb, flI0, 7, 1800);
    }
  }

  // Puentes peatonales cerrados con pantallas LED cruzando por encima de la pista:
  for (const gS of [0, 800, 1750, 3600, 4250, 4800, 5600]) {
    const mB = frame(gS, 0.0, 0, 0);
    const pbI0 = mb.ni;
    mb.push(mB);
    const bridgeW = hw + 3.8;
    mb.mat(11); col(mb, 0.22, 0.24, 0.26);
    mb.cyl(-bridgeW, 0, 0, 0.65, 8.5, 0.65, 8, true, true);
    mb.cyl(bridgeW, 0, 0, 0.65, 8.5, 0.65, 8, true, true);

    mb.mat(2, 60, 80); col(mb, 0.15, 0.16, 0.18);
    Bx(mb, -2.5, 2.5, 6.5, 9.8, -bridgeW, bridgeW);

    mb.mat(6, 200, 0); col(mb, 0.9, 0.95, 1.0);
    Bx(mb, -2.6, -2.4, 7.2, 8.8, -(bridgeW - 0.5), bridgeW - 0.5);
    Bx(mb, 2.4, 2.6, 7.2, 8.8, -(bridgeW - 0.5), bridgeW - 0.5);

    mb.mat(6, 255, 0); col(mb, 0.0, 0.88, 1.0);
    Bx(mb, -2.7, -2.5, 6.6, 9.6, -6.5, 6.5);
    mb.pop();
    S1.add(mb, pbI0, 7, 2400);
  }
}

if (typeof window !== 'undefined') {
  window.buildVegasUrbanProps = buildVegasUrbanProps;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildVegasUrbanProps };
}
