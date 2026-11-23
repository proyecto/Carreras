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
      mb.mat(2, 40, 60); col(mb, 0.05, 0.35, 0.95);
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
      mb.mat(2, 60, 40); col(mb, 0.0, 0.48, 0.2);
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
      if (ph % 3 === 0) col(mb, 0.0, 0.88, 1.0);
      else if (ph % 3 === 1) col(mb, 1.0, 0.05, 0.58);
      else col(mb, 0.10, 0.10, 0.12);
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
    mb.mat(6, 250, 0); col(mb, 1.0, 0.12, 0.65);
    Bx(mb, 2.0, 14.0, 0.035, 0.045, -hw + 1.5, -hw + 3.2);
    mb.mat(6, 250, 0); col(mb, 0.0, 0.88, 1.0);
    Bx(mb, 4.0, 16.0, 0.035, 0.045, -hw + 3.6, -hw + 5.2);
    mb.pop();
    S1.add(mb, lvI0, 7, 650);
  }

  // =========================================================================
  // 3. PADDOCK BUILDING OFICIAL F1 LAS VEGAS (3 PLANTAS, NEGRO MATE, LOGO F1 LED)
  // =========================================================================
  if (typeof LandmarkFactory !== 'undefined' && typeof LandmarkFactory.createPaddockBuildingF1 === 'function') {
    LandmarkFactory.createPaddockBuildingF1({ ...ctx, addCollider: addBuildingCollider, rnd });
  }

  // =========================================================================
  // 4. LOS TRES EDIFICIOS CON FORMA DE 'Y' (TRI-WING TOWERS DE LAS VEGAS)
  // =========================================================================
  function buildTriWingTower(cx, cy, cz, h, wingLen, wingWid, yaw, facadeMat, wallColor, winColor, crownColor) {
    if (typeof LandmarkFactory !== 'undefined' && typeof LandmarkFactory.createTriWingTower === 'function') {
      LandmarkFactory.createTriWingTower(ctx, {
        cx, cy, cz, h, wingLen, wingWid, yaw, facadeMat, wallColor, winColor, crownColor,
        addCollider: addBuildingCollider
      });
    }
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
  const sphCX = spherePos[0], sphCY = spherePos[1], sphCZ = spherePos[2];
  if (typeof LandmarkFactory !== 'undefined' && typeof LandmarkFactory.createMsgSphere === 'function') {
    LandmarkFactory.createMsgSphere(ctx, { pos: spherePos, radius: sphR });
  }

  // =========================================================================
  // 6. THE HIGH ROLLER (NORIA GIGANTE MONUMENTAL DE THE LINQ)
  // =========================================================================
  const hrPos = (TRK.spec && TRK.spec.highRollerPos) || [90.0, 0.0, -900.0];
  const hrCX = hrPos[0], hrCY = hrPos[1], hrCZ = hrPos[2];
  if (typeof LandmarkFactory !== 'undefined' && typeof LandmarkFactory.createHighRoller === 'function') {
    LandmarkFactory.createHighRoller(ctx, { pos: hrPos });
  }

  // =========================================================================
  // 7. THE VENETIAN RESORT & CAMPANARIO DE SAN MARCOS (CURVAS 5 A 9)
  // =========================================================================
  if (typeof LandmarkFactory !== 'undefined' && typeof LandmarkFactory.createVenetianResort === 'function') {
    LandmarkFactory.createVenetianResort({ ...ctx, addCollider: addBuildingCollider });
  }

  // =========================================================================
  // 8. GRAN RECTA DEL STRIP (WYNN/ENCORE, CAESARS, PARIS, BELLAGIO, COSMO)
  // =========================================================================
  if (typeof LandmarkFactory !== 'undefined') {
    // Wynn & Encore Las Vegas, Caesars Palace, The Cosmopolitan
    if (typeof LandmarkFactory.createStripHotels === 'function') {
      LandmarkFactory.createStripHotels({ ...ctx, addCollider: addBuildingCollider });
    }
    // Paris Las Vegas: TORRE EIFFEL (165m) + GLOBO AEROSTÁTICO de neón
    if (typeof LandmarkFactory.createEiffelTowerAndBalloon === 'function') {
      LandmarkFactory.createEiffelTowerAndBalloon({ ...ctx, addCollider: addBuildingCollider });
    }
    // FUENTES DEL BELLAGIO y Grada VIP (lago con chorros de agua iluminados)
    if (typeof LandmarkFactory.createBellagioFountains === 'function') {
      LandmarkFactory.createBellagioFountains({ ...ctx, addCollider: addBuildingCollider });
    }
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
      const d = wallD + side * 1.6;
      const pM = P(s, d);
      const tx = pM[3], tz = pM[4];
      const inX = tz * side, inZ = -tx * side;
      const xM = pM[0], yM = pM[1], zM = pM[2];
      const flI0 = mb.ni;

      mb.mat(1); col(mb, 0.85, 0.86, 0.90);
      mb.cyl(xM, yM, zM, 0.22, yM + 15.5, 0.12, 8, true, true);

      mb.mat(2, 80, 80); col(mb, 0.55, 0.56, 0.58);
      mb.cyl(xM, yM - 0.2, zM, 0.45, yM + 0.45, 0.42, 8, true, true);

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
