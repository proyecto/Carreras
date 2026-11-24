'use strict';
/**
 * LandmarkFactory - Fábrica centralizada de monumentos y edificios arquitectónicos singulares (SOLID)
 *
 * Encapsula la construcción procedural de grandes estructuras y monumentos urbanos:
 * 1. createMsgSphere: MSG Sphere con orbe monumental, cúpula geodésica, base de hormigón y textura Planet Earth (earthColor).
 * 2. createHighRoller: Noria gigante High Roller (The LINQ) con patas de acero, buje, llanta de 56 radios (nRim = 56) y 28 cabinas esféricas.
 * 3. createTriWingTower: Torres rascacielos con planta en forma de 'Y' (The Venetian/Palazzo, The Mirage, Caesars Tower) a 120º.
 * 4. createEiffelTowerAndBalloon: Réplica monumental de la Torre Eiffel de París (165 m) y Globo Aerostático de neón.
 * 5. createBellagioFountains: Fuentes del Bellagio (lago de 140 m x 65 m, surtidores y chorros de agua iluminados) y tribuna VIP.
 * 6. createVenetianResort: Fachada de The Venetian y Campanario monumental de San Marcos con pináculo dorado.
 * 7. createStripHotels: Rascacielos emblemáticos del Strip (Wynn & Encore, Caesars Palace, The Cosmopolitan con columnas LED).
 * 8. createPaddockBuildingF1: Edificio de boxes oficial de 3 plantas en negro mate con MONUMENTAL LOGO F1 EN LA AZOTEA (f1Red) y grada F1.
 */

const LandmarkFactory = {
  /**
   * Helper para asignar color RGBA
   */
  col(m, r, g, b, a = 1.0) {
    if (m && typeof m.color === 'function') m.color(r, g, b, a);
  },

  /**
   * Helper para crear cajas delimitadas por min/max
   */
  Bx(m, u0, u1, y0, y1, v0, v1) {
    if (m && typeof m.box === 'function') {
      m.box((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2, Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0));
    }
  },

  /**
   * 1. MSG SPHERE (ORBE MONUMENTAL PLANET EARTH)
   */
  createMsgSphere(ctx, config = {}) {
    const { mb, md, S1, S2, TRK } = ctx;
    if (!mb || !md) return;

    const PI = Math.PI, PI2 = PI * 2;
    const spherePos = config.pos || (TRK && TRK.spec && TRK.spec.spherePos) || [-750.0, 0.0, -1410.0];
    const sphR = config.radius || (TRK && TRK.spec && TRK.spec.sphereR) || 64.0;
    const sphH = config.height || 88.0;
    const sphCX = spherePos[0], sphCY = spherePos[1], sphCZ = spherePos[2];

    const sphBaseI0 = mb.ni;
    mb.mat(3); this.col(mb, 0.22, 0.24, 0.26);
    mb.cyl(sphCX, sphCY - 0.5, sphCZ, sphR + 42.0, sphCY + 0.1, sphR + 40.0, 48, true, false);
    mb.mat(2); this.col(mb, 0.42, 0.44, 0.46);
    mb.cyl(sphCX, sphCY, sphCZ, sphR + 18.0, sphCY + 4.5, sphR + 14.0, 48, true, false);
    mb.mat(6, 255, 0); this.col(mb, 0.0, 0.88, 1.0);
    mb.cyl(sphCX, sphCY + 4.4, sphCZ, sphR + 14.1, sphCY + 4.8, sphR + 13.9, 48, false, true);
    if (S1) S1.add(mb, sphBaseI0, 7, 5000);

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
        md.mat(6, 255, 0); this.col(md, ec[0], ec[1], ec[2]);
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
    if (S2) S2.add(md, sphI0, 7, 5000);
    return { cx: sphCX, cz: sphCZ, radius: sphR };
  },

  /**
   * 2. THE HIGH ROLLER (NORIA GIGANTE MONUMENTAL DE THE LINQ)
   */
  createHighRoller(ctx, config = {}) {
    const { md, S2, TRK } = ctx;
    if (!md) return;

    const PI2 = Math.PI * 2;
    const hrPos = config.pos || (TRK && TRK.spec && TRK.spec.highRollerPos) || [90.0, 0.0, -900.0];
    const hrCX = hrPos[0], hrCY = hrPos[1], hrCZ = hrPos[2];
    const hrHubY = hrCY + 88.0, hrR = 78.0, hrW = 5.6;
    const hrM = (typeof m4basis === 'function')
      ? m4basis(m4(), 0, 0, -1, 0, 1, 0, 1, 0, 0, hrCX, hrCY, hrCZ)
      : new Float32Array(16);
    const hrI0 = md.ni;
    md.push(hrM);

    md.mat(11); this.col(md, 0.85, 0.86, 0.90);
    for (const sX of [-1, 1]) {
      for (const sZ of [-1, 1]) {
        const legBaseX = sX * 28.0, legBaseZ = sZ * 18.0;
        md.cyl(legBaseX, 0.0, legBaseZ, 1.6, hrHubY, sZ * 3.8, 12, true, true);
      }
    }
    md.mat(2); this.col(md, 0.3, 0.32, 0.36);
    md.cyl(0, hrHubY, -hrW * 0.8, 4.2, hrHubY, hrW * 0.8, 4.2, 16, true, true);

    const nRim = 56;
    for (let i = 0; i < nRim; i++) {
      const a0 = (i / nRim) * PI2, a1 = ((i + 1) / nRim) * PI2;
      const y0 = hrHubY + Math.sin(a0) * hrR, y1 = hrHubY + Math.sin(a1) * hrR;
      const z0 = Math.cos(a0) * hrR, z1 = Math.cos(a1) * hrR;
      md.mat(6, 250, 0); this.col(md, 0.85, 0.20, 1.0);
      for (const sX of [-hrW * 0.5, hrW * 0.5]) {
        md.cyl(sX, y0, z0, 0.45, sX, y1, z1, 0.45, 6, false, true);
      }
    }

    const nCabins = 28; // 28 Cabinas
    for (let c = 0; c < nCabins; c++) {
      const ang = (c / nCabins) * PI2;
      const cy = hrHubY + Math.sin(ang) * hrR, cz = Math.cos(ang) * hrR;
      md.mat(6, 220, 0); this.col(md, 1.0, 0.94, 0.82);
      md.cyl(0, cy - 2.4, cz, 3.2, cy + 2.4, 3.2, 12, true, true);
      md.mat(6, 255, 0); this.col(md, 0.85, 0.20, 1.0);
      md.cyl(0, cy - 0.2, cz, 3.4, cy + 0.2, 3.4, 12, false, true);
    }
    md.pop();
    if (S2) S2.add(md, hrI0, 7, 5000);
    return { cx: hrCX, cz: hrCZ, radius: hrR };
  },

  /**
   * 3. RASCACIELOS CON PLANTA EN FORMA DE 'Y' (TRI-WING TOWERS)
   */
  createTriWingTower(ctx, config) {
    const { mb, S1, addCollider } = ctx;
    if (!mb) return;

    const {
      cx, cy = 0.0, cz, h, wingLen, wingWid, yaw = 0,
      facadeMat = 2, wallColor, winColor, crownColor
    } = config;
    const PI2 = Math.PI * 2;
    const twI0 = mb.ni;
    const coreR = wingWid * 0.9;

    // Núcleo central hexagonal de ascensores
    mb.mat(facadeMat, 80, 100); this.col(mb, wallColor[0], wallColor[1], wallColor[2]);
    mb.cyl(cx, cy, cz, coreR, cy + h, coreR, 12, true, true);

    // Las tres alas simétricas a 120 grados
    for (let w = 0; w < 3; w++) {
      const ang = yaw + (w * PI2 / 3);
      const c = Math.cos(ang), s = Math.sin(ang);
      const nx = -s, nz = c;
      const midDist = coreR * 0.5 + wingLen * 0.5;
      const wx = cx + c * midDist, wz = cz + s * midDist;

      const mW = (typeof m4basis === 'function')
        ? m4basis(m4(), c, 0, s, 0, 1, 0, nx, 0, nz, wx, cy, wz)
        : new Float32Array(16);
      mb.push(mW);

      mb.mat(facadeMat, 80, 100); this.col(mb, wallColor[0], wallColor[1], wallColor[2]);
      this.Bx(mb, -wingLen * 0.5, wingLen * 0.5, 0, h, -wingWid * 0.5, wingWid * 0.5);

      const nFloors = Math.floor(h / 3.8);
      for (let fl = 2; fl < nFloors - 1; fl += 2) {
        const y0 = fl * 3.8, y1 = y0 + 2.1;
        mb.mat(6, 170, 0); this.col(mb, winColor[0], winColor[1], winColor[2]);
        this.Bx(mb, -wingLen * 0.46, wingLen * 0.46, y0, y1, -wingWid * 0.52, -wingWid * 0.49);
        this.Bx(mb, -wingLen * 0.46, wingLen * 0.46, y0, y1, wingWid * 0.49, wingWid * 0.52);
      }

      mb.mat(6, 255, 0); this.col(mb, crownColor[0], crownColor[1], crownColor[2]);
      this.Bx(mb, wingLen * 0.48, wingLen * 0.51, 10.0, h, -0.25, 0.25);
      mb.pop();

      if (typeof addCollider === 'function') {
        addCollider(wx, wz, wingLen * 0.5, wingWid * 0.5, c, s, nx, nz);
      }
    }

    // Corona iluminada en el ático
    mb.mat(6, 250, 0); this.col(mb, crownColor[0], crownColor[1], crownColor[2]);
    mb.cyl(cx, cy + h, cz, coreR * 1.05, cy + h + 6.0, coreR * 0.75, 12, true, true);
    if (S1) S1.add(mb, twI0, 7, 4500);
  },

  /**
   * 4. PARIS LAS VEGAS: TORRE EIFFEL (165m) Y GLOBO AEROSTÁTICO
   */
  createEiffelTowerAndBalloon(ctx, config = {}) {
    const { md, S2, frame, P, hw, addCollider } = ctx;
    if (!md || typeof frame !== 'function') return;

    const sTrack = config.s ?? 4200;
    const dTrack = -(hw + 38.0);
    const parisI0 = md.ni;
    const mP = frame(sTrack, dTrack, 0, 0);
    md.push(mP);

    // TORRE EIFFEL
    md.mat(11); this.col(md, 0.92, 0.78, 0.42);
    for (const sx of [-16.0, 16.0]) {
      for (const sz of [-16.0, 16.0]) {
        md.cyl(sx, 0.0, sz, 2.8, sx * 0.45, 52.0, sz * 0.45, 1.8, 8, true, true);
      }
    }
    md.mat(6, 220, 0); this.col(md, 1.0, 0.85, 0.4);
    md.cyl(0.0, 28.0, 0.0, 18.0, 34.0, 18.0, 16, false, true);
    md.mat(2); this.col(md, 0.85, 0.72, 0.35);
    this.Bx(md, -14.0, 14.0, 50.0, 54.0, -14.0, 14.0);
    this.Bx(md, -8.0, 8.0, 94.0, 97.0, -8.0, 8.0);
    for (const sx of [-7.0, 7.0]) {
      for (const sz of [-7.0, 7.0]) {
        md.cyl(sx * 1.0, 54.0, sz * 1.0, 1.6, sx * 0.45, 94.0, sz * 0.45, 1.1, 6, true, true);
      }
    }
    md.cyl(0.0, 97.0, 0.0, 4.2, 155.0, 1.2, 8, true, true);
    md.cyl(0.0, 155.0, 0.0, 1.8, 165.0, 0.2, 6, true, true);
    md.mat(6, 255, 0); this.col(md, 1.0, 0.98, 0.9);
    md.cyl(0.0, 165.0, 0.0, 0.8, 167.5, 0.8, 8, true, true);

    // GLOBO AEROSTÁTICO
    const bCX = 32.0, bCY = 45.0, bCZ = 0.0;
    for (let f = 0; f < 12; f++) {
      md.mat(6, 250, 0);
      if (f % 3 === 0) this.col(md, 0.1, 0.45, 1.0);
      else if (f % 3 === 1) this.col(md, 0.96, 0.96, 0.98);
      else this.col(md, 1.0, 0.1, 0.15);
      md.cyl(bCX, bCY - 12.0, bCZ, 9.5, bCY + 12.0, 11.5, 8, true, true);
    }
    md.mat(6, 255, 0); this.col(md, 1.0, 0.85, 0.15);
    md.cyl(bCX, bCY - 14.5, bCZ, 12.0, bCY - 12.5, 12.0, 16, false, true);
    md.mat(2); this.col(md, 0.45, 0.35, 0.22);
    this.Bx(md, bCX - 3.0, bCX + 3.0, bCY - 22.0, bCY - 18.0, bCZ - 3.0, bCZ + 3.0);
    md.mat(11); this.col(md, 0.2, 0.22, 0.25);
    md.cyl(bCX, 0.0, bCZ, 2.5, bCY - 22.0, 1.5, 8, true, true);
    md.pop();
    if (S2) S2.add(md, parisI0, 7, 5000);

    if (typeof addCollider === 'function' && typeof P === 'function') {
      const pP = P(sTrack, dTrack);
      addCollider(pP[0], pP[2], 20.0, 20.0, pP[3], pP[4], -pP[4], pP[3]);
    }
  },

  /**
   * 5. FUENTES DEL BELLAGIO (LAGO CON CHORROS DE AGUA ILUMINADOS Y GRADA VIP)
   */
  createBellagioFountains(ctx, config = {}) {
    const { mb, S1, frame, P, hw, addCollider } = ctx;
    if (!mb || typeof frame !== 'function') return;

    const sTrack = config.s ?? 4700;
    const dTrack = hw + 10.0;
    const bellI0 = mb.ni;
    const mBel = frame(sTrack, dTrack, 0, 0);
    mb.push(mBel);

    mb.mat(2, 80, 80); this.col(mb, 0.18, 0.18, 0.22);
    this.Bx(mb, -35.0, 35.0, 0.0, 7.5, 0.0, 8.0);
    mb.mat(6, 200, 0); this.col(mb, 1.0, 0.92, 0.72);
    this.Bx(mb, -33.0, 33.0, 3.5, 4.2, -0.2, 0.2);
    this.Bx(mb, -33.0, 33.0, 7.0, 7.6, -0.2, 0.2);

    // LAGO DE LAS FUENTES DEL BELLAGIO (140 m x 65 m de agua detrás de la grada VIP)
    mb.mat(3, 40, 220); this.col(mb, 0.02, 0.08, 0.18);
    this.Bx(mb, -70.0, 70.0, 0.01, 0.05, 10.0, 74.0);
    mb.mat(2, 90, 80); this.col(mb, 0.88, 0.86, 0.82);
    this.Bx(mb, -72.0, 72.0, 0.0, 1.1, 9.0, 10.2);
    this.Bx(mb, -72.0, 72.0, 0.0, 1.1, 73.8, 75.0);

    // CHORROS DE AGUA ILUMINADOS:
    for (let wj = -58.0; wj <= 58.0; wj += 6.5) {
      const hJet = 35.0 + Math.abs(Math.sin(wj * 0.18)) * 42.0;
      mb.mat(6, 255, 0); this.col(mb, 0.95, 0.98, 1.0);
      mb.cyl(wj, 0.1, 28.0, 0.75, hJet, 0.25, 6, false, true);
      this.col(mb, 1.0, 0.90, 0.55);
      mb.cyl(wj, 0.1, 56.0, 0.65, hJet * 0.75, 0.22, 6, false, true);
    }
    mb.pop();
    if (S1) S1.add(mb, bellI0, 7, 4500);

    if (typeof addCollider === 'function' && typeof P === 'function') {
      const pB = P(sTrack, hw + 14.0);
      addCollider(pB[0], pB[2], 35.0, 4.0, pB[3], pB[4], -pB[4], pB[3]);
    }
  },

  /**
   * 6. THE VENETIAN RESORT & CAMPANARIO DE SAN MARCOS
   */
  createVenetianResort(ctx, config = {}) {
    const { mb, S1, frame, P, hw, addCollider } = ctx;
    if (!mb || typeof frame !== 'function') return;

    const sTrack = config.s ?? 2400;
    const dTrack = -(hw + 38.0);
    const venI0 = mb.ni;
    const mVen = frame(sTrack, dTrack, 0, 0);
    mb.push(mVen);

    mb.mat(2, 90, 80); this.col(mb, 0.88, 0.82, 0.72);
    this.Bx(mb, -45.0, 45.0, 0.0, 32.0, -20.0, 20.0);
    mb.mat(6, 180, 0); this.col(mb, 1.0, 0.92, 0.75);
    for (let ar = -36.0; ar <= 36.0; ar += 12.0) {
      this.Bx(mb, ar - 4.0, ar + 4.0, 2.0, 10.0, 19.6, 20.5);
    }

    // CAMPANARIO DE SAN MARCOS
    mb.mat(2, 80, 60); this.col(mb, 0.78, 0.52, 0.38);
    this.Bx(mb, -6.0, 6.0, 0.0, 72.0, -28.0, -18.0);
    mb.mat(6, 220, 0); this.col(mb, 0.95, 0.95, 0.90);
    this.Bx(mb, -5.5, 5.5, 72.0, 82.0, -27.5, -18.5);
    mb.mat(2, 60, 40); this.col(mb, 0.22, 0.58, 0.46);
    mb.cyl(0.0, 82.0, -23.0, 6.0, 94.0, 0.1, 4, true, false);
    mb.mat(6, 255, 0); this.col(mb, 1.0, 0.85, 0.2);
    mb.cyl(0.0, 94.0, -23.0, 0.8, 97.5, 0.2, 6, true, true);
    mb.pop();
    if (S1) S1.add(mb, venI0, 7, 4000);

    if (typeof addCollider === 'function' && typeof P === 'function') {
      const pVenCenter = P(sTrack, dTrack);
      addCollider(pVenCenter[0], pVenCenter[2], 45.0, 20.0, pVenCenter[3], pVenCenter[4], -pVenCenter[4], pVenCenter[3]);
    }
  },

  /**
   * 7. HOTELES RESORT DEL STRIP (WYNN/ENCORE, CAESARS PALACE, THE COSMOPOLITAN)
   */
  createStripHotels(ctx) {
    const { mb, S1, frame, P, hw, addCollider } = ctx;
    if (!mb || typeof frame !== 'function') return;

    // A. Wynn & Encore Las Vegas (s = 3620, 3720)
    const wynnI0 = mb.ni;
    for (const wS of [3620, 3720]) {
      const mW = frame(wS, hw + 42.0, 0, 0);
      mb.push(mW);
      mb.mat(2, 80, 180); this.col(mb, 0.38, 0.24, 0.14);
      this.Bx(mb, -28.0, 28.0, 0.0, 175.0, -14.0, 14.0);
      mb.mat(6, 180, 0); this.col(mb, 1.0, 0.90, 0.65);
      for (let y = 10; y < 165; y += 7) {
        this.Bx(mb, -27.0, 27.0, y, y + 3.0, -14.2, -13.8);
      }
      mb.mat(6, 255, 0); this.col(mb, 0.98, 0.98, 1.0);
      this.Bx(mb, -24.0, 24.0, 175.0, 179.0, -14.5, -13.5);
      mb.pop();
      if (typeof addCollider === 'function' && typeof P === 'function') {
        const pW = P(wS, hw + 42.0);
        addCollider(pW[0], pW[2], 28.0, 14.0, pW[3], pW[4], -pW[4], pW[3]);
      }
    }
    if (S1) S1.add(mb, wynnI0, 7, 4500);

    // B. Caesars Palace (s = 4150)
    const caesI0 = mb.ni;
    const mC = frame(4150, hw + 38.0, 0, 0);
    mb.push(mC);
    mb.mat(2, 90, 80); this.col(mb, 0.94, 0.94, 0.96);
    this.Bx(mb, -45.0, 45.0, 0.0, 42.0, -18.0, 18.0);
    mb.mat(2, 90, 60); this.col(mb, 0.96, 0.96, 0.98);
    for (let x = -40.0; x <= 40.0; x += 3.5) {
      mb.cyl(x, 0.0, -19.5, 0.65, 18.0, 0.55, 12, true, true);
    }
    mb.mat(2, 90, 80); this.col(mb, 0.94, 0.94, 0.96);
    this.Bx(mb, -42.0, 42.0, 18.0, 21.0, -21.0, -17.0);
    mb.mat(6, 240, 0); this.col(mb, 1.0, 0.88, 0.5);
    this.Bx(mb, -28.0, 28.0, 21.0, 29.0, -20.5, -18.0);
    mb.mat(2, 80, 80); this.col(mb, 0.90, 0.90, 0.94);
    this.Bx(mb, -35.0, 35.0, 42.0, 120.0, 0.0, 25.0);
    mb.pop();
    if (S1) S1.add(mb, caesI0, 7, 4500);
    if (typeof addCollider === 'function' && typeof P === 'function') {
      const pC = P(4150, hw + 38.0);
      addCollider(pC[0], pC[2], 45.0, 18.0, pC[3], pC[4], -pC[4], pC[3]);
    }

    // C. The Cosmopolitan (s = 4900, 5010)
    const cosmoI0 = mb.ni;
    for (const cS of [4900, 5010]) {
      const mCosmo = frame(cS, hw + 36.0, 0, 0);
      mb.push(mCosmo);
      mb.mat(2, 60, 140); this.col(mb, 0.11, 0.12, 0.15);
      this.Bx(mb, -22.0, 22.0, 0.0, 175.0, -16.0, 16.0);
      mb.mat(6, 255, 0); this.col(mb, 0.0, 0.85, 1.0);
      for (let y = 8; y < 172; y += 4.5) {
        this.Bx(mb, -22.4, 22.4, y, y + 0.35, -16.3, -15.8);
        this.Bx(mb, -22.4, 22.4, y, y + 0.35, 15.8, 16.3);
      }
      mb.pop();
      if (typeof addCollider === 'function' && typeof P === 'function') {
        const pCos = P(cS, hw + 36.0);
        addCollider(pCos[0], pCos[2], 22.0, 16.0, pCos[3], pCos[4], -pCos[4], pCos[3]);
      }
    }
    if (S1) S1.add(mb, cosmoI0, 7, 4500);
  },

  /**
   * 8. PADDOCK BUILDING OFICIAL F1 LAS VEGAS Y GRADA PRINCIPAL TRICOLOR
   */
  createPaddockBuildingF1(ctx) {
    const { mb, md, mp, S1, S2, SP, TRK, frame, P, sign, REG, sitter, stander, CROWD, rnd = Math.random, addCollider } = ctx;
    if (!mb || typeof frame !== 'function') return;

    const padI0 = mb.ni;
    const bldS0 = TRK.pit.bldS0, bldS1 = TRK.pit.bldS1, padLen = bldS1 - bldS0;
    const padMidS = (bldS0 + bldS1) * 0.5;
    const padDepth = 15.0;
    const mPad = frame(padMidS, TRK.pit.bldD0, 0, 0);
    mb.push(mPad);

    // Bloque principal: negro mate oficial F1
    mb.mat(2, 60, 40); this.col(mb, 0.09, 0.10, 0.11);
    this.Bx(mb, -padLen * 0.5, padLen * 0.5, 0.0, 14.0, 0.0, padDepth);

    // 20 Garajes de boxes en planta baja
    const nBays = 20;
    const bayW = padLen / nBays;
    for (let b = 0; b < nBays; b++) {
      const u0 = -padLen * 0.5 + b * bayW + 0.3;
      const u1 = u0 + bayW - 0.6;
      mb.mat(11); this.col(mb, 0.16, 0.17, 0.19);
      this.Bx(mb, u0, u1, 0.0, 3.8, -0.05, 0.05);
      mb.mat(6, 200, 0); this.col(mb, 1.0, 0.90, 0.70);
      this.Bx(mb, u0 + 1.0, u1 - 1.0, 3.4, 3.7, -0.08, -0.02);
    }

    // Cristaleras panorámicas VIP en plantas 2 y 3
    mb.mat(6, 180, 0); this.col(mb, 1.0, 0.94, 0.78);
    this.Bx(mb, -padLen * 0.48, padLen * 0.48, 5.0, 8.8, -0.08, 0.05);
    this.Bx(mb, -padLen * 0.48, padLen * 0.48, 9.8, 13.6, -0.08, 0.05);

    // Línea de neón rojo F1 en cornisa superior
    mb.mat(6, 255, 0); this.col(mb, 1.0, 0.05, 0.02);
    this.Bx(mb, -padLen * 0.5, padLen * 0.5, 13.9, 14.15, -0.1, 0.1);

    // MONUMENTAL LOGO F1 EN LA AZOTEA (Tiras LED rojas visibles desde arriba)
    const f1Red = [1.0, 0.04, 0.02];
    mb.mat(6, 255, 0); this.col(mb, f1Red[0], f1Red[1], f1Red[2]);
    this.Bx(mb, -26.0, 14.0, 14.05, 14.3, 3.0, 4.8);
    this.Bx(mb, -22.0, 4.0, 14.05, 14.3, 7.5, 9.3);
    this.Bx(mb, -26.0, -22.5, 14.05, 14.3, 3.0, 13.0);
    this.Bx(mb, 20.0, 24.5, 14.05, 14.3, 3.0, 13.0);
    this.Bx(mb, 14.0, 22.0, 14.05, 14.3, 3.0, 4.8);
    mb.pop();
    if (S1) S1.add(mb, padI0, 7, 2500);

    if (typeof addCollider === 'function' && typeof P === 'function') {
      const pPadCenter = P(padMidS, TRK.pit.bldD0 + padDepth * 0.5);
      addCollider(pPadCenter[0], pPadCenter[2], padLen * 0.5, padDepth * 0.5, pPadCenter[3], pPadCenter[4], -pPadCenter[4], pPadCenter[3]);
    }

    // Grada principal F1 Las Vegas enfrente
    const stI0 = mb.ni, stD0 = md ? md.ni : 0;
    const standLen = 200.0, standDepth = 22.0;
    const mStand = frame(0, -14.0, 0, 0);
    mb.push(mStand);
    if (md) md.push(mStand);

    const nRow = 18, rowRise = 0.52, rowRun = 1.05, yBase = 1.25;
    const nSec = 6, aisleW = 2.4;
    const secW = (standLen - (nSec + 1) * aisleW) / nSec;
    const seatTones = [
      [0.92, 0.12, 0.12], // F1 Red
      [0.96, 0.96, 0.96], // Pure White
      [0.08, 0.45, 0.95], // Electric Blue
      [0.92, 0.12, 0.12],
      [0.96, 0.96, 0.96],
      [0.08, 0.45, 0.95]
    ];

    mb.mat(3); this.col(mb, 0.65, 0.65, 0.66);
    this.Bx(mb, -standLen * 0.5, standLen * 0.5, 0.0, yBase + 0.15, -0.6, 0.0);
    if (md && typeof sign === 'function') {
      const bannerW = 24.0;
      for (let bx = -standLen * 0.5 + 4.0; bx < standLen * 0.5 - bannerW; bx += bannerW + 6.0) {
        const brand = ['heineken', 'name', 'b1', 'b5', 'b2'][Math.floor((bx + 100) / 30) % 5];
        sign(md, bx + bannerW, 0.25, 0.02, -bannerW, 0, 0, 1.05, brand);
      }
    }

    for (let sec = 0; sec < nSec; sec++) {
      const u0 = -standLen * 0.5 + aisleW + sec * (secW + aisleW);
      const u1 = u0 + secW;
      const sTone = seatTones[sec % seatTones.length];

      for (let r = 0; r < nRow; r++) {
        const vFront = -0.7 - r * rowRun;
        const vBack = vFront - rowRun;
        const yFloor = yBase + r * rowRise;
        const yTop = yFloor + rowRise;

        mb.mat(3); this.col(mb, 0.55, 0.56, 0.58);
        mb.quad(u0, yFloor, vFront, u1, yFloor, vFront, u1, yTop, vFront, u0, yTop, vFront);
        mb.quad(u0, yTop, vFront, u1, yTop, vFront, u1, yTop, vBack, u0, yTop, vBack);

        if (md) {
          md.mat(8); this.col(md, sTone[0], sTone[1], sTone[2]);
          const seatV0 = vFront - 0.22, seatV1 = vBack + 0.18;
          md.quad(u0, yTop + 0.38, seatV0, u1, yTop + 0.38, seatV0, u1, yTop + 0.38, seatV1, u0, yTop + 0.38, seatV1);
          md.quad(u0, yTop + 0.38, seatV1, u1, yTop + 0.38, seatV1, u1, yTop + 0.82, seatV1, u0, yTop + 0.82, seatV1);
        }
      }

      const uAisle0 = u0 - aisleW, uAisle1 = u0;
      mb.mat(2, 100, 150); this.col(mb, 0.72, 0.73, 0.75);
      for (let r = 0; r < nRow; r++) {
        const vF = -0.7 - r * rowRun, vB = vF - rowRun;
        const yF = yBase + r * rowRise, yT = yF + rowRise;
        mb.quad(uAisle0, yF, vF, uAisle1, yF, vF, uAisle1, yT, vF, uAisle0, yT, vF);
        mb.quad(uAisle0, yT, vF, uAisle1, yT, vF, uAisle1, yT, vB, uAisle0, yT, vB);
      }
    }

    // Público en las gradas
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

    const yTopStand = yBase + nRow * rowRise;
    const vBackTotal = -0.7 - nRow * rowRun;
    mb.mat(3); this.col(mb, 0.35, 0.36, 0.38);
    mb.quad(standLen * 0.5, 0, vBackTotal, -standLen * 0.5, 0, vBackTotal, -standLen * 0.5, yTopStand + 3.0, vBackTotal, standLen * 0.5, yTopStand + 3.0, vBackTotal);
    mb.quad(-standLen * 0.5, 0, 0, -standLen * 0.5, 0, vBackTotal, -standLen * 0.5, yTopStand + 3.0, vBackTotal, -standLen * 0.5, yBase, 0);
    mb.quad(standLen * 0.5, 0, vBackTotal, standLen * 0.5, 0, 0, standLen * 0.5, yBase, 0, standLen * 0.5, yTopStand + 3.0, vBackTotal);

    const yRoofBack = yTopStand + 5.5;
    const yRoofFront = yTopStand + 2.8;
    mb.mat(11); this.col(mb, 0.92, 0.93, 0.95);
    mb.quad(-standLen * 0.52, yRoofBack, vBackTotal - 1.5, standLen * 0.52, yRoofBack, vBackTotal - 1.5, standLen * 0.52, yRoofFront, 0.5, -standLen * 0.52, yRoofFront, 0.5);

    mb.mat(2, 120, 80); this.col(mb, 0.82, 0.12, 0.12);
    this.Bx(mb, -standLen * 0.52, standLen * 0.52, yRoofFront - 0.25, yRoofFront + 0.15, 0.4, 0.6);

    mb.mat(2, 130, 90); this.col(mb, 0.22, 0.24, 0.28);
    for (let px = -standLen * 0.48; px <= standLen * 0.48 + 1.0; px += standLen / 8) {
      mb.cyl(px, 0.0, vBackTotal - 1.0, 0.35, yRoofBack + 2.5, 0.35, 10, false, true);
      mb.tube([[px, yRoofBack + 2.3, vBackTotal - 1.0], [px, yRoofFront + 0.1, -1.0]], 0.08, 6);
    }

    mb.mat(6, 255, 0); this.col(mb, 1.0, 0.98, 0.92);
    for (let lx = -standLen * 0.48; lx <= standLen * 0.48; lx += 12.0) {
      this.Bx(mb, lx - 1.8, lx + 1.8, yRoofFront - 0.4, yRoofFront - 0.1, 0.1, 0.45);
    }

    mb.mat(6, 220, 0); this.col(mb, 0.15, 0.65, 1.0);
    for (const sx of [-standLen * 0.5 + 1.5, standLen * 0.5 - 1.5]) {
      this.Bx(mb, sx - 0.2, sx + 0.2, yTopStand - 4.0, yTopStand + 2.5, -1.2, 0.2);
    }

    mb.pop();
    if (md) md.pop();
    if (S1) S1.add(mb, stI0, 3, 2200);
    if (md && S2 && md.ni > stD0) S2.add(md, stD0, 7, 1600);

    if (typeof addCollider === 'function' && typeof P === 'function') {
      const pStandCenter = P(0, -14.0 - standDepth * 0.5);
      addCollider(pStandCenter[0], pStandCenter[2], standLen * 0.5, standDepth * 0.5, pStandCenter[3], pStandCenter[4], -pStandCenter[4], pStandCenter[3]);
    }
  }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
  window.LandmarkFactory = LandmarkFactory;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { LandmarkFactory };
}
