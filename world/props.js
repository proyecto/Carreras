'use strict';
// ---- 32_props.js
// Elementos de pista: guardarraíles, barreras de neumáticos, muros, vallas, semáforo de salida, gradas, boxes, torre,
// puestos de comisarios, señalización, paneles de patrocinio y paddock.
const PROPS = { sets: [], regions: {} };

// ---------- letras desenhadas por caminhos (retas + curvas de Bézier) numa caixa 4x6; traço grosso de ponta redonda ----------
const GLY = {
  A: 'M0,0L2,6L4,0M.8,2L3.2,2', B: 'M0,0L0,6L2.2,6C4.2,6 4.2,3.2 2.2,3.2L0,3.2M2.2,3.2C4.7,3.2 4.7,0 2.2,0L0,0', C: 'M4,4.6C3.4,6.4 0,6.6 0,3C0,-.6 3.4,-.4 4,1.4',
  D: 'M0,0L0,6L1.6,6C5,6 5,0 1.6,0L0,0', E: 'M4,6L0,6L0,0L4,0M0,3.1L3.2,3.1', F: 'M4,6L0,6L0,0M0,3.1L3.2,3.1', G: 'M4,4.6C3.4,6.4 0,6.6 0,3C0,-.6 3.6,-.5 4,1.2L4,2.8L2.2,2.8',
  H: 'M0,0L0,6M4,0L4,6M0,3.1L4,3.1', I: 'M1.1,0L1.1,6M0,0L2.2,0M0,6L2.2,6', J: 'M3.6,6L3.6,1.8C3.6,-.6 .2,-.6 .2,1.6', K: 'M0,0L0,6M4,6L0,2.4M1.5,3.7L4,0', L: 'M0,6L0,0L3.8,0',
  M: 'M0,0L0,6L2.35,2.2L4.7,6L4.7,0', N: 'M0,0L0,6L4,0L4,6', O: 'M2,6C-.7,6 -.7,0 2,0C4.7,0 4.7,6 2,6Z', P: 'M0,0L0,6L2.2,6C4.6,6 4.6,2.8 2.2,2.8L0,2.8',
  Q: 'M2,6C-.7,6 -.7,0 2,0C4.7,0 4.7,6 2,6ZM2.6,1.4L4.2,-.4', R: 'M0,0L0,6L2.2,6C4.6,6 4.6,2.8 2.2,2.8L0,2.8M2.2,2.8L4,0', S: 'M3.8,4.8C3.4,6.4 .2,6.5 .2,4.5C.2,2.6 3.9,3.5 3.9,1.5C3.9,-.6 .4,-.4 0,1.3',
  T: 'M0,6L4,6M2,6L2,0', U: 'M0,6L0,2C0,-.7 4,-.7 4,2L4,6', V: 'M0,6L2,0L4,6', W: 'M0,6L1.25,0L2.5,4.2L3.75,0L5,6', X: 'M0,0L4,6M0,6L4,0', Y: 'M0,6L2,3L4,6M2,3L2,0', Z: 'M0,6L4,6L0,0L4,0',
  0: 'M2,6C-.4,6 -.4,0 2,0C4.4,0 4.4,6 2,6Z', 1: 'M.1,4.6L1.5,6L1.5,0M.1,0L2.9,0', 2: 'M.2,4.6C.4,6.6 3.9,6.5 3.9,4.4C3.9,2.8 .2,1.6 .1,0L4,0',
  3: 'M.2,5C.8,6.5 3.8,6.5 3.8,4.6C3.8,3.3 2.6,3.2 1.6,3.2C2.8,3.2 4,3 4,1.6C4,-.5 .6,-.5 0,1.2', 4: 'M3,0L3,6L0,1.8L4.2,1.8', 5: 'M3.8,6L.5,6L.3,3.4C1.6,4.2 4,3.9 4,1.8C4,-.5 .6,-.5 0,1.1',
  6: 'M3.6,5.4C2.6,6.6 .1,6.2 .1,2.8C.1,-.7 4,-.6 4,1.9C4,4.2 .6,4.2 .1,2.4', 7: 'M0,6L4,6L1.4,0', 8: 'M2,3.2C-.2,3.2 -.2,6 2,6C4.2,6 4.2,3.2 2,3.2C-.6,3.2 -.6,0 2,0C4.6,0 4.6,3.2 2,3.2Z',
  9: 'M.4,.6C1.4,-.6 3.9,-.2 3.9,3.2C3.9,6.7 0,6.6 0,4.1C0,1.8 3.4,1.8 3.9,3.6', '-': 'M.2,2.8L2.6,2.8', '.': 'M.55,.05L.65,.05',
};
// Fuente proporcional con interletraje
const GWID = { I: 2.2, 1: 3.0, ' ': 1.9, '-': 2.8, '.': 1.2, J: 3.7, L: 3.8, M: 4.7, W: 5.0, E: 3.9, F: 3.8, T: 4.0, C: 4.0, S: 3.95 };
const gAdv = ch => (GWID[ch] === undefined ? 4.1 : GWID[ch]) + 1.05;
function textW(txt, h) { let w = 0; for (const ch of txt) w += gAdv(ch); return (w - 1.05) * h / 6; }
function strokeText(g, txt, x, y, h, color, weight, skew) {
  const u = h / 6; g.save(); g.translate(x, y + h); if (skew) g.transform(1, 0, -skew, 1, 0, 0);
  g.strokeStyle = color; g.lineWidth = u * (weight || 1.0); g.lineCap = 'round'; g.lineJoin = 'round';
  let cx = 0;
  for (const ch of txt) {
    const gl = GLY[ch];
    if (gl) {
      g.beginPath();
      for (const m of gl.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
        const n = m[2].trim().split(/[ ,]+/).filter(t => t.length).map(Number), X = k => cx + n[k] * u, Y = k => -n[k] * u;
        if (m[1] === 'M') g.moveTo(X(0), Y(1)); else if (m[1] === 'L') g.lineTo(X(0), Y(1)); else if (m[1] === 'C') g.bezierCurveTo(X(0), Y(1), X(2), Y(3), X(4), Y(5)); else g.closePath();
      }
      g.stroke();
    }
    cx += u * gAdv(ch);
  }
  g.restore();
}
// Figuras humanas en el atlas para público y comisarios
// Canales: sombreado, máscara de vestimenta y recorte
// Filtrado anti-aliasing con bordes limpios sin halos
// kind 0 = sentada (160x224), kind 1 = em pé (104x288). Coordenadas lógicas; o canvas está em escala 2x.
// ---------- gente pintada: figura humana desenhada por caminhos (curvas de Bézier, gradientes, sombras) ----------
// Canais do desenho: R = sombreamento pintado (claro/escuro) | G = máscara da roupa de cima (recebe a tinta da instância)
// | B = máscara de cabelo/calça/sapato. Pele: G = B = 0. kind 0 = sentada (vista de frente, cortada no colo), 1 = em pé.
function personSprite(g, ox, oy, W, H, kind, rnd) {
  const C = (r, m) => `rgb(${r | 0},${m === 1 ? 255 : 0},${m === 2 ? 255 : 0})`, CA = (r, m, a) => `rgba(${r | 0},${m === 1 ? 255 : 0},${m === 2 ? 255 : 0},${a})`;
  const grad = (x0, y0, x1, y1, r0, r1, m) => { const q = g.createLinearGradient(x0, y0, x1, y1); q.addColorStop(0, C(r0, m)); q.addColorStop(1, C(r1, m)); return q; };
  g.lineCap = 'round'; g.lineJoin = 'round'; g.globalCompositeOperation = 'source-over';
  const fem = rnd() < 0.42, u = (kind ? 35 : 31) * (0.93 + rnd() * 0.14), big = 0.9 + rnd() * 0.26;
  const cx = ox + W / 2 + (rnd() - 0.5) * 6, lean = (rnd() - 0.5) * (kind ? 3 : 9), look = (rnd() - 0.5) * 0.9;
  const ty = oy + (kind ? 10 : 16) + rnd() * 8, hx = cx + lean, hy = ty + u * 0.5, rx = u * 0.36, ry = u * 0.5;
  const sy = ty + u * 1.2, shw = u * (fem ? 0.84 : 1.0) * big, wy = sy + u * 1.7, ww = shw * (fem ? 0.74 : 0.9), hipY = wy + u * 0.38, hipW = shw * (fem ? 0.98 : 0.92);
  const sx = cx + lean * 0.45;                                    // eixo do tronco (inclina menos que a cabeça)
  const sleeve = rnd() < 0.45 ? 0 : 1, pose = rnd();              // manga curta/comprida; pose dos braços
  // ---- pernas ----
  if (kind) {
    const footY = oy + H - 8, kneeY = hipY + (footY - hipY) * 0.5;
    for (const sd of [-1, 1]) {
      const lx = sx + sd * hipW * 0.5, fx = lx + sd * (2 + rnd() * 3);
      g.fillStyle = grad(0, hipY, 0, footY, 150, 78, 2); g.beginPath(); g.moveTo(lx - hipW * 0.5, hipY - 4); g.bezierCurveTo(lx - hipW * 0.5, kneeY, fx - u * 0.2, kneeY, fx - u * 0.17, footY - 6);
      g.lineTo(fx + u * 0.17, footY - 6); g.bezierCurveTo(fx + u * 0.22, kneeY, lx + hipW * 0.5, kneeY, lx + hipW * 0.5, hipY - 4); g.closePath(); g.fill();
      g.fillStyle = C(38, 2); g.beginPath(); g.ellipse(fx + sd * 2, footY - 3, u * 0.24, 6, 0, 0, TAU); g.fill();
    }
    g.strokeStyle = CA(60, 2, 0.5); g.lineWidth = 2; g.beginPath(); g.moveTo(sx, hipY + 6); g.lineTo(sx, hipY + u * 1.6); g.stroke();   // vão entre as pernas
  } else {
    const kY = Math.min(oy + H - 6, hipY + u * 0.95);
    for (const sd of [-1, 1]) {
      const kx = sx + sd * hipW * 0.62;
      g.fillStyle = grad(0, hipY - 6, 0, kY, 165, 88, 2); g.beginPath(); g.moveTo(sx - sd * 2, hipY - 8); g.lineTo(sx + sd * hipW * 1.02, hipY - 8);
      g.bezierCurveTo(sx + sd * hipW * 1.1, hipY + u * 0.5, kx + sd * u * 0.32, kY, kx, kY); g.bezierCurveTo(kx - sd * u * 0.34, kY, sx - sd * 3, hipY + u * 0.5, sx - sd * 2, hipY - 8); g.closePath(); g.fill();
      const kg = g.createRadialGradient(kx, kY - u * 0.3, 1, kx, kY - u * 0.3, u * 0.36); kg.addColorStop(0, CA(205, 2, 0.75)); kg.addColorStop(1, CA(205, 2, 0)); g.fillStyle = kg; g.beginPath(); g.arc(kx, kY - u * 0.3, u * 0.36, 0, TAU); g.fill();   // joelho pegando luz
    }
  }
  // ---- tronco: trapézio do pescoço, ombros caídos, cintura ----
  const torso = () => {
    g.beginPath(); g.moveTo(sx - u * 0.2, sy - u * 0.12); g.bezierCurveTo(sx - shw * 0.55, sy - u * 0.08, sx - shw * 0.95, sy + u * 0.02, sx - shw, sy + u * 0.24);
    g.bezierCurveTo(sx - shw * 1.02, sy + u * 0.9, sx - ww, wy - u * 0.3, sx - ww, wy); g.bezierCurveTo(sx - ww, wy + u * 0.2, sx - hipW, hipY - u * 0.1, sx - hipW, hipY);
    g.lineTo(sx + hipW, hipY); g.bezierCurveTo(sx + hipW, hipY - u * 0.1, sx + ww, wy + u * 0.2, sx + ww, wy); g.bezierCurveTo(sx + ww, wy - u * 0.3, sx + shw * 1.02, sy + u * 0.9, sx + shw, sy + u * 0.24);
    g.bezierCurveTo(sx + shw * 0.95, sy + u * 0.02, sx + shw * 0.55, sy - u * 0.08, sx + u * 0.2, sy - u * 0.12); g.closePath();
  };
  g.fillStyle = grad(0, sy - u * 0.1, 0, hipY, 238, 138, 1); torso(); g.fill();
  g.save(); torso(); g.clip();
  // volume: laterais mais escuras, sombra sob o peito/barriga, dobras do tecido
  for (const sd of [-1, 1]) { const q = g.createLinearGradient(sx + sd * shw * 1.02, 0, sx + sd * shw * 0.35, 0); q.addColorStop(0, CA(70, 1, 0.6)); q.addColorStop(1, CA(70, 1, 0)); g.fillStyle = q; g.fillRect(sx + (sd < 0 ? -shw * 1.1 : shw * 0.3), sy - u * 0.2, shw * 0.8, hipY - sy + u * 0.3); }
  { const q = g.createLinearGradient(0, wy - u * 0.5, 0, hipY); q.addColorStop(0, CA(80, 1, 0)); q.addColorStop(1, CA(80, 1, 0.45)); g.fillStyle = q; g.fillRect(sx - shw * 1.1, wy - u * 0.5, shw * 2.2, hipY - wy + u * 0.5); }
  g.lineWidth = 2.2; for (let k = 0; k < 5; k++) {
    const fy = sy + u * (0.5 + rnd() * 1.4), fx = sx + (rnd() - 0.5) * shw * 1.3, fl = u * (0.25 + rnd() * 0.35), sg = rnd() < 0.5 ? -1 : 1;
    g.strokeStyle = CA(95, 1, 0.3); g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + sg * fl * 0.5, fy + fl * 0.5, fx + sg * fl, fy + fl * 0.25); g.stroke();
    g.strokeStyle = CA(250, 1, 0.22); g.beginPath(); g.moveTo(fx, fy - 2.5); g.quadraticCurveTo(fx + sg * fl * 0.5, fy + fl * 0.5 - 2.5, fx + sg * fl, fy + fl * 0.25 - 2.5); g.stroke();
  }
  if (rnd() < 0.3) { g.strokeStyle = CA(105, 1, 0.5); g.lineWidth = 1.6; g.beginPath(); g.moveTo(sx, sy + u * 0.1); g.lineTo(sx + lean * 0.1, hipY); g.stroke(); }      // abertura de jaqueta/camisa
  g.restore();
  // decote/gola: pele em V ou redondo, ou gola polo clara
  const neckT = rnd();
  g.fillStyle = C(178, 0); g.beginPath(); if (neckT < 0.45) { g.moveTo(sx - u * 0.19, sy - u * 0.13); g.lineTo(sx, sy + u * (0.12 + rnd() * 0.2)); g.lineTo(sx + u * 0.19, sy - u * 0.13); } else g.ellipse(sx, sy - u * 0.1, u * 0.2, u * 0.12, 0, 0, PI); g.fill();
  if (neckT > 0.75) { g.strokeStyle = C(250, 1); g.lineWidth = 3; g.beginPath(); g.moveTo(sx - u * 0.24, sy - u * 0.14); g.lineTo(sx - u * 0.06, sy + u * 0.1); g.moveTo(sx + u * 0.24, sy - u * 0.14); g.lineTo(sx + u * 0.06, sy + u * 0.1); g.stroke(); }
  // ---- braços: braço (manga) + antebraço + mão, em poses variadas ----
  const limb = (x0, y0, x1, y1, w0, w1, r0, r1, m) => {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    g.fillStyle = grad(x0, y0, x1, y1, r0, r1, m); g.beginPath(); g.moveTo(x0 + nx * w0, y0 + ny * w0); g.lineTo(x1 + nx * w1, y1 + ny * w1); g.arc(x1, y1, w1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), dx * ny - dy * nx > 0);
    g.lineTo(x0 - nx * w0, y0 - ny * w0); g.arc(x0, y0, w0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), dx * ny - dy * nx > 0); g.closePath(); g.fill();
    g.strokeStyle = CA(60, m, 0.35); g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0 - nx * w0, y0 - ny * w0); g.lineTo(x1 - nx * w1, y1 - ny * w1); g.stroke();
  };
  const aw = u * (fem ? 0.14 : 0.17) * big, raise = !kind && pose > 0.86 ? (rnd() < 0.5 ? -1 : 1) : 0, crossed = pose < 0.2, hips = kind && pose > 0.55 && pose < 0.75;
  for (const sd of [-1, 1]) {
    const ax = sx + sd * (shw - aw * 0.7), ay = sy + u * 0.3; let ex, ey, fx, fy;
    if (raise === sd) { ex = ax + sd * u * 0.42; ey = ay - u * 0.55; fx = ex + sd * u * 0.1; fy = ey - u * 0.85; }
    else if (crossed) { ex = ax + sd * u * 0.08; ey = ay + u * 0.95; fx = sx - sd * shw * 0.35; fy = ey - u * 0.12 + sd * 3; }
    else if (hips) { ex = ax + sd * u * 0.42; ey = ay + u * 0.8; fx = sx + sd * ww * 0.95; fy = wy + u * 0.15; }
    else if (kind) { ex = ax + sd * u * 0.1; ey = ay + u * 0.98; fx = ex - sd * u * 0.02; fy = ey + u * 0.88; }
    else if (pose > 0.6) { ex = ax + sd * u * 0.12; ey = ay + u * 0.92; fx = sx + sd * u * 0.12; fy = sy + u * (0.9 + rnd() * 0.3); }            // mãos juntas no peito (celular, copo)
    else { ex = ax + sd * u * 0.1; ey = ay + u * 0.95; fx = sx + sd * hipW * (0.35 + rnd() * 0.3); fy = hipY + u * (0.25 + rnd() * 0.2); }        // mãos no colo
    const mx = sleeve ? ex : ax + (ex - ax) * 0.55, my = sleeve ? ey : ay + (ey - ay) * 0.55;
    limb(ax, ay, mx, my, aw * 1.12, aw, 225, 150, 1);
    if (!sleeve) limb(mx, my, ex, ey, aw * 0.86, aw * 0.8, 215, 170, 0);
    limb(ex, ey, fx, fy, aw * (sleeve ? 0.95 : 0.78), aw * (sleeve ? 0.8 : 0.66), sleeve ? 205 : 210, sleeve ? 150 : 172, sleeve ? 1 : 0);
    g.fillStyle = C(205, 0); g.beginPath(); g.ellipse(fx + (fx - ex) * 0.12, fy + (fy - ey) * 0.12, aw * 0.78, aw * 0.95, Math.atan2(fy - ey, fx - ex) + PI / 2, 0, TAU); g.fill();   // mão
  }
  // ---- pescoço e cabeça ----
  g.fillStyle = grad(0, hy + ry * 0.5, 0, sy, 150, 190, 0); g.beginPath(); g.moveTo(hx - u * 0.17, hy + ry * 0.55); g.lineTo(sx - u * 0.19, sy - u * 0.08); g.lineTo(sx + u * 0.19, sy - u * 0.08); g.lineTo(hx + u * 0.17, hy + ry * 0.55); g.closePath(); g.fill();
  g.fillStyle = CA(95, 0, 0.6); g.beginPath(); g.ellipse(hx, hy + ry * 0.92, u * 0.19, u * 0.1, 0, 0, TAU); g.fill();        // sombra do queixo no pescoço
  // orelhas, crânio oval com queixo mais estreito
  g.fillStyle = C(185, 0); for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(hx + sd * rx * 0.98 - look * 2, hy + ry * 0.08, rx * 0.16, ry * 0.2, 0, 0, TAU); g.fill(); }
  const hg = g.createRadialGradient(hx - rx * 0.3 + look * 3, hy - ry * 0.35, 1, hx, hy, ry * 1.25); hg.addColorStop(0, C(246, 0)); hg.addColorStop(0.65, C(205, 0)); hg.addColorStop(1, C(150, 0));
  const skull = () => {
    g.beginPath(); g.moveTo(hx, hy - ry); g.bezierCurveTo(hx + rx * 1.1, hy - ry, hx + rx * 1.12, hy + ry * 0.1, hx + rx * 0.82, hy + ry * 0.55); g.bezierCurveTo(hx + rx * 0.55, hy + ry * 1.0, hx - rx * 0.55, hy + ry * 1.0, hx - rx * 0.82, hy + ry * 0.55);
    g.bezierCurveTo(hx - rx * 1.12, hy + ry * 0.1, hx - rx * 1.1, hy - ry, hx, hy - ry); g.closePath();
  };
  g.fillStyle = hg; skull(); g.fill();
  // rosto sugerido (deslocado conforme o olhar): órbitas sombreadas, sobrancelhas, nariz e boca discretos
  const fxo = look * rx * 0.3, ey0 = hy - ry * 0.02;
  g.save(); skull(); g.clip();
  g.fillStyle = CA(120, 0, 0.42); for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(hx + fxo + sd * rx * 0.42, ey0, rx * 0.26, ry * 0.11, 0, 0, TAU); g.fill(); }
  g.fillStyle = CA(40, 0, 0.75); for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(hx + fxo + sd * rx * 0.42, ey0 + 0.5, rx * 0.13, ry * 0.05, 0, 0, TAU); g.fill(); }
  g.strokeStyle = CA(70, 0, 0.6); g.lineWidth = 1.5; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(hx + fxo + sd * rx * 0.2, ey0 - ry * 0.16); g.lineTo(hx + fxo + sd * rx * 0.66, ey0 - ry * 0.18); g.stroke(); }
  g.strokeStyle = CA(120, 0, 0.5); g.lineWidth = 1.6; g.beginPath(); g.moveTo(hx + fxo * 1.3 + rx * 0.06, ey0 + ry * 0.05); g.lineTo(hx + fxo * 1.5 + rx * 0.1, ey0 + ry * 0.36); g.lineTo(hx + fxo * 1.3 - rx * 0.06, ey0 + ry * 0.38); g.stroke();
  g.strokeStyle = CA(105, 0, 0.6); g.lineWidth = 1.7; g.beginPath(); g.moveTo(hx + fxo - rx * 0.26, hy + ry * 0.6); g.quadraticCurveTo(hx + fxo, hy + ry * (0.62 + rnd() * 0.08), hx + fxo + rx * 0.26, hy + ry * 0.6); g.stroke();
  { const q = g.createLinearGradient(hx - rx, 0, hx + rx, 0); q.addColorStop(0, CA(90, 0, look > 0 ? 0.05 : 0.38)); q.addColorStop(0.5, CA(90, 0, 0)); q.addColorStop(1, CA(90, 0, look > 0 ? 0.38 : 0.05)); g.fillStyle = q; g.fillRect(hx - rx * 1.2, hy - ry, rx * 2.4, ry * 2); }
  if (!fem && rnd() < 0.3) { g.fillStyle = CA(70, 2, 0.5); g.beginPath(); g.ellipse(hx + fxo, hy + ry * 0.72, rx * 0.62, ry * 0.3, 0, 0, PI); g.fill(); }                    // barba
  g.restore();
  // ---- cabelo / boné / chapéu ----
  const hs = rnd(), hairTop = (lowY) => {
    g.beginPath(); g.moveTo(hx - rx * 1.08, lowY); g.bezierCurveTo(hx - rx * 1.25, hy - ry * 1.0, hx - rx * 0.6, hy - ry * 1.22, hx, hy - ry * 1.18);
    g.bezierCurveTo(hx + rx * 0.6, hy - ry * 1.22, hx + rx * 1.25, hy - ry * 1.0, hx + rx * 1.08, lowY);
  };
  const fr = hy - ry * (0.48 + rnd() * 0.2);
  if (fem && hs < 0.7) {       // cabelo comprido caindo sobre os ombros (ou preso)
    const len = hs < 0.45 ? sy + u * (0.2 + rnd() * 0.5) : hy + ry * 0.7;
    g.fillStyle = grad(0, hy - ry, 0, len, 215, 110, 2); hairTop(hy); g.bezierCurveTo(hx + rx * 1.35, hy + ry, hx + rx * 1.2, len, hx + rx * 0.75, len); g.lineTo(hx + rx * 0.72, hy + ry * 0.2);
    g.bezierCurveTo(hx + rx * 0.7, fr, hx - rx * 0.3 + fxo, fr - 4, hx - rx * 0.72, hy + ry * 0.2); g.lineTo(hx - rx * 0.75, len); g.bezierCurveTo(hx - rx * 1.2, len, hx - rx * 1.35, hy + ry, hx - rx * 1.08, hy); g.closePath(); g.fill();
  } else if (hs < 0.62) {      // cabelo curto
    g.fillStyle = grad(0, hy - ry * 1.2, 0, hy, 205, 120, 2); const sideY = hy + ry * (rnd() * 0.25 - 0.05); hairTop(sideY);
    g.bezierCurveTo(hx + rx * 0.9, hy - ry * 0.3, hx + rx * 0.5 + fxo, fr, hx + fxo, fr + 2); g.bezierCurveTo(hx - rx * 0.5 + fxo, fr - 2, hx - rx * 0.9, hy - ry * 0.3, hx - rx * 1.08, sideY); g.closePath(); g.fill();
  } else if (hs < 0.84) {      // boné (na cor da roupa ou escuro) com aba
    const m = rnd() < 0.5 ? 1 : 2; g.fillStyle = grad(0, hy - ry * 1.2, 0, hy - ry * 0.3, 235, 150, m); hairTop(hy - ry * 0.38); g.closePath(); g.fill();
    g.fillStyle = C(120, m); g.beginPath(); g.ellipse(hx + fxo * 2.5, hy - ry * 0.36, rx * 1.25, ry * 0.13, 0, 0, TAU); g.fill();
    g.fillStyle = CA(70, 0, 0.45); g.beginPath(); g.ellipse(hx + fxo, hy - ry * 0.2, rx * 0.9, ry * 0.14, 0, 0, TAU); g.fill();                                              // sombra da aba no rosto
  } else if (hs < 0.92) {      // chapéu de aba larga
    g.fillStyle = grad(0, hy - ry * 1.3, 0, hy - ry * 0.4, 240, 170, 1); g.beginPath(); g.ellipse(hx, hy - ry * 0.5, rx * 1.9, ry * 0.2, 0, 0, TAU); g.fill(); hairTop(hy - ry * 0.5); g.closePath(); g.fill();
    g.fillStyle = CA(70, 0, 0.5); g.beginPath(); g.ellipse(hx + fxo, hy - ry * 0.28, rx * 0.95, ry * 0.17, 0, 0, TAU); g.fill();
  } else { g.fillStyle = CA(120, 2, 0.5); hairTop(hy - ry * 0.55); g.closePath(); g.fill(); }                                                                             // careca/raspado
  if (rnd() < 0.18) { g.strokeStyle = C(30, 2); g.lineWidth = 2.6; g.beginPath(); for (const sd of [-1, 1]) { g.moveTo(hx + fxo + sd * rx * 0.2, ey0); g.lineTo(hx + fxo + sd * rx * 0.68, ey0); } g.stroke(); g.lineWidth = 1.2; g.beginPath(); g.moveTo(hx + fxo - rx * 0.2, ey0); g.lineTo(hx + fxo + rx * 0.2, ey0); g.stroke(); }   // óculos escuros
}
// desenha n figuras lado a lado e devolve os pixels (alfa reto) prontos para writeTexture
function personStrip(n, kind, seed, pw, ph) {
  const W = n * pw * 2, H = ph * 2, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const cm = mk(), gm = cm.getContext('2d'); gm.scale(2, 2);
  const rnd = mkRng(seed); for (let i = 0; i < n; i++) { gm.save(); gm.beginPath(); gm.rect(i * pw + 2, 2, pw - 4, ph - 4); gm.clip(); personSprite(gm, i * pw, 0, pw, ph, kind, rnd); gm.restore(); }
  // cor: a figura dilatada (cópias deslocadas) por baixo da figura nítida
  const cc = mk(), gc = cc.getContext('2d');
  for (const r of [10, 6, 3]) for (let a = 0; a < 8; a++) gc.drawImage(cm, Math.cos(a * PI / 4) * r, Math.sin(a * PI / 4) * r);
  gc.drawImage(cm, 0, 0);
  const col = gc.getImageData(0, 0, W, H).data, msk = gm.getImageData(0, 0, W, H).data, out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) { out[i * 4] = col[i * 4]; out[i * 4 + 1] = col[i * 4 + 1]; out[i * 4 + 2] = col[i * 4 + 2]; out[i * 4 + 3] = msk[i * 4 + 3]; }   // getImageData já devolve alfa reto
  return { data: out, w: W, h: H };
}
function atlasBuild() {
  // atlas de 4096x2048 (o desenho usa coordenadas lógicas de 2048x1024, em escala 2x: letreiros nítidos de perto)
  const cv = document.createElement('canvas'); cv.width = 4096; cv.height = 2048; const g = cv.getContext('2d'); g.scale(2, 2);
  g.fillStyle = '#888'; g.fillRect(0, 0, 2048, 1024);
  const REG = PROPS.regions, reg = (name, x, y, w, h) => { REG[name] = [x / 2048, y / 1024, (x + w) / 2048, (y + h) / 1024]; };
  const centered = (txt, x, y, w, h, th, color, weight, skew) => strokeText(g, txt, x + (w - textW(txt, th)) / 2, y + (h - th) / 2, th, color, weight, skew);
  // nome do circuito
  g.fillStyle = '#0b2a4a'; g.fillRect(0, 0, 1024, 128); g.fillStyle = '#e8b21c'; g.fillRect(0, 0, 1024, 10); g.fillRect(0, 118, 1024, 10);
  centered('CIRCUITO SERRA DA MATA', 0, 0, 1024, 128, 50, '#f4f1e6', 1.75, 0.1); reg('name', 0, 0, 1024, 128);
  // setas de curva (chevrons)
  g.fillStyle = '#e9e6dc'; g.fillRect(1024, 0, 512, 128); g.fillStyle = '#b3160f';
  for (let i = 0; i < 5; i++) { const x = 1034 + i * 102; g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 48, 8); g.lineTo(x + 92, 64); g.lineTo(x + 48, 120); g.lineTo(x, 120); g.lineTo(x + 44, 64); g.closePath(); g.fill(); }
  reg('chev', 1024, 0, 512, 128);
  // faixa "BOXES"
  g.fillStyle = '#d8d6ce'; g.fillRect(1536, 0, 512, 128); centered('BOXES', 1536, 0, 512, 128, 74, '#16181c', 1.8, 0.1); reg('boxes', 1536, 0, 512, 128);
  // marcas inventadas
  const brands = [
    ['ARARA PNEUS', '#c9281c', '#fff6e0', 0], ['TORQUE FREIOS', '#16181c', '#f2c318', 1], ['CAFE SERRANO', '#3b2416', '#f0dfc0', 2], ['JATOBA SEGUROS', '#0f5d3a', '#f4f4ee', 3],
    ['VELA NORTE', '#f0efe8', '#1b3f8f', 4], ['ESCADAS ALUMINAR', '#b8bec4', '#12202e', 5], ['ZEBRA TINTAS', '#f4f4f0', '#111111', 6], ['GUARANA DO VALE', '#1f7a2e', '#ffe14a', 2],
    ['RADIO PISTA 98', '#5a1b78', '#ffffff', 1], ['MOTOR CLUBE DA MATA', '#e0791a', '#1a1a1a', 0], ['OFICINA DO TONHO', '#18406b', '#ffd23a', 3], ['POSTO IPE 24H', '#f2d21f', '#16501e', 4],
  ];
  brands.forEach((b, i) => {
    const x = (i % 4) * 512, y = 128 + Math.floor(i / 4) * 128; g.fillStyle = b[1]; g.fillRect(x, y, 512, 128);
    g.fillStyle = b[2]; g.strokeStyle = b[2]; g.lineWidth = 7;
    const ic = b[3], ix = x + 62, iy = y + 64;
    if (ic === 0) { g.beginPath(); g.arc(ix, iy, 36, 0, TAU); g.stroke(); g.beginPath(); g.arc(ix, iy, 14, 0, TAU); g.fill(); }
    else if (ic === 1) { g.beginPath(); g.moveTo(ix - 34, iy + 32); g.lineTo(ix + 4, iy - 36); g.lineTo(ix + 2, iy - 2); g.lineTo(ix + 34, iy - 32); g.lineTo(ix - 2, iy + 36); g.lineTo(ix, iy + 4); g.closePath(); g.fill(); }
    else if (ic === 2) { g.beginPath(); g.ellipse(ix, iy, 26, 38, 0.5, 0, TAU); g.fill(); g.strokeStyle = b[1]; g.lineWidth = 5; g.beginPath(); g.moveTo(ix - 12, iy + 30); g.quadraticCurveTo(ix + 10, iy, ix + 8, iy - 34); g.stroke(); }
    else if (ic === 3) { g.beginPath(); g.moveTo(ix, iy - 40); g.lineTo(ix + 36, iy - 22); g.lineTo(ix + 30, iy + 18); g.lineTo(ix, iy + 40); g.lineTo(ix - 30, iy + 18); g.lineTo(ix - 36, iy - 22); g.closePath(); g.stroke(); }
    else if (ic === 4) { g.beginPath(); g.moveTo(ix - 36, iy + 34); g.lineTo(ix, iy - 38); g.lineTo(ix + 36, iy + 34); g.closePath(); g.fill(); }
    else if (ic === 5) { g.lineWidth = 8; g.beginPath(); g.moveTo(ix - 22, iy - 40); g.lineTo(ix - 22, iy + 40); g.moveTo(ix + 22, iy - 40); g.lineTo(ix + 22, iy + 40); for (let k = -2; k <= 2; k++) { g.moveTo(ix - 22, iy + k * 16); g.lineTo(ix + 22, iy + k * 16); } g.stroke(); }
    else { for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(ix - 40 + k * 18, iy + 38); g.lineTo(ix - 22 + k * 18, iy - 38); g.lineTo(ix - 12 + k * 18, iy - 38); g.lineTo(ix - 30 + k * 18, iy + 38); g.closePath(); g.fill(); } }
    const th = Math.min(62, 376 / textW(b[0], 1)); centered(b[0], x + 116, y, 388, 128, th, b[2], 1.8, 0.1);
    reg('b' + i, x, y, 512, 128);
  });
  PROPS.nBrands = brands.length;
  // placas de distância: chapa de 256x208 com margem; número em traço grosso contínuo
  ['150', '100', '50'].forEach((t, i) => { const x = 960 + i * 256, y = 512; g.fillStyle = '#f1efe6'; g.fillRect(x, y, 256, 208); g.strokeStyle = '#141414'; g.lineWidth = 9; g.strokeRect(x + 10, y + 10, 236, 188); centered(t, x, y, 256, 208, t.length > 2 ? 78 : 104, '#141414', 1.75, 0); reg('d' + t, x, y, 256, 208); });
  // números das garagens
  for (let i = 0; i < 20; i++) { const x = (i % 10) * 96, y = 640 + Math.floor(i / 10) * 64; g.fillStyle = '#16181c'; g.fillRect(x, y, 96, 64); centered((i < 9 ? '0' : '') + (i + 1), x, y, 96, 64, 40, '#f2c318', 1.4, 0); reg('g' + i, x, y, 96, 64); }
  // faixas genéricas: listras diagonais (cavaletes) e cor lisa
  g.fillStyle = '#e9e6dc'; g.fillRect(480, 512, 256, 128); g.fillStyle = '#c9281c'; for (let k = -2; k < 8; k++) { g.beginPath(); g.moveTo(480 + k * 48, 640); g.lineTo(504 + k * 48, 640); g.lineTo(552 + k * 48, 512); g.lineTo(528 + k * 48, 512); g.closePath(); g.fill(); }
  reg('stripe', 484, 516, 248, 120);
  const tex = mkTex(4096, 2048, 'rgba8unorm-srgb', TU.RT | TU.TB | TU.CD, { mipLevelCount: 12 });
  G.dev.queue.copyExternalImageToTexture({ source: cv }, { texture: tex }, [4096, 2048]);
  // gente: 16 figuras sentadas (128x224 lógicos = 256x448 px) e 3 em pé (104x288 = 208x576 px), pintadas por caminhos, enviadas em alfa reto por cima do atlas
  const sit = personStrip(16, 0, 31, 128, 224), std = personStrip(3, 1, 57, 104, 288);
  G.dev.queue.writeTexture({ texture: tex, origin: [0, 1600] }, sit.data, { bytesPerRow: sit.w * 4 }, [sit.w, sit.h]);
  G.dev.queue.writeTexture({ texture: tex, origin: [3456, 1024] }, std.data, { bytesPerRow: std.w * 4 }, [std.w, std.h]);
  for (let i = 0; i < 16; i++) reg('p' + i, i * 128 + 3, 803, 122, 218);
  for (let i = 0; i < 3; i++) reg('s' + i, 1728 + i * 104 + 3, 515, 98, 282);
  genMips(tex, 'rgba8unorm-srgb');
  return tex;
}

function propsBuild() {
  const hw = TRK.hw, N = TRK.N, ds = TRK.ds, pit = TRK.pit, REG = PROPS.regions;
  const atlas = atlasBuild();
  const fam = mkFamily('props', { src: 'mat_props' }), famDS = mkFamily('propsDS', { src: 'mat_props', cull: 'none' });
  const bg3 = G.dev.createBindGroup({ layout: fam.bgl3, entries: [{ binding: 0, resource: atlas.createView() }] });
  const S1 = new RangeSet(fam, bg3), S2 = new RangeSet(famDS, bg3);     // S1: sólidos (culling de face); S2: chapas de dupla face
  const mb = new MeshBuilder(1 << 18), md = new MeshBuilder(1 << 17);
  // Personajes (público, comisarios, mecánicos): carteles orientados verticalmente hacia la cámara
  const famP = mkFamily('crowd', { src: 'world_crowd', cull: 'none', noShadow: true });
  const SP = new RangeSet(famP, G.dev.createBindGroup({ layout: famP.bgl3, entries: [{ binding: 0, resource: atlas.createView() }] })), mp = new MeshBuilder(1 << 15);
  const fenceMB = new MeshBuilder(1 << 12), fenceR = [];
  const o5 = new Float64Array(5), mt = m4();
  const sI = s => (((Math.round(s / ds)) % N) + N) % N;
  const srOf = i => { const s = i * ds; return s > TRK.L / 2 ? s - TRK.L : s; };
  // Punto del mundo en (s, d) con la altura del terreno
  const P = (s, d) => { trackPos(s, d, o5); const y = Math.abs(d) < hw + 1.5 ? o5[1] : hfAt(o5[0], o5[2]); return [o5[0], y, o5[2], o5[3], o5[4]]; };
  // matriz local→mundo em (s,d): X = tangente, Y = cima, Z = direita; yaw extra opcional
  const frame = (s, d, yaw, yOff) => { const p = P(s, d); let tx = p[3], tz = p[4]; if (yaw) { const c = Math.cos(yaw), sn = Math.sin(yaw), a = tx * c - tz * sn, b = tx * sn + tz * c; tx = a; tz = b; } return m4basis(m4(), tx, 0, tz, 0, 1, 0, -tz, 0, tx, p[0], p[1] + (yOff || 0), p[2]); };
  const col = (m, r, g, b, a) => m.color(r, g, b, a === undefined ? 1 : a);
  // placa do atlas: canto inferior esquerdo p, vetor "direita" r (comprimento = largura), altura h, nome da região
  // fade = distância de sumiço pontilhado / 4 m (0 = nunca some)
  const sign = (m, px, py, pz, rx, ry, rz, h, name, fade) => {
    const r = REG[name]; m.mat(7, 0, 0, fade || 0); col(m, 1, 1, 1);
    m.quad(px, py, pz, px + rx, py + ry, pz + rz, px + rx, py + ry + h, pz + rz, px, py + h, pz, r[0], r[3], r[2], r[1]);
  };

  // ================= guard-rails =================
  // afastamento da barreira por lado e amostra (NaN = sem guard-rail ali)
  const d1At = sr => { const e = sat(Math.min((sr - pit.s0) / 45, (pit.s1 - sr) / 45)); return lerp(hw + 4.5, pit.laneD1, e) + 0.8; };
  const railD = (side, i) => {
    const sr = srOf(i);
    if (side < 0) return (sr > TRK.stand.s0 - 22 && sr < TRK.stand.s1 + 22) ? NaN : -TRK.barL[i];
    if (sr < pit.s0 - 40 || sr > pit.s1 + 36) return TRK.barR[i];
    if (sr < pit.s0 - 4) return lerp(TRK.barR[i], d1At(pit.s0 - 4), smooth(pit.s0 - 40, pit.s0 - 4, sr));
    if (sr < pit.bldS0) return d1At(sr);
    if (sr < pit.bldS1) return NaN;
    if (sr < pit.s1) return d1At(sr);
    return lerp(d1At(pit.s1), TRK.barR[i], smooth(pit.s1, pit.s1 + 36, sr));
  };
  PROPS.railD = railD;
  const wprof = [[0.02, -0.155], [0.045, -0.14], [0.08, -0.11], [0.08, -0.05], [0.03, -0.022], [0.005, 0], [0.03, 0.022], [0.08, 0.05], [0.08, 0.11], [0.045, 0.14], [0.02, 0.155]];
  // Extrusão do perfil ao longo do caminho usando a tangente da PISTA em cada ponto (igual nos dois lados de qualquer emenda
  // de trecho: não há costura). Faces planas por segmento do perfil: o vinco do "W" fica marcado; o fundo dos vales é mais escuro.
  const railStrip = (path, prof, yb) => {
    for (let k = 0; k < prof.length - 1; k++) {
      const pa = prof[k], pb = prof[k + 1], na = pb[1] - pa[1], nb = -(pb[0] - pa[0]), base = md.nv;
      for (let r = 0; r < path.length; r++) {
        const p = path[r], rx = -p[4], rz = p[3];   // direita da pista
        for (const pr of [pa, pb]) { col(md, 1, 1, 1, 0.42 + 0.58 * sat(Math.abs(pr[0]) / 0.08)); md.v(p[0] + rx * pr[0], p[1] + yb + pr[1], p[2] + rz * pr[0], rx * na, nb, rz * na, r * 2, pr[1]); }
      }
      for (let r = 0; r < path.length - 1; r++) { const a = base + r * 2; md.quadI(a, a + 2, a + 3, a + 1); }
    }
  };
  for (const side of [-1, 1]) {
    // lado esquerdo: pista à direita do sentido de marcha (+a); lado direito: pista à esquerda (−a), perfil invertido
    const prof = side < 0 ? wprof : wprof.map(p => [-p[0], p[1]]).reverse();
    let path = [], postPts = [], hadPrev = false, joinNext = false;
    const flush = () => {
      if (path.length > 1) {
        const i0 = md.ni; md.mat(1, 0, 0, 110);
        railStrip(path, prof, 0.42); railStrip(path, prof, 0.78);
        S2.add(md, i0, 3, 630);
        // postes em "C" com calço atrás de cada lâmina e parafuso no fundo do vale (somem junto, a ~110 m)
        const j0 = mb.ni;
        for (const p of postPts) {
          mb.push(p.m); mb.mat(11, 0, 0, 28); col(mb, 1, 1, 1, 0.9); mb.box(0, 0.48, 0.085 * side, 0.07, 0.96, 0.11);
          for (const yb of [0.42, 0.78]) { mb.box(0, yb, 0.02 * side, 0.1, 0.2, 0.05); mb.mat(2, 90, 200, 28); col(mb, 0.55, 0.56, 0.58); mb.box(0, yb, -0.016 * side, 0.04, 0.04, 0.02); mb.mat(11, 0, 0, 28); col(mb, 1, 1, 1, 0.9); }
          mb.pop();
        }
        S1.add(mb, j0, 3, 162);
        // terminal arredondado ("nariz") onde o guard-rail começa ou termina de verdade
        const t0 = mb.ni; mb.mat(1, 0, 0, 110); col(mb, 1, 1, 1);
        if (!hadPrev) { const p = path[0]; mb.cyl(p[0], p[1] + 0.24, p[2], 0.17, p[1] + 0.97, 0.17, 10, true, true); }
        if (!joinNext) { const p = path[path.length - 1]; mb.cyl(p[0], p[1] + 0.24, p[2], 0.17, p[1] + 0.97, 0.17, 10, true, true); }
        S1.add(mb, t0, 3, 630);
      }
      hadPrev = joinNext; path = []; postPts = [];
    };
    for (let i = 0; i <= N; i += 2) {
      const q = i % N, d = railD(side, q);
      if (isNaN(d)) { joinNext = false; flush(); hadPrev = false; continue; }
      const p = P(q * ds, d); path.push(p); postPts.push({ m: frame(q * ds, d) });
      if (path.length >= 36) { const last = path[path.length - 1], lp = postPts[postPts.length - 1]; joinNext = true; flush(); path.push(last); postPts.push(lp); }
    }
    joinNext = false; flush();
  }

  // ================= Barreras de neumáticos =================
  {
    const tyProf = []; for (let k = 0; k < 5; k++) { const y = k * 0.2; tyProf.push([y + 0.008, 0.262], [y + 0.05, 0.31], [y + 0.15, 0.31], [y + 0.192, 0.262]); }
    tyProf.push([1.0, 0.262], [1.0, 0.17], [0.86, 0.165]);
    const rotY = m4rotZ(m4(), PI / 2);
    for (const side of [-1, 1]) {
      const fl = side < 0 ? TRK.tyreL : TRK.tyreR, bar = side < 0 ? TRK.barL : TRK.barR;
      let acc = 0, n = 0, i0 = mb.ni, j0 = md.ni, run = 0, prev = null;
      const endChunk = () => { if (n) { S1.add(mb, i0, 3, 198); S2.add(md, j0, 7, 1200); } i0 = mb.ni; j0 = md.ni; n = 0; };
      for (let i = 0; i < N; i++) {
        if (fl[i] < 0.5) { endChunk(); run = 0; prev = null; acc = 0; continue; }
        acc += ds;
        while (acc >= 0.64) {
          acc -= 0.64; const s = i * ds - acc, d = side * (trkAt(bar, i, 0) - 0.62), p = P(s, d);
          // tinta: blocos de 6 pilhas brancas/vermelhas nos primeiros e últimos 25 m de cada barreira; resto preto
          const blk = Math.floor(run / 6) % 2, painted = (Math.floor(run / 6) % 4) < 2;
          const c = painted ? (blk ? [0.55, 0.05, 0.04] : [0.62, 0.62, 0.6]) : [0.02, 0.02, 0.02];
          mb.mat(15); col(mb, c[0], c[1], c[2], 0.85);
          mb.push(m4mul(m4(), m4translate(mt, p[0], p[1] - 0.02, p[2]), rotY)); mb.lathe(tyProf, 9); mb.pop();
          // substituto distante: tira frontal + topo, por pilha
          if (prev) {
            md.mat(12); col(md, c[0], c[1], c[2], 0.9);
            const nx = -(-p[4]) * side, nz = -(p[3]) * side;                 // normal apontando para a pista
            const ax = prev[0] + nx * 0.3, az = prev[2] + nz * 0.3, bx = p[0] + nx * 0.3, bz = p[2] + nz * 0.3;
            const cx = prev[0] - nx * 0.3, cz = prev[2] - nz * 0.3, dx = p[0] - nx * 0.3, dz = p[2] - nz * 0.3;
            const quadN = (x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, n0, n1, n2, u0, v0, u1, v1) => { const a = md.v(x0, y0, z0, n0, n1, n2, u0, v0), b = md.v(x1, y1, z1, n0, n1, n2, u1, v0), c2 = md.v(x2, y2, z2, n0, n1, n2, u1, v1), d2 = md.v(x3, y3, z3, n0, n1, n2, u0, v1); const ex = x1 - x0, ey = y1 - y0, ez = z1 - z0, fx = x3 - x0, fy = y3 - y0, fz = z3 - z0; if ((ey * fz - ez * fy) * n0 + (ez * fx - ex * fz) * n1 + (ex * fy - ey * fx) * n2 >= 0) md.quadI(a, b, c2, d2); else md.quadI(a, d2, c2, b); };
            quadN(ax, prev[1], az, bx, p[1], bz, bx, p[1] + 1.0, bz, ax, prev[1] + 1.0, az, nx, 0, nz, run, 0, run + 1, 5);
            quadN(ax, prev[1] + 1.0, az, bx, p[1] + 1.0, bz, dx, p[1] + 1.0, dz, cx, prev[1] + 1.0, cz, 0, 1, 0, run, 0.0, run + 1, 1.0);
            quadN(dx, p[1], dz, cx, prev[1], cz, cx, prev[1] + 1.0, cz, dx, p[1] + 1.0, dz, -nx, 0, -nz, run + 1, 0, run, 5);
          }
          prev = p; run++; n++;
          if (n >= 26) endChunk();
        }
      }
      endChunk();
    }
  }

  // ================= muros e alambrados da reta =================
  // muro contínuo ao longo de (s0..s1) em d, com alambrado por cima (hf = altura total)
  const wallFence = (s0, s1, d, faceSide, hWall, hf, stripe) => {
    const path = []; for (let s = s0; s <= s1 + 0.01; s += 4) path.push(P(s, d));
    const t = 0.14, prof = [[-t, 0], [t, 0], [t, hWall], [-t, hWall]];
    for (let k = 0; k < path.length - 1; k += 12) {
      const seg = path.slice(k, k + 13), i0 = mb.ni;
      mb.mat(3); col(mb, 0.52, 0.51, 0.49); mb.sweep(seg.map(p => [p[0], p[1] - 0.25, p[2]]), prof.map(p => [p[0], p[1] + 0.25]), { closedProfile: true, hard: true });
      // faixa pintada no lado da pista
      if (stripe) { mb.mat(2, 128, 0); col(mb, stripe[0], stripe[1], stripe[2]); mb.sweep(seg.map(p => [p[0], p[1] + hWall * 0.42, p[2]]), faceSide > 0 ? [[t + 0.004, 0], [t + 0.004, 0.3]] : [[-t - 0.004, 0.3], [-t - 0.004, 0]], {}); }
      // postes e cabos do alambrado
      S1.add(mb, i0, 3, 900);
      const p0 = mb.ni; mb.mat(11, 0, 0, 11); col(mb, 1, 1, 1);
      for (const p of seg.slice(0, 12)) mb.cyl(p[0], p[1] + hWall, p[2], 0.035, p[1] + hf, 0.035, 6, false, true);
      for (const hh of [hWall + 0.05, hf - 0.03]) mb.tube(seg.map(p => [p[0], p[1] + hh, p[2]]), 0.02, 5);
      S1.add(mb, p0, 1, 64);
      const f0 = fenceMB.ni; let u = (k % 3) * 0.0; fenceMB.color((hf - hWall) / 25.5, 1, 1, 1);
      for (let q = 0; q < seg.length - 1; q++) {
        const a = seg[q], b = seg[q + 1], L = Math.hypot(b[0] - a[0], b[2] - a[2]);
        fenceMB.quad(a[0], a[1] + hWall, a[2], b[0], b[1] + hWall, b[2], b[0], b[1] + hf, b[2], a[0], a[1] + hf, a[2], u, 0, u + L, hf - hWall); u += L;
      }
      const m = seg[Math.floor(seg.length / 2)]; fenceR.push({ first: f0, count: fenceMB.ni - f0, x: m[0], y: m[1] + 2, z: m[2], rad: 30 });
    }
  };
  const wallEnd = (s, d, hWall, hf, dir) => {
    const i0 = mb.ni; mb.push(frame(s, d));
    // Pilar de hormigón + rampa de remate hasta el suelo + poste final de valla
    mb.mat(3); col(mb, 0.52, 0.51, 0.49); mb.box(0, (hWall - 0.38) / 2, 0, 0.48, hWall + 0.62, 0.48);
    const X = dir * 2.4, z = 0.14;
    const q4 = (p, nx, ny, nz) => { const ex = p[3] - p[0], ey = p[4] - p[1], ez = p[5] - p[2], fx = p[9] - p[0], fy = p[10] - p[1], fz = p[11] - p[2]; if ((ey * fz - ez * fy) * nx + (ez * fx - ex * fz) * ny + (ex * fy - ey * fx) * nz >= 0) mb.quad(...p); else mb.quad(p[0], p[1], p[2], p[9], p[10], p[11], p[6], p[7], p[8], p[3], p[4], p[5]); };
    q4([0, -0.5, z, X, -0.5, z, X, -0.25, z, 0, hWall, z], 0, 0, 1); q4([0, -0.5, -z, X, -0.5, -z, X, -0.25, -z, 0, hWall, -z], 0, 0, -1);
    q4([0, hWall, -z, 0, hWall, z, X, -0.25, z, X, -0.25, -z], 0, 1, 0);
    mb.mat(1); col(mb, 1, 1, 1); mb.cyl(0, hWall, 0, 0.06, hf + 0.05, 0.06, 6, false, true);
    mb.pop(); S1.add(mb, i0, 3, 900);
  };
  wallFence(pit.bldS0 - 2, pit.s1 - 38, pit.wallD, -1, 1.05, 3.3, [0.05, 0.16, 0.4]);                    // muro dos boxes
  wallFence(TRK.stand.s0 - 22, TRK.stand.s1 + 22, -(hw + 3.4), 1, 1.0, 4.4, [0.62, 0.1, 0.06]);          // frente da arquibancada
  wallEnd(pit.bldS0 - 2, pit.wallD, 1.05, 3.3, -1); wallEnd(pit.s1 - 38, pit.wallD, 1.05, 3.3, 1); wallEnd(TRK.stand.s0 - 22, -(hw + 3.4), 1.0, 4.4, -1); wallEnd(TRK.stand.s1 + 22, -(hw + 3.4), 1.0, 4.4, 1);

  // ================= construções na reta (coordenadas locais: u = s relativo à linha, y, v = d) =================
  // Convierte vértices locales al mundo siguiendo la rasante de la recta
  const toStraight = (m, v0) => {
    const f = m.f32; for (let i = v0; i < m.nv; i++) { const u = f[i * 9], v = f[i * 9 + 2]; trackPos(u, 0, o5); f[i * 9] = u - 60; f[i * 9 + 1] += o5[1]; f[i * 9 + 2] = v; }
  };
  const Bx = (m, u0, u1, y0, y1, v0, v1) => m.box((u0 + u1) / 2, (y0 + y1) / 2, (v0 + v1) / 2, Math.abs(u1 - u0), Math.abs(y1 - y0), Math.abs(v1 - v0));
  const rng = mkRng(77);

  // ---- figuras humanas simples (caixas): sentadas na arquibancada, em pé nos boxes ----
  const SHIRTS = [[0.6, 0.08, 0.07], [0.08, 0.2, 0.5], [0.75, 0.72, 0.68], [0.75, 0.55, 0.06], [0.1, 0.35, 0.16], [0.07, 0.07, 0.08], [0.5, 0.5, 0.52], [0.7, 0.3, 0.06], [0.35, 0.1, 0.4], [0.82, 0.82, 0.8]];
  const SKIN = [[0.55, 0.38, 0.28], [0.36, 0.23, 0.16], [0.66, 0.48, 0.37], [0.24, 0.15, 0.1]];
  const HAIR = [[0.03, 0.025, 0.02], [0.12, 0.07, 0.03], [0.3, 0.28, 0.26], [0.75, 0.1, 0.08], [0.85, 0.85, 0.82]];
  const pick = a => a[Math.floor(rng() * a.length) % a.length];
  // Figura en cartelera orientada a cámara
  // O vértice leva o centro em pos e o canto em nrm (x = lateral em m, y = altura/2 em m), escritos crus (sem normalizar).
  const figure = (x, y, z, reg, hgt, shirt, ao) => {
    const r = REG[reg], hwid = hgt * (r[2] - r[0]) * 2048 / ((r[3] - r[1]) * 1024) * 0.5, flip = rng() < 0.5, ua = flip ? r[2] : r[0], ub = flip ? r[0] : r[2], k = 0.82 + rng() * 0.3;
    mp.mat(16, Math.floor(rng() * 255), Math.floor(rng() * 255)); col(mp, shirt[0] * k, shirt[1] * k, shirt[2] * k, ao);
    const raw = (ox, oy, u, v) => { const i = mp.v(x, y, z, 0, 1, 0, u, v), q = i * 18 + 6; mp.i16[q] = Math.round(ox * 32767); mp.i16[q + 1] = Math.round(oy * 0.5 * 32767); mp.i16[q + 2] = 0; return i; };
    const a = raw(-hwid, 0, ua, r[3]), b = raw(hwid, 0, ub, r[3]), c = raw(hwid, hgt, ub, r[1]), d = raw(-hwid, hgt, ua, r[1]);
    mp.quadI(a, b, c, d);
  };
  // roupas de arquibancada: maioria em tons sóbrios (jeans, cinzas, cáqui, branco encardido, vinho), poucas cores vivas
  const CROWD = [[0.42, 0.42, 0.4], [0.5, 0.49, 0.45], [0.07, 0.09, 0.14], [0.045, 0.045, 0.05], [0.26, 0.06, 0.06], [0.1, 0.16, 0.28], [0.3, 0.26, 0.15], [0.2, 0.21, 0.22], [0.11, 0.17, 0.11],
  [0.33, 0.2, 0.1], [0.13, 0.13, 0.15], [0.28, 0.3, 0.34], [0.36, 0.33, 0.27], [0.09, 0.12, 0.2], [0.45, 0.09, 0.07], [0.4, 0.33, 0.08], [0.16, 0.1, 0.07], [0.5, 0.5, 0.48]];
  // sentada: (u, y do assento, v do encosto); a pista fica em +v
  const sitter = (u, y, v, ao) => figure(u + (rng() - 0.5) * 0.26, y - 0.1 - rng() * 0.05, v + 0.2 + (rng() - 0.5) * 0.16, 'p' + Math.floor(rng() * 16) % 16, 0.98 * (0.84 + rng() * 0.28), pick(CROWD), ao);
  // En pie en (u, y del suelo, v)
  const stander = (u, y, v, shirt, ao) => figure(u, y - 0.02, v, 's' + Math.floor(rng() * 3) % 3, 1.72 * (0.88 + rng() * 0.2), shirt, ao);

  // ---- pórtico ----
  const gantry = (s, dL, dR, nameReg, lights, local) => {
    const v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni, yB = 6.1, yT = 7.3, hwB = 0.5;
    // colunas treliçadas com painéis nas faces
    for (const d of [dL, dR]) {
      mb.mat(2, 120, 70); col(mb, 0.17, 0.25, 0.36);
      for (const [a, b] of [[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]]) mb.cyl(s + a, 0, d + b, 0.095, yT, 0.095, 10, false, true);
      for (let y = 0.5; y < yB; y += 0.95) for (const [a0, b0, a1, b1] of [[-0.42, -0.42, 0.42, -0.42], [0.42, -0.42, 0.42, 0.42], [0.42, 0.42, -0.42, 0.42], [-0.42, 0.42, -0.42, -0.42]]) { mb.tube([[s + a0, y, d + b0], [s + a1, y + 0.95, d + b1]], 0.05, 6); mb.tube([[s + a0, y, d + b0], [s + a1, y, d + b1]], 0.045, 6); }
      // nós da treliça (chapas de ligação em cada nível) e sapata de concreto com chapa de base
      mb.mat(2, 130, 60); col(mb, 0.11, 0.16, 0.24);
      for (let y = 0.5; y <= yB + 0.01; y += 0.95) for (const [a, b] of [[-0.42, -0.42], [0.42, -0.42], [0.42, 0.42], [-0.42, 0.42]]) mb.box(s + a, y, d + b, 0.2, 0.14, 0.2);
      Bx(mb, s - 0.62, s + 0.62, 0.33, 0.4, d - 0.62, d + 0.62);
      mb.mat(3); col(mb, 0.3, 0.3, 0.29); Bx(mb, s - 0.8, s + 0.8, -0.4, 0.35, d - 0.8, d + 0.8);
      mb.mat(1); col(mb, 1, 1, 1); for (const [a2, b2] of [[-0.54, -0.54], [0.54, -0.54], [0.54, 0.54], [-0.54, 0.54], [0, -0.56], [0, 0.56], [-0.56, 0], [0.56, 0]]) mb.cyl(s + a2, 0.4, d + b2, 0.028, 0.47, 0.028, 6, false, true);   // chumbadores
    }
    // viga-caixa treliçada
    mb.mat(2, 120, 70); col(mb, 0.17, 0.25, 0.36);
    for (const a of [-hwB, hwB]) for (const y of [yB, yT]) mb.tube([[s + a, y, dL], [s + a, y, dR]], 0.085, 8);
    const nb = Math.round((dR - dL) / 1.25);
    for (let k = 0; k <= nb; k++) {
      const d = lerp(dL, dR, k / nb), d2 = lerp(dL, dR, Math.min(1, (k + 1) / nb));
      for (const a of [-hwB, hwB]) { mb.tube([[s + a, yB, d], [s + a, yT, d]], 0.045, 5); if (k < nb) mb.tube([[s + a, k & 1 ? yT : yB, d], [s + a, k & 1 ? yB : yT, d2]], 0.045, 5); }
      mb.tube([[s - hwB, yT, d], [s + hwB, yT, d]], 0.045, 5); mb.tube([[s - hwB, yB, d], [s + hwB, yB, d]], 0.045, 5);
      if (k < nb) mb.tube([[s - hwB, yT, d], [s + hwB, yT, d2]], 0.035, 4);
    }
    // faixas com o nome nas duas faces (cobrem a treliça de frente: nada de fio fino piscando ao longe)
    const r = REG[nameReg || 'name']; md.mat(7); col(md, 1, 1, 1);
    if (nameReg) md.quad(s - hwB - 0.07, yB - 0.1, dL + 0.3, s - hwB - 0.07, yB - 0.1, dR - 0.3, s - hwB - 0.07, yT + 0.1, dR - 0.3, s - hwB - 0.07, yT + 0.1, dL + 0.3, r[0], r[3], r[2], r[1]);
    if (nameReg) md.quad(s + hwB + 0.07, yB - 0.1, dR - 0.3, s + hwB + 0.07, yB - 0.1, dL + 0.3, s + hwB + 0.07, yT + 0.1, dL + 0.3, s + hwB + 0.07, yT + 0.1, dR - 0.3, r[0], r[3], r[2], r[1]);
    if (lights) {
      // painel de luzes de largada, voltado para o grid
      mb.mat(2, 153, 51); col(mb, 0.03, 0.03, 0.035); Bx(mb, s - hwB - 0.45, s - hwB - 0.2, 5.0, 5.75, -2.6, 2.6);
      for (const d of [-2.6, 2.6]) mb.tube([[s - hwB - 0.32, 5.7, d * 0.9], [s - hwB, yB, d * 0.9]], 0.03, 4);
      // carcaça com viseira e moldura clara; lâmpadas vermelhas acesas (emissivas)
      mb.mat(2, 153, 51); col(mb, 0.03, 0.03, 0.035); Bx(mb, s - hwB - 0.75, s - hwB - 0.45, 5.75, 5.8, -2.7, 2.7);
      mb.mat(2, 128, 128); col(mb, 0.7, 0.7, 0.68); Bx(mb, s - hwB - 0.47, s - hwB - 0.45, 4.96, 5.0, -2.64, 2.64); for (const z of [-2.62, 2.62]) Bx(mb, s - hwB - 0.47, s - hwB - 0.45, 5.0, 5.75, z - 0.02, z + 0.02);
      for (let k = 0; k < 5; k++) for (const y of [5.2, 5.55]) {
        mb.push(m4mul(m4(), m4translate(mt, s - hwB - 0.46, y, -2.0 + k), m4rotZ(m4(), PI / 2)));
        mb.mat(2, 150, 60); col(mb, 0.02, 0.02, 0.022); mb.cyl(0, 0, 0, 0.165, 0.2, 0.175, 14, false, false); mb.cyl(0, 0, 0, 0.15, 0.2, 0.16, 14, false, false);   // viseira (tubo curto)
        mb.mat(18, 80, 0); col(mb, 0.9, 0.012, 0.004); mb.cyl(0, 0, 0, 0.14, 0.035, 0.12, 14, false, true);                                                // lente abaulada
        mb.pop();
      }
    }
    if (lights) { mb.mat(2, 128, 128); col(mb, 0.08, 0.08, 0.09); Bx(mb, s - 0.08, s + 0.08, yT, yT + 1.1, -1.28, -1.12); Bx(mb, s - 0.16, s + 0.16, yT + 1.1, yT + 1.4, -1.36, -1.04); }
    if (local) return;
    toStraight(mb, v0); toStraight(md, w0); S1.add(mb, i0, 3, 900); S2.add(md, k0, 5, 1500);   // a faixa (lona vazada) não lança sombra: só a treliça risca o asfalto
  };
  gantry(0, -7.7, 7.05, 'name', true);

  // ---- prédio dos boxes ----
  {
    const u0 = pit.bldS0, u1 = pit.bldS1, vF = pit.bldD0, vB = pit.bldD1, nBay = 20, bw = (u1 - u0) / nBay, hG = 3.7, hS = 4.5, hT = 8.2;
    const wallC = [0.6, 0.6, 0.58], darkC = [0.1, 0.11, 0.12];
    for (let part = 0; part < 4; part++) {
      const b0 = part * 5, b1 = b0 + 5, v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni, pv0 = mp.nv, pi0 = mp.ni;
      for (let b = b0; b < b1; b++) {
        const a = u0 + b * bw, c = a + bw, closed = rng() < 0.4;
        // pilar e testeira
        mb.mat(3); col(mb, wallC[0], wallC[1], wallC[2]); Bx(mb, a - 0.25, a + 0.25, -0.5, hG, vF - 0.1, vF + 0.4); if (b === nBay - 1) Bx(mb, c - 0.25, c + 0.25, -0.5, hG, vF - 0.1, vF + 0.4);
        mb.mat(17); col(mb, 0.1, 0.18, 0.4); Bx(mb, a, c, hG, hS, vF - 0.1, vF + 0.4);
        // batente metálico da porta, luminária sobre ela, pilastra do andar de cima e tubo de queda no pilar
        mb.mat(2, 110, 150); col(mb, 0.16, 0.17, 0.19); Bx(mb, a + 0.25, a + 0.37, 0, hG, vF - 0.13, vF + 0.05); Bx(mb, c - 0.37, c - 0.25, 0, hG, vF - 0.13, vF + 0.05); Bx(mb, a + 0.25, c - 0.25, hG - 0.1, hG, vF - 0.13, vF + 0.05);
        mb.mat(2, 128, 128); col(mb, 0.1, 0.1, 0.11); Bx(mb, a + bw / 2 - 0.4, a + bw / 2 + 0.4, hG - 0.62, hG - 0.52, vF - 0.42, vF - 0.14);
        mb.mat(6, 150, 0); col(mb, 1.0, 0.86, 0.6); Bx(mb, a + bw / 2 - 0.34, a + bw / 2 + 0.34, hG - 0.64, hG - 0.62, vF - 0.4, vF - 0.18);
        mb.mat(2, 110, 150); col(mb, 0.2, 0.21, 0.23); Bx(mb, a - 0.11, a + 0.11, hS + 0.3, hT, vF + 0.74, vF + 0.92); if (b === nBay - 1) Bx(mb, c - 0.11, c + 0.11, hS + 0.3, hT, vF + 0.74, vF + 0.92);
        if (b % 5 === 2) { mb.mat(1, 0, 0, 60); col(mb, 1, 1, 1); mb.cyl(a + 0.36, 0, vF - 0.17, 0.055, hS + 0.3, 0.055, 6, false, false); }
        sign(md, a + bw / 2 + 0.75, hG + 0.12, vF - 0.13, -1.5, 0, 0, 0.56, 'g' + b);
        // interior da garagem (faces para dentro, escurecidas)
        mb.mat(3);
        const dp = 7.2, x0 = a + 0.25, x1 = c - 0.25;
        col(mb, 0.36, 0.36, 0.35, 0.75); mb.quad(x0, 0.02, vF + dp, x1, 0.02, vF + dp, x1, 0.02, vF, x0, 0.02, vF);                       // piso
        col(mb, 0.5, 0.5, 0.48, 0.55); mb.quad(x1, 0, vF + dp, x0, 0, vF + dp, x0, hG, vF + dp, x1, hG, vF + dp);                         // fundo
        mb.quad(x0, 0, vF + dp, x0, 0, vF, x0, hG, vF, x0, hG, vF + dp); mb.quad(x1, 0, vF, x1, 0, vF + dp, x1, hG, vF + dp, x1, hG, vF);  // laterais
        col(mb, 0.4, 0.4, 0.4, 0.4); mb.quad(x0, hG, vF, x1, hG, vF, x1, hG, vF + dp, x0, hG, vF + dp);                                    // teto
        // faixa da equipe sobre a porta + toldo curto
        const tc = SHIRTS[(b * 3 + 1) % SHIRTS.length];
        mb.mat(2, 150, 0); col(mb, tc[0], tc[1], tc[2]); Bx(mb, x0, x1, hG - 0.42, hG - 0.02, vF - 0.14, vF - 0.1);
        mb.mat(10); col(mb, tc[0] * 0.9, tc[1] * 0.9, tc[2] * 0.9); mb.quad(x0, hG - 0.05, vF - 0.1, x1, hG - 0.05, vF - 0.1, x1, hG - 0.4, vF - 1.25, x0, hG - 0.4, vF - 1.25);
        mb.quad(x1, hG - 0.05, vF - 0.1, x0, hG - 0.05, vF - 0.1, x0, hG - 0.4, vF - 1.25, x1, hG - 0.4, vF - 1.25);
        if (closed) { mb.mat(13); col(mb, 0.62, 0.64, 0.66); mb.quad(x1, 0, vF + 0.12, x0, 0, vF + 0.12, x0, hG, vF + 0.12, x1, hG, vF + 0.12); }
        else {
          // Banco de trabajo, carros de herramientas y neumáticos apilados al fondo
          mb.mat(2, 102, 76); col(mb, 0.5, 0.06, 0.05, 0.7); Bx(mb, x0 + 0.3, x0 + 1.5, 0, 1.0, vF + dp - 1.0, vF + dp - 0.3);
          col(mb, 0.25, 0.26, 0.28, 0.7); Bx(mb, x1 - 2.6, x1 - 0.3, 0.85, 0.92, vF + dp - 1.1, vF + dp - 0.3); Bx(mb, x1 - 2.5, x1 - 2.4, 0, 0.85, vF + dp - 1.0, vF + dp - 0.4); Bx(mb, x1 - 0.5, x1 - 0.4, 0, 0.85, vF + dp - 1.0, vF + dp - 0.4);
          mb.mat(4); col(mb, 0.02, 0.02, 0.02, 0.7); for (let q = 0; q < 2; q++) mb.cyl(x0 + 2.4 + q * 0.7, 0, vF + dp - 0.7, 0.32, 0.84, 0.32, 10, false, true);
          // Mecánicos de boxes y neumáticos de competición
          const nP = 2 + (rng() < 0.5 ? 1 : 0); const tm = [tc[0] * 0.55 + 0.1, tc[1] * 0.55 + 0.1, tc[2] * 0.55 + 0.1]; for (let q = 0; q < nP; q++) stander(x0 + 0.9 + rng() * (x1 - x0 - 1.8), 0.02, vF - 0.9 + rng() * 2.6, tm, 0.85);
          mb.mat(4); col(mb, 0.02, 0.02, 0.02, 0.9); mb.cyl(x1 - 0.55, 0, vF - 0.55, 0.3, 0.26 * (2 + Math.floor(rng() * 3)), 0.3, 10, false, true);
          mb.mat(2, 110, 60); col(mb, tc[0], tc[1], tc[2], 0.85); Bx(mb, x0 + 0.5, x0 + 1.25, 0.12, 0.95, vF - 0.9, vF - 0.4);
        }
      }
      const a = u0 + b0 * bw, c = u0 + b1 * bw;
      // Voladizo y barandilla de cristal de boxes
      mb.mat(3); col(mb, 0.55, 0.55, 0.53); Bx(mb, a, c, hS, hS + 0.3, vF - 1.6, vB);
      mb.mat(5); col(mb, 1, 1, 1); mb.quad(c, hS + 0.3, vF - 1.55, a, hS + 0.3, vF - 1.55, a, hS + 1.35, vF - 1.55, c, hS + 1.35, vF - 1.55, 0, 0, c - a, 1.05);
      mb.mat(2, 76, 204); col(mb, 0.6, 0.62, 0.64); Bx(mb, a, c, hS + 1.35, hS + 1.41, vF - 1.6, vF - 1.5);
      // andar envidraçado
      mb.mat(5); mb.quad(c, hS + 0.3, vF + 0.9, a, hS + 0.3, vF + 0.9, a, hT, vF + 0.9, c, hT, vF + 0.9, a, 0, c, hT - hS - 0.3);
      // caixilharia em relevo do andar envidraçado: montantes salientes a cada 1,75 m, travessa e peitoril de concreto
      mb.mat(2, 95, 190); col(mb, 0.5, 0.52, 0.55); for (let x = a + 0.875; x < c - 0.2; x += 1.75) Bx(mb, x - 0.045, x + 0.045, hS + 0.3, hT, vF + 0.76, vF + 0.9);
      Bx(mb, a, c, hS + 1.12, hS + 1.2, vF + 0.8, vF + 0.9);
      mb.mat(3); col(mb, 0.56, 0.56, 0.54); Bx(mb, a, c, hS + 0.3, hS + 0.5, vF + 0.72, vF + 0.92);
      mb.mat(2, 190, 0); col(mb, 0.07, 0.075, 0.085, 0.8); for (let b = b0; b <= b1; b++) { const x = u0 + b * bw; Bx(mb, x - 0.27, x + 0.27, -0.5, 0.42, vF - 0.12, vF + 0.42); }   // rodapé dos pilares
      // cobertura com beiral e faixa de placas
      mb.mat(2, 153, 0); col(mb, 0.85, 0.85, 0.83); Bx(mb, a, c, hT, hT + 0.45, vF - 2.0, vB + 0.3);
      // montantes do guarda-corpo do terraço, condensadores de ar e dutos na cobertura
      mb.mat(2, 76, 204); col(mb, 0.6, 0.62, 0.64); for (let x = a + 0.1; x < c; x += 1.75) Bx(mb, x - 0.025, x + 0.025, hS + 0.3, hS + 1.36, vF - 1.59, vF - 1.53);
      for (let q = 0; q < 2; q++) {
        const x = a + (0.22 + q * 0.5 + rng() * 0.08) * (c - a), z = vF + 4 + rng() * 5;
        mb.mat(17); col(mb, 0.62, 0.63, 0.63); Bx(mb, x, x + 1.9, hT + 0.46, hT + 1.5, z, z + 1.1);
        mb.mat(2, 128, 128); col(mb, 0.08, 0.08, 0.09); Bx(mb, x + 0.2, x + 1.7, hT + 1.5, hT + 1.56, z + 0.15, z + 0.95);
        mb.mat(1); col(mb, 1, 1, 1); mb.tube([[x + 1.9, hT + 0.75, z + 0.55], [x + 4.5, hT + 0.75, z + 0.55], [x + 4.5, hT + 0.75, vB + 0.1]], 0.09, 6);
      }
      mb.mat(9); col(mb, 0.5, 0.52, 0.55); mb.quad(a, hT + 0.46, vB + 0.3, c, hT + 0.46, vB + 0.3, c, hT + 0.46, vF - 2.0, a, hT + 0.46, vF - 2.0, 0, 0, c - a, vB - vF + 2.3);
      for (let q = 0; q < 2; q++) { const x = a + q * (c - a) / 2 + 1.2, w = (c - a) / 2 - 2.4, nm = (part * 2 + q) % 3 === 0 ? 'name' : 'b' + ((part * 2 + q * 3 + 1) % PROPS.nBrands); sign(md, x + w, hT + 0.5, vF - 1.95, -w, 0, 0, nm === 'name' ? w / 8 : w / 4 > 1.6 ? 1.6 : w / 4, nm); mb.mat(2, 128, 128); col(mb, 0.3, 0.3, 0.32); Bx(mb, x + 0.2, x + 0.3, hT + 0.4, hT + 1.4, vF - 1.9, vF - 1.4); Bx(mb, x + w - 0.3, x + w - 0.2, hT + 0.4, hT + 1.4, vF - 1.9, vF - 1.4); }
      // fundos e empenas
      mb.mat(3); col(mb, wallC[0], wallC[1], wallC[2]); mb.quad(a, -0.5, vB, c, -0.5, vB, c, hT, vB, a, hT, vB);
      mb.mat(2, 153, 51); col(mb, darkC[0], darkC[1], darkC[2]); for (let q = 0; q < 5; q++) Bx(mb, a + (q + 0.25) * bw, a + (q + 0.75) * bw, 0, 2.6, vB, vB + 0.06);
      mb.mat(5); col(mb, 1, 1, 1); mb.quad(a + 0.5, hS + 1.0, vB + 0.02, c - 0.5, hS + 1.0, vB + 0.02, c - 0.5, hT - 0.6, vB + 0.02, a + 0.5, hT - 0.6, vB + 0.02, a, 0, c, 2.3);
      if (part === 0) { mb.mat(3); col(mb, wallC[0], wallC[1], wallC[2]); mb.quad(a, -0.5, vF, a, -0.5, vB, a, hT, vB, a, hT, vF); }
      if (part === 3) { mb.mat(3); col(mb, wallC[0], wallC[1], wallC[2]); mb.quad(c, -0.5, vB, c, -0.5, vF, c, hT, vF, c, hT, vB); }
      toStraight(mb, v0); toStraight(md, w0); S1.add(mb, i0, 7, 1500); S2.add(md, k0, 3, 900);
      toStraight(mp, pv0); SP.add(mp, pi0, 1, 400);
    }
    // ---- torre de controle ----
    const v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni, tu0 = u1 + 3, tu1 = u1 + 13, tv0 = vF + 1, tv1 = vF + 11;
    mb.mat(3); col(mb, 0.62, 0.62, 0.6); Bx(mb, tu0, tu1, -0.5, 13.5, tv0, tv1);
    mb.mat(5); col(mb, 1, 1, 1);
    for (let fl = 0; fl < 3; fl++) { const y = 2.2 + fl * 3.6; mb.quad(tu1, y, tv0 - 0.03, tu0, y, tv0 - 0.03, tu0, y + 1.9, tv0 - 0.03, tu1, y + 1.9, tv0 - 0.03, 0, 0.7, 10, 2.6); mb.quad(tu0 - 0.03, y, tv0, tu0 - 0.03, y, tv1, tu0 - 0.03, y + 1.9, tv1, tu0 - 0.03, y + 1.9, tv0, 0, 0.7, 10, 2.6); mb.quad(tu1 + 0.03, y, tv1, tu1 + 0.03, y, tv0, tu1 + 0.03, y + 1.9, tv0, tu1 + 0.03, y + 1.9, tv1, 0, 0.7, 10, 2.6); }
    // lajes salientes entre os andares, pilastras nos cantos e escada externa nos fundos
    mb.mat(2, 153, 0); col(mb, 0.82, 0.82, 0.8); for (let fl = 0; fl < 4; fl++) { const y = 1.75 + fl * 3.6; Bx(mb, tu0 - 0.22, tu1 + 0.22, y, y + 0.28, tv0 - 0.22, tv1 + 0.22); }
    mb.mat(17); col(mb, 0.11, 0.19, 0.4); for (const [x, z] of [[tu0, tv0], [tu1, tv0], [tu0, tv1], [tu1, tv1]]) Bx(mb, x - 0.3, x + 0.3, -0.5, 13.5, z - 0.3, z + 0.3);
    mb.mat(2, 110, 150); col(mb, 0.2, 0.21, 0.23); for (let k = 0; k < 6; k++) { const y0 = k * 2.2, x0 = k & 1 ? tu1 - 1.2 : tu0 + 1.2, x1 = k & 1 ? tu0 + 1.2 : tu1 - 1.2; mb.tube([[x0, y0, tv1 + 0.9], [x1, y0 + 2.2, tv1 + 0.9]], 0.07, 5); mb.tube([[x0, y0 + 1.0, tv1 + 0.9], [x1, y0 + 3.2, tv1 + 0.9]], 0.035, 4); }
    Bx(mb, tu0 + 1.0, tu0 + 1.14, 0, 13.5, tv1 + 0.83, tv1 + 0.97); Bx(mb, tu1 - 1.14, tu1 - 1.0, 0, 13.5, tv1 + 0.83, tv1 + 0.97);
    mb.mat(3); col(mb, 0.56, 0.56, 0.54); for (let x = tu0 + 2.5; x < tu1 - 1; x += 2.5) Bx(mb, x - 0.14, x + 0.14, -0.5, 13.5, tv0 - 0.2, tv0 + 0.05);
    for (let z = tv0 + 2.5; z < tv1 - 1; z += 2.5) Bx(mb, tu0 - 0.2, tu0 + 0.05, -0.5, 13.5, z - 0.14, z + 0.14);
    mb.mat(2, 190, 0); col(mb, 0.07, 0.075, 0.085, 0.8); Bx(mb, tu0 - 0.36, tu1 + 0.36, -0.5, 0.6, tv0 - 0.36, tv1 + 0.36);
    // guarda-corpo e antenas na cobertura
    mb.mat(2, 110, 150); col(mb, 0.5, 0.52, 0.54); for (const [x0, z0, x1, z1] of [[tu0 - 1.5, tv0 - 1.8, tu1 + 1.5, tv0 - 1.8], [tu1 + 1.5, tv0 - 1.8, tu1 + 1.5, tv1 + 1.2], [tu1 + 1.5, tv1 + 1.2, tu0 - 1.5, tv1 + 1.2], [tu0 - 1.5, tv1 + 1.2, tu0 - 1.5, tv0 - 1.8]]) { mb.tube([[x0, 18.45, z0], [x1, 18.45, z1]], 0.04, 5); mb.tube([[x0, 17.95, z0], [x1, 17.95, z1]], 0.03, 4); }
    mb.mat(17); col(mb, 0.6, 0.61, 0.62); Bx(mb, tu0 + 1, tu0 + 3.4, 17.45, 18.7, tv0 + 5.5, tv0 + 7.5);
    mb.mat(2, 128, 128); col(mb, 0.85, 0.85, 0.83); mb.push(m4mul(m4(), m4translate(mt, tu1 - 2.2, 19.0, tv0 + 2.5), m4rotZ(m4(), 0.9))); mb.cyl(0, 0, 0, 0.75, 0.22, 0.2, 14, false, true); mb.pop(); mb.cyl(tu1 - 2.2, 17.45, tv0 + 2.5, 0.06, 19.0, 0.06, 6, false, false);
    // sala de controle no topo, em balanço
    mb.mat(2, 153, 0); col(mb, 0.85, 0.85, 0.83); Bx(mb, tu0 - 1.3, tu1 + 1.3, 13.5, 13.9, tv0 - 1.6, tv1 + 1.0); Bx(mb, tu0 - 1.6, tu1 + 1.6, 17.0, 17.45, tv0 - 1.9, tv1 + 1.3);
    mb.mat(5); col(mb, 1, 1, 1);
    const cu0 = tu0 - 1.1, cu1 = tu1 + 1.1, cv0 = tv0 - 1.4, cv1 = tv1 + 0.8;
    mb.quad(cu1, 13.9, cv0, cu0, 13.9, cv0, cu0, 17.0, cv0, cu1, 17.0, cv0, 0, 0, cu1 - cu0, 3.1); mb.quad(cu0, 13.9, cv1, cu1, 13.9, cv1, cu1, 17.0, cv1, cu0, 17.0, cv1, 0, 0, cu1 - cu0, 3.1);
    mb.quad(cu0, 13.9, cv0, cu0, 13.9, cv1, cu0, 17.0, cv1, cu0, 17.0, cv0, 0, 0, cv1 - cv0, 3.1); mb.quad(cu1, 13.9, cv1, cu1, 13.9, cv0, cu1, 17.0, cv0, cu1, 17.0, cv1, 0, 0, cv1 - cv0, 3.1);
    mb.mat(2, 102, 178); col(mb, 0.7, 0.7, 0.72); mb.cyl((tu0 + tu1) / 2, 17.45, (tv0 + tv1) / 2, 0.09, 23, 0.04, 6, false, true);
    sign(md, tu0 + 9.5, 11.2, tv0 - 0.06, -9, 0, 0, 1.125, 'name');
    toStraight(mb, v0); toStraight(md, w0); S1.add(mb, i0, 7, 2500); S2.add(md, k0, 3, 900);
  }

  // ---- arquibancada ----
  {
    const st = TRK.stand, u0 = st.s0, u1 = st.s1, vF = st.d0, nRow = 22, run = 0.85, rise = 0.42, yF = 1.25, vB = vF - 1.0 - nRow * run, yB = yF + nRow * rise;
    const nSec = 5, aisle = 2.2, secW = (u1 - u0 - (nSec + 1) * aisle) / nSec;
    const seatCols = [[0.06, 0.12, 0.26], [0.33, 0.29, 0.12], [0.26, 0.27, 0.29]];   // assentos em tons sóbrios (o público é que dá a cor)
    for (let sec = 0; sec < nSec; sec++) {
      const a = u0 + aisle + sec * (secW + aisle), c = a + secW, v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni;
      for (let r = 0; r < nRow; r++) {
        const v = vF - 1.0 - r * run, y = yF + r * rise, ao = 1.0 - 0.4 * (r / nRow);
        mb.mat(3); col(mb, 0.5, 0.5, 0.48, ao);
        mb.quad(a, y, v, c, y, v, c, y + rise, v, a, y + rise, v);                    // espelho (voltado para a pista: +v)
        mb.quad(a, y + rise, v, c, y + rise, v, c, y + rise, v - run, a, y + rise, v - run);   // piso
        // Asientos de gradas con patrón de color por sector
        const pc = seatCols[(Math.floor(r / 4) + sec) % 3];
        md.mat(8); col(md, pc[0], pc[1], pc[2], ao);
        md.quad(a, y + rise + 0.4, v - 0.5, c, y + rise + 0.4, v - 0.5, c, y + rise + 0.4, v - 0.84, a, y + rise + 0.4, v - 0.84, 0, 0, c - a, 0.34);
        md.quad(a, y + rise + 0.4, v - 0.8, c, y + rise + 0.4, v - 0.8, c, y + rise + 0.82, v - 0.86, a, y + rise + 0.82, v - 0.86, 0, 0, c - a, 0.42);
      }
      // público: ocupação maior no centro e nas fileiras do meio; conjunto próprio (sem sombra; some só bem longe)
      {
        const pv0 = mp.nv, pi0 = mp.ni, occ0 = [0.6, 0.76, 0.88, 0.76, 0.6][sec];
        for (let r = 0; r < nRow; r++) {
          const v = vF - 1.0 - r * run, y = yF + r * rise, ao = 1.0 - 0.42 * (r / nRow), occ = occ0 * (0.6 + 0.4 * Math.sin((r + 1) / (nRow + 1) * PI));
          for (let x = a + 0.3; x < c - 0.3; x += 0.52) { if (r >= 6 && r <= 9 && Math.abs(x - (a + c) / 2) < 1.75) continue; if (rng() < occ) { if (rng() < 0.09) stander(x + (rng() - 0.5) * 0.2, y + rise + 0.02, v - 0.62, pick(CROWD), ao); else sitter(x, y + rise + 0.4, v - 0.84, ao); } }   // (sem gente na boca do túnel)
        }
        toStraight(mp, pv0); SP.add(mp, pi0, 1, 700);
      }
      // escadas dos corredores (rampa clara) de cada lado do setor
      for (const [x0, x1] of sec === 0 ? [[a - aisle, a], [c, c + aisle]] : [[c, c + aisle]]) {
        mb.mat(3); col(mb, 0.62, 0.61, 0.58, 0.9);
        for (let r = 0; r < nRow; r++) { const v = vF - 1.0 - r * run, y = yF + r * rise; mb.quad(x0, y, v, x1, y, v, x1, y + rise, v, x0, y + rise, v); mb.quad(x0, y + rise, v, x1, y + rise, v, x1, y + rise, v - run, x0, y + rise, v - run); }
        mb.mat(2, 102, 153); col(mb, 0.75, 0.6, 0.1); mb.tube([[(x0 + x1) / 2, yF + 0.95, vF - 1.0], [(x0 + x1) / 2, yB + 0.95, vB]], 0.03, 5);
      }
      // mureta frontal com placas, fundo e cobertura do setor
      const ea = sec === 0 ? u0 : a - aisle / 2, ec = sec === nSec - 1 ? u1 : c + aisle / 2;
      mb.mat(3); col(mb, 0.55, 0.55, 0.53); Bx(mb, ea, ec, -0.5, yF + 0.9, vF - 1.0, vF - 0.75);
      const nm = ['b0', 'b5', 'name', 'b2', 'b7'][sec];
      sign(md, ea + 2, 0.25, vF - 0.73, ec - ea - 4, 0, 0, nm === 'name' ? (ec - ea - 4) / 8 > 1.7 ? 1.7 : (ec - ea - 4) / 8 : 1.7, nm);
      mb.mat(3); col(mb, 0.5, 0.5, 0.49); mb.quad(ec, -0.5, vB - 0.3, ea, -0.5, vB - 0.3, ea, yB + 5.6, vB - 0.3, ec, yB + 5.6, vB - 0.3);     // parede dos fundos (face externa)
      mb.quad(ea, yB, vB, ec, yB, vB, ec, yB + 5.6, vB, ea, yB + 5.6, vB);                                                                    // face interna, atrás da última fileira
      // cobertura em balanço (telha) + vigas + pilares
      const yr0 = yB + 5.8, yr1 = yB + 3.6, vr1 = vF - 0.2;
      md.mat(9); col(md, 0.62, 0.64, 0.66); md.quad(ec, yr0, vB - 0.8, ea, yr0, vB - 0.8, ea, yr1, vr1, ec, yr1, vr1, 0, 0, ec - ea, vr1 - vB + 0.8);
      mb.mat(2, 128, 128); col(mb, 0.2, 0.22, 0.25);
      for (const x of [ea + 0.4, (ea + ec) / 2, ec - 0.4]) {
        Bx(mb, x - 0.2, x + 0.2, -0.5, yr0 - 0.1, vB - 0.3, vB + 0.15);
        const bm = mb.nv; Bx(mb, x - 0.12, x + 0.12, -0.5, 0.0, 0, 1);    // viga: caixa unitária deformada ao longo do balanço
        for (let q = bm; q < mb.nv; q++) { const t = mb.f32[q * 9 + 2], top = mb.f32[q * 9 + 1] > -0.25; mb.f32[q * 9 + 2] = lerp(vB - 0.3, vr1 - 0.3, t); mb.f32[q * 9 + 1] = lerp(yr0, yr1, t) - (top ? 0.06 : lerp(0.95, 0.3, t)); }
      }
      // terças sob a telha, mastros com tirantes sobre cada pilar e montantes entre viga e telha: a cobertura lê como estrutura metálica
      mb.mat(2, 115, 153, 70); col(mb, 0.55, 0.57, 0.6);
      for (let q = 1; q <= 5; q++) { const t = q / 6; mb.tube([[ea, lerp(yr0, yr1, t) - 0.13, lerp(vB - 0.8, vr1, t)], [ec, lerp(yr0, yr1, t) - 0.13, lerp(vB - 0.8, vr1, t)]], 0.06, 6); }
      for (const x of [ea + 0.4, (ea + ec) / 2, ec - 0.4]) {
        mb.mat(2, 128, 128); col(mb, 0.2, 0.22, 0.25); Bx(mb, x - 0.11, x + 0.11, yr0 - 0.1, yr0 + 2.6, vB - 0.3, vB - 0.08);
        mb.mat(2, 115, 153, 70); col(mb, 0.6, 0.62, 0.65);
        for (const t of [0.42, 0.86]) mb.tube([[x, yr0 + 2.55, vB - 0.19], [x, lerp(yr0, yr1, t) + 0.05, lerp(vB - 0.8, vr1, t)]], 0.04, 5);
        mb.tube([[x, yr0 + 2.55, vB - 0.19], [x, yr0 - 0.6, vB - 2.3]], 0.04, 5);
        for (let q = 1; q <= 4; q++) { const t = q / 5, yb = lerp(yr0, yr1, t), vv = lerp(vB - 0.3, vr1 - 0.3, t); mb.tube([[x, yb - lerp(0.95, 0.3, t), vv], [x, yb - 0.1, vv + 1.6]], 0.035, 4); }
      }
      // boca de túnel (acesso) no meio do setor: caixa de concreto com vão escuro, guarda-corpo em cima e nas laterais
      {
        const xc = (a + c) / 2, y6 = yF + 6 * rise, v6 = vF - 1.0 - 6 * run;
        mb.mat(3); col(mb, 0.52, 0.52, 0.5); Bx(mb, xc - 1.55, xc + 1.55, y6, y6 + 2.45, v6 - 3.6, v6 + 0.05);
        mb.mat(2, 200, 0); col(mb, 0.012, 0.012, 0.014, 0.25); mb.quad(xc - 1.15, y6 + 0.02, v6 + 0.07, xc + 1.15, y6 + 0.02, v6 + 0.07, xc + 1.15, y6 + 2.05, v6 + 0.07, xc - 1.15, y6 + 2.05, v6 + 0.07);
        mb.mat(2, 102, 153, 60); col(mb, 0.75, 0.6, 0.1);
        mb.tube([[xc - 1.5, y6 + 3.4, v6], [xc + 1.5, y6 + 3.4, v6]], 0.03, 5); mb.tube([[xc - 1.5, y6 + 2.95, v6], [xc + 1.5, y6 + 2.95, v6]], 0.022, 4);
        for (const x of [xc - 1.5, xc, xc + 1.5]) Bx(mb, x - 0.025, x + 0.025, y6 + 2.45, y6 + 3.4, v6 - 0.03, v6 + 0.03);
      }
      mb.mat(2, 153, 0); col(mb, 0.8, 0.8, 0.78); Bx(mb, ea, ec, yr1 - 0.35, yr1 + 0.05, vr1 - 0.05, vr1 + 0.1);
      // corrimão na mureta da frente e testeira da cobertura com faixa
      mb.mat(2, 102, 153); col(mb, 0.75, 0.6, 0.1); mb.tube([[ea, yF + 1.35, vF - 0.88], [ec, yF + 1.35, vF - 0.88]], 0.03, 5);
      for (let x = ea + 0.5; x < ec; x += 2.4) Bx(mb, x - 0.025, x + 0.025, yF + 0.9, yF + 1.35, vF - 0.9, vF - 0.86);
      mb.mat(2, 140, 0); col(mb, 0.06, 0.17, 0.38); Bx(mb, ea, ec, yr1 - 1.25, yr1 - 0.35, vr1 + 0.02, vr1 + 0.1);
      sign(md, ea + (ec - ea) * 0.5 - 6.4, yr1 - 1.2, vr1 + 0.12, 12.8, 0, 0, 0.8, sec % 2 ? 'b' + (sec * 5 % PROPS.nBrands) : 'name');
      toStraight(mb, v0); toStraight(md, w0);
      S1.add(mb, i0, 7, 2000); S2.add(md, k0, 7, 2000);
    }
    // empenas laterais
    const v0 = mb.nv, i0 = mb.ni;
    mb.mat(3); col(mb, 0.52, 0.52, 0.5);
    for (const [x, sgn] of [[u0, -1], [u1, 1]]) {
      const a = mb.v(x, -0.5, vF - 0.75, sgn, 0, 0, 0, 0), b = mb.v(x, yF + 0.9, vF - 0.75, sgn, 0, 0, 0, 1), c = mb.v(x, yB + 1.0, vB, sgn, 0, 0, 1, 1), d = mb.v(x, -0.5, vB - 0.3, sgn, 0, 0, 1, 0), e = mb.v(x, yB + 5.6, vB, sgn, 0, 0, 1, 2), f2 = mb.v(x, yB + 5.6, vB - 0.3, sgn, 0, 0, 1, 2);
      if (sgn < 0) { mb.tri(a, b, c); mb.tri(a, c, d); mb.tri(d, c, e); mb.tri(d, e, f2); } else { mb.tri(a, c, b); mb.tri(a, d, c); mb.tri(d, e, c); mb.tri(d, f2, e); }
    }
    // placas grandes nas empenas
    const w0 = md.nv, k0 = md.ni;
    sign(md, u0 - 0.05, 4.0, vB + 0.5, 0, 0, 9, 2.25, 'b3'); sign(md, u1 + 0.05, 4.0, vB + 9.5, 0, 0, -9, 2.25, 'b8');
    toStraight(mb, v0); toStraight(md, w0); S1.add(mb, i0, 7, 2000); S2.add(md, k0, 3, 900);
  }

  // ================= objetos ao longo do circuito =================
  const at = (m, s, d, yaw, fn, yOff) => { m.push(frame(s, d, yaw, yOff)); fn(m); m.pop(); };
  // lado de fora de cada curva grande
  const corners = TRK.corners.filter(c => Math.abs(c.ang) >= 60);
  // Cámaras de TV fijas del circuito [s, lado, distancia, altura]
  const TVC = (TRK.spec && TRK.spec.tvTowers) ? TRK.spec.tvTowers : corners.map(c => [(c.s0 + c.s1) * 0.5, c.k > 0 ? -1 : 1, 6, 5.5]);
  // há câmera de TV deste lado cuja tomada passa por s? (a câmera filma de ~110 m antes dela até ~60 m depois)
  const camSees = (s, side) => TVC.some(c => { if (c[1] !== side) return false; let q = c[0] - s; q -= Math.round(q / TRK.L) * TRK.L; return q > -70 && q < 120; });
  // ---- placas de distância (150/100/50) ----
  {
    const i0 = mb.ni, k0 = md.ni;
    for (const c of corners) for (const dist of [150, 100, 50]) {
      // do lado de fora da curva; se uma câmera de TV filma por ali, a placa vai para o lado de dentro (não tapa o carro)
      const s = c.s0 - dist + 12, i = sI(s); let side = c.k > 0 ? -1 : 1; if (camSees(s, side)) { side = -side; if (camSees(s, side)) continue; } const bar = side < 0 ? TRK.barL[i] : TRK.barR[i];
      const sr = srOf(i); if (sr > pit.s0 - 45 && sr < pit.s1 + 45) continue;
      const d = side * Math.min(hw + 3.4, bar - 1.0);
      const yw = side * 0.5;      // gira a face para o lado da pista: legível do carro e das câmeras
      at(mb, s, d, yw, m => { m.mat(2, 128, 128, 75); col(m, 0.3, 0.3, 0.32); Bx(m, -0.05, 0.05, -0.3, 1.95, -0.53, -0.43); Bx(m, -0.05, 0.05, -0.3, 1.95, 0.43, 0.53); });
      at(md, s, d, yw, m => { sign(m, -0.06, 0.95, -0.62, 0, 0, 1.24, 1.0, 'd' + dist, 75); sign(m, 0.06, 0.95, 0.62, 0, 0, -1.24, 1.0, 'd' + dist, 75); });   // duas faces: as câmeras de TV nunca veem um verso em branco
    }
    S1.add(mb, i0, 3, 430); S2.add(md, k0, 3, 430);
  }
  // ---- painéis publicitários atrás das barreiras ----
  {
    let bi = 0;
    const row = (s0, s1, side, step, w, h, y0, chev) => {
      for (let s = s0; s < s1 - w * 0.5; s += step) {
        const i = sI(s), bar = side < 0 ? TRK.barL[i] : TRK.barR[i], d = side * (bar + 1.1), i0 = mb.ni, k0 = md.ni;
        at(mb, s, d, 0, m => { m.mat(2, 128, 128, 105); col(m, 0.2, 0.21, 0.23); for (const x of [-w / 2 + 0.3, 0, w / 2 - 0.3]) { Bx(m, x - 0.07, x + 0.07, -0.6, y0 + h, side * 0.05, side * 0.19); if (x !== 0) m.tube([[x, y0 + h * 0.6, side * 0.12], [x, -0.2, side * 1.1]], 0.05, 5); } Bx(m, -w / 2, w / 2, y0 - 0.06, y0 + 0.02, side * 0.03, side * 0.11); Bx(m, -w / 2, w / 2, y0 + h - 0.02, y0 + h + 0.06, side * 0.03, side * 0.11); });
        // face voltada para a pista (normal = −lado·Z local)
        at(md, s, d, 0, m => { if (side < 0) sign(m, -w / 2, y0, 0, w, 0, 0, h, chev ? 'chev' : 'b' + (bi++ % PROPS.nBrands), 105); else sign(m, w / 2, y0, 0, -w, 0, 0, h, chev ? 'chev' : 'b' + (bi++ % PROPS.nBrands), 105); });
        S1.add(mb, i0, 3, 600); S2.add(md, k0, 7, 600);
      }
    };
    for (const c of corners) {
      const side = c.k > 0 ? -1 : 1, mid = (c.s0 + c.s1) / 2, len = c.s1 - c.s0;
      const sr = srOf(sI(mid)); if (sr > pit.s0 - 60 && sr < pit.s1 + 60) continue;
      row(mid - Math.min(len * 0.32, 30), mid + Math.min(len * 0.32, 30), side, 6.6, 6, 1.5, 1.05, false);
      row(c.s0 - 26, c.s0 - 6, side, 5.2, 5, 1.25, 1.05, true);
    }
    const extraBB = (TRK.spec && TRK.spec.billboards) ? TRK.spec.billboards : [];
    for (const b of extraBB) {
      const s0 = b[0] < 0 ? TRK.L + b[0] : b[0], s1 = b[1] < 0 ? TRK.L + b[1] : b[1];
      row(s0, s1, b[2], b[3], b[4], b[5], b[6], b[7]);
    }
  }
  // ---- pórticos publicitários extras definidos pelo circuito ----
  for (const s of ((TRK.spec && TRK.spec.gantries) ? TRK.spec.gantries : [])) {
    const v0 = mb.nv, i0 = mb.ni, w0 = md.nv, k0 = md.ni, i = sI(s), dL = -(TRK.barL[i] - 1.2), dR = TRK.barR[i] - 1.2, yB = 6.0, yT = 7.4;
    mb.push(frame(s, 0)); md.push(frame(s, 0));
    gantry(0, dL, dR, null, false, true);
    const wd = dR - dL - 1.2, hh = 1.3;
    for (const q of [0, 1]) {
      const nm = ['b0', 'b9'][q], x = q ? 0.58 : -0.58; md.mat(7); col(md, 1, 1, 1); const r = REG[nm], zc = (dL + dR) / 2, w2 = Math.min(wd / 2, hh * 2);
      for (const [za, zb] of [[zc - w2 * 2 - 0.2, zc - 0.2], [zc + 0.2, zc + w2 * 2 + 0.2]]) { if (q) md.quad(x, yB + 0.08, zb, x, yB + 0.08, za, x, yB + 0.08 + hh, za, x, yB + 0.08 + hh, zb, r[0], r[3], r[2], r[1]); else md.quad(x, yB + 0.08, za, x, yB + 0.08, zb, x, yB + 0.08 + hh, zb, x, yB + 0.08 + hh, za, r[0], r[3], r[2], r[1]); }
    }
    mb.pop(); md.pop(); S1.add(mb, i0, 7, 1500); S2.add(md, k0, 3, 1500);
  }
  // ---- postos de fiscal ----
  {
    const spots = []; for (const c of TRK.corners) { spots.push([c.s0 - 8, c.k > 0 ? 1 : -1]); if (Math.abs(c.ang) > 100) spots.push([(c.s0 + c.s1) / 2, c.k > 0 ? -1 : 1]); }
    spots.push([700, 1], [1190, -1]); let pn = 0;
    for (const [s, side] of spots) {
      const i = sI(s), sr = srOf(i); if (sr > pit.s0 - 50 && sr < pit.s1 + 50) continue;
      const d = side * ((side < 0 ? TRK.barL[i] : TRK.barR[i]) + 2.2), i0 = mb.ni;
      at(mb, s, d, 0, m => {
        m.mat(3); col(m, 0.5, 0.5, 0.48); Bx(m, -1.5, 1.5, -0.8, 0.5, -1.3, 1.3); Bx(m, -0.5, 0.5, -0.8, 0.25, side * 1.3, side * 1.75);   // base + degrau
        // (a frente — mureta, janela corrida — fica do lado da pista: −side·Z)
        // paredes em chapa nervurada laranja: mureta na frente (lado da pista), fundos com porta, laterais inteiras
        m.mat(17); col(m, 0.8, 0.33, 0.05);
        Bx(m, -1.2, 1.2, 0.5, 1.45, -side * 0.95, -side * 1.02); Bx(m, -1.2, -1.13, 0.5, 2.6, -1.0, 1.0); Bx(m, 1.13, 1.2, 0.5, 2.6, -1.0, 1.0);
        Bx(m, -1.2, -0.45, 0.5, 2.6, side * 0.95, side * 1.02); Bx(m, 0.45, 1.2, 0.5, 2.6, side * 0.95, side * 1.02); Bx(m, -0.45, 0.45, 2.15, 2.6, side * 0.95, side * 1.02);
        // faixa branca, cantoneiras e esquadria da janela corrida
        m.mat(2, 128, 0); col(m, 0.86, 0.86, 0.83); Bx(m, -1.22, 1.22, 1.3, 1.46, -side * 0.94, -side * 1.04);
        m.mat(2, 110, 150); col(m, 0.2, 0.21, 0.23);
        for (const x of [-1.2, 1.2]) for (const z of [-1.0, 1.0]) Bx(m, x - 0.05, x + 0.05, 0.5, 2.6, z - 0.05, z + 0.05);
        Bx(m, -1.2, 1.2, 2.5, 2.6, -side * 0.94, -side * 1.03); Bx(m, -0.03, 0.03, 1.46, 2.5, -side * 0.95, -side * 1.01);
        Bx(m, -0.45, -0.41, 0.5, 2.15, side * 0.94, side * 1.03); Bx(m, 0.41, 0.45, 0.5, 2.15, side * 0.94, side * 1.03);
        // Cristal de cabina de comisario e interior
        m.mat(5); col(m, 1, 1, 1); if (side < 0) m.quad(-1.13, 1.46, 0.985, 1.13, 1.46, 0.985, 1.13, 2.5, 0.985, -1.13, 2.5, 0.985, 0, 0, 2.26, 1.04); else m.quad(1.13, 1.46, -0.985, -1.13, 1.46, -0.985, -1.13, 2.5, -0.985, 1.13, 2.5, -0.985, 0, 0, 2.26, 1.04);
        m.mat(2, 180, 0); col(m, 0.1, 0.1, 0.11, 0.6); Bx(m, -1.1, 1.1, 1.36, 1.42, -side * 0.5, -side * 0.93); Bx(m, 0.3, 0.75, 0.5, 1.0, -0.3, 0.15);
        m.mat(2, 100, 0); col(m, 0.7, 0.05, 0.04); m.cyl(-0.95, 0.5, side * 0.7, 0.07, 1.0, 0.07, 8, false, true);   // extintor
        // telhado em chapa clara com beiral e calha
        m.mat(17); col(m, 0.85, 0.85, 0.82); Bx(m, -1.45, 1.45, 2.6, 2.72, -1.25, 1.25);
        m.mat(2, 110, 150); col(m, 0.3, 0.31, 0.33); Bx(m, -1.47, 1.47, 2.58, 2.63, -side * 1.25, -side * 1.31);
        m.mat(2, 102, 128, 25); col(m, 0.75, 0.75, 0.2); m.cyl(-1.0, 2.72, 0, 0.02, 3.9, 0.02, 5, false, true);
        m.mat(10); col(m, 0.8, 0.7, 0.05); Bx(m, -1.0, -0.3, 3.4, 3.85, -0.01, 0.01);
        // faixa zebrada na base, voltada para a pista, e corrimão do degrau
        m.mat(2, 128, 0); for (let q = 0; q < 6; q++) { col(m, q & 1 ? 0.8 : 0.08, q & 1 ? 0.62 : 0.08, q & 1 ? 0.05 : 0.08); Bx(m, -1.5 + q * 0.5, -1.0 + q * 0.5, -0.1, 0.5, -side * 1.3, -side * 1.315); }
        m.mat(2, 110, 150, 40); col(m, 0.75, 0.6, 0.1); m.tube([[0.55, 0.3, side * 1.75], [0.55, 1.35, side * 1.75], [0.55, 1.35, side * 1.05]], 0.025, 5);
      });
      S1.add(mb, i0, 3, 600);
      // placa com o número do posto no beiral e fiscal de colete laranja ao lado da cabine
      const k0 = md.ni; at(md, s, d, 0, m => { if (side > 0) sign(m, 0.45, 2.74, -1.27, -0.9, 0, 0, 0.5, 'g' + (pn % 20), 60); else sign(m, -0.45, 2.74, 1.27, 0.9, 0, 0, 0.5, 'g' + (pn % 20), 60); }); S2.add(md, k0, 3, 240); pn++;
      const q0 = mp.ni; mp.push(frame(s, d)); stander(1.95, 0.0, -side * 0.2, [0.85, 0.36, 0.04], 0.9); if (rng() < 0.6) stander(-2.0, 0.0, -side * 0.6, [0.85, 0.36, 0.04], 0.9); mp.pop(); SP.add(mp, q0, 1, 300);
    }
  }
  // ---- Torres de cámaras de TV ----
  {
    // Cámara 0: sobre el semáforo del pórtico de salida
    { const p = P(0, -1.2); WORLD.tvCams.push({ x: p[0], y: p[1] + 9.0, z: p[2], s: 0, side: 0 }); }
    for (const [s, side, off, h, kind] of TVC) {
      const i = sI(s), d = side * ((side < 0 ? TRK.barL[i] : TRK.barR[i]) + off), p = P(s, d);
      // a lente fica 1,4 m para o lado da pista, acima do guarda-corpo: a própria torre nunca entra no quadro
      const pc = P(s, d - side * 1.4);
      WORLD.tvCams.push({ x: pc[0], y: p[1] + h + 1.8, z: pc[2], s, side });
      if (kind) continue;
      const i0 = mb.ni;
      at(mb, s, d, 0, m => {
        m.mat(1, 0, 0, 90); col(m, 1, 1, 1);
        for (const [a, b] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) m.cyl(a, -0.6, b, 0.09, h, 0.09, 6, false, false);
        m.mat(11, 0, 0, 75);
        for (let y = 0.2; y < h - 0.5; y += 1.8) for (const [a0, b0, a1, b1] of [[-0.9, -0.9, 0.9, -0.9], [0.9, -0.9, 0.9, 0.9], [0.9, 0.9, -0.9, 0.9], [-0.9, 0.9, -0.9, -0.9]]) { m.tube([[a0, y, b0], [a1, y + 1.8, b1]], 0.045, 4); m.tube([[a0, y + 1.8, b0], [a1, y + 1.8, b1]], 0.045, 4); }
        m.mat(2, 178, 0, 90); col(m, 0.35, 0.3, 0.22); Bx(m, -1.1, 1.1, h, h + 0.08, -1.1, 1.1);
        m.mat(11, 0, 0, 30); col(m, 1, 1, 1); for (const [a0, b0, a1, b1] of [[-1.05, -1.05, 1.05, -1.05], [1.05, -1.05, 1.05, 1.05], [1.05, 1.05, -1.05, 1.05], [-1.05, 1.05, -1.05, -1.05]]) { m.tube([[a0, h + 1.05, b0], [a1, h + 1.05, b1]], 0.025, 4); m.tube([[a0, h + 0.55, b0], [a1, h + 0.55, b1]], 0.02, 4); m.cyl(a0, h, b0, 0.025, h + 1.05, 0.025, 4, false, false); }
        m.mat(2, 204, 0, 90); col(m, 0.1, 0.25, 0.5); Bx(m, -1.06, 1.06, h + 0.1, h + 1.0, -side * 1.07, -side * 1.06);
      });
      S1.add(mb, i0, 3, 510);
    }
  }
  // ---- paddock: caminhões, tendas, postes de luz; cones na entrada dos boxes ----
  {
    const truck = (m, c) => {
      m.mat(2, 89, 51); col(m, c[0], c[1], c[2]); Bx(m, -6.5, 3.2, 1.25, 4.0, -1.25, 1.25);
      col(m, 0.85, 0.85, 0.85); Bx(m, 3.6, 5.9, 0.9, 3.3, -1.2, 1.2);
      m.mat(5); col(m, 1, 1, 1); m.quad(5.92, 2.0, 1.1, 5.92, 2.0, -1.1, 5.92, 3.1, -1.1, 5.92, 3.1, 1.1, 0.2, 0.2, 1.5, 1.2);
      m.mat(2, 153, 76); col(m, 0.08, 0.08, 0.09); Bx(m, -6.3, 5.6, 0.75, 1.25, -1.1, 1.1);
      m.mat(4); col(m, 0.02, 0.02, 0.02);
      for (const x of [-5.4, -4.2, 2.2, 4.9]) for (const z of [-1.22, 0.92]) { m.push(m4mul(m4(), m4translate(mt, x, 0.5, z), m4rotX(m4(), PI / 2))); m.cyl(0, 0, 0, 0.5, 0.3, 0.5, 12, true, true); m.pop(); }
    };
    const tent = (m, c) => {
      m.mat(1); col(m, 1, 1, 1); for (const [a, b] of [[-2, -2], [2, -2], [2, 2], [-2, 2]]) m.cyl(a, -0.3, b, 0.03, 2.5, 0.03, 5, false, false);
      m.mat(10); col(m, c[0], c[1], c[2]);
      const ap = [0, 3.6, 0], cs = [[-2.15, 2.5, -2.15], [2.15, 2.5, -2.15], [2.15, 2.5, 2.15], [-2.15, 2.5, 2.15]];
      for (let k = 0; k < 4; k++) {
        const a = cs[k], b = cs[(k + 1) % 4]; const e1 = [b[0] - a[0], 0, b[2] - a[2]], e2 = [ap[0] - a[0], 1.1, ap[2] - a[2]]; const nx = e1[1] * e2[2] - e1[2] * e2[1], ny = e1[2] * e2[0] - e1[0] * e2[2], nz = e1[0] * e2[1] - e1[1] * e2[0]; const sg = ny < 0 ? -1 : 1; const i1 = m.v(a[0], a[1], a[2], nx * sg, ny * sg, nz * sg, 0, 0), i2 = m.v(b[0], b[1], b[2], nx * sg, ny * sg, nz * sg, 1, 0), i3 = m.v(ap[0], ap[1], ap[2], nx * sg, ny * sg, nz * sg, 0.5, 1); if (sg > 0) m.tri(i1, i2, i3); else m.tri(i1, i3, i2);
        m.quad(b[0], 2.2, b[2], a[0], 2.2, a[2], a[0], 2.5, a[2], b[0], 2.5, b[2]);
      }
    };
    const cols = [[0.75, 0.08, 0.06], [0.08, 0.2, 0.55], [0.85, 0.85, 0.83], [0.1, 0.1, 0.11], [0.8, 0.6, 0.05]];
    const i0 = mb.ni, k0 = md.ni;
    [[-48, 40, 0.05], [-20, 41, -0.04], [12, 39.5, 3.1], [46, 41, 0.02]].forEach(([s, d, yaw], q) => at(mb, s, d, yaw, m => truck(m, cols[q])));
    [[-34, 35.5], [-4, 35], [29, 35.5], [60, 36], [70, 43]].forEach(([s, d], q) => at(md, s, d, 0, m => tent(m, q % 2 ? [0.85, 0.85, 0.82] : [0.75, 0.1, 0.08])));
    // postes de luz altos atrás dos boxes e da arquibancada
    for (const [s, d] of [[-70, 33.5], [0, 33.5], [70, 33.5], [-95, -22], [95, -22], [140, 20]]) at(mb, s, d, 0, m => {
      const sg = d > 0 ? -1 : 1;     // lado para onde os refletores apontam (a pista)
      // fuste cônico com base, escada de marinheiro e plataforma
      m.mat(1); col(m, 1, 1, 1); m.cyl(0, -0.5, 0, 0.2, 18.2, 0.1, 10, false, true);
      m.mat(3); col(m, 0.5, 0.5, 0.48); Bx(m, -0.5, 0.5, -0.6, 0.25, -0.5, 0.5);
      m.mat(2, 128, 128); col(m, 0.2, 0.2, 0.22); Bx(m, -0.7, 0.7, 17.5, 17.58, -0.7, 0.7);
      for (const x of [-0.7, 0.7]) { m.tube([[x, 17.58, -0.7], [x, 18.5, -0.7], [x, 18.5, 0.7], [x, 17.58, 0.7]], 0.02, 4); }
      // travessas com os refletores: 2 fileiras de 4, cada um com carcaça, aba e lente redonda acesa, levemente inclinados para baixo
      for (let b = 0; b < 2; b++) {
        const yc = 18.45 + b * 0.8;
        m.mat(2, 128, 128); col(m, 0.2, 0.2, 0.22); Bx(m, -1.75, 1.75, yc - 0.34, yc - 0.28, -0.06, 0.06); Bx(m, -0.05, 0.05, 17.6, yc - 0.28, -0.05, 0.05);
        for (let a = 0; a < 4; a++) {
          const xc = (a - 1.5) * 0.9;
          m.push(m4mul(m4(), m4translate(mt, xc, yc, 0), m4rotX(m4(), sg * 0.3)));
          m.mat(2, 110, 120); col(m, 0.16, 0.17, 0.19); Bx(m, -0.34, 0.34, -0.27, 0.27, -0.16, 0.16); Bx(m, -0.37, 0.37, 0.27, 0.31, sg * -0.16, sg * 0.34);   // carcaça + aba
          Bx(m, -0.37, -0.34, -0.27, 0.27, sg * 0.16, sg * 0.3); Bx(m, 0.34, 0.37, -0.27, 0.27, sg * 0.16, sg * 0.3);
          m.mat(6, 170, 0); col(m, 1.0, 0.94, 0.82);
          m.push(m4rotX(m4(), sg * PI / 2)); m.cyl(0, 0.165, 0, 0.23, 0.175, 0.23, 14, false, true); m.pop();
          m.pop();
        }
      }
    });
    S1.add(mb, i0, 7, 1600); S2.add(md, k0, 7, 900);
    const c0 = mb.ni;
    for (let q = 0; q < 9; q++) { const s = pit.s0 + 6 + q * 4.2, e = sat((s - pit.s0) / 45), d = lerp(hw, pit.laneD0, e) - 0.25; at(mb, s, d, 0, m => { m.mat(14); col(m, 1, 1, 1); m.cyl(0, 0.02, 0, 0.13, 0.5, 0.025, 10, false, true); m.mat(2, 153, 0); col(m, 0.7, 0.14, 0.02); Bx(m, -0.17, 0.17, 0, 0.03, -0.17, 0.17); }); }
    S1.add(mb, c0, 3, 220);
  }

  WORLD.stats.tris.props = mb.ni / 3; WORLD.stats.tris.propsDS = md.ni / 3; WORLD.stats.ranges.props = S1.r.length; WORLD.stats.ranges.propsDS = S2.r.length;
  S1.upload(mb); S2.upload(md); SP.upload(mp); R.drawables.push(S1, S2, SP); PROPS.sets = [S1, S2, SP]; WORLD.stats.tris.gente = mp.ni / 3;

  // ---- alambrado: passe de transparentes (mistura alfa analítica, sem cintilação) ----
  if (fenceMB.ni) {
    const ff = mkFwdFamily('fence', { src: 'world_fence', blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha' }, alpha: { srcFactor: 'zero', dstFactor: 'one' } } });
    const fm = fenceMB.upload(); let fbg = null;
    WORLD.stats.tris.fence = fenceMB.ni / 3;
    R.transparents.push({
      draw(pass) {
        if (!ff.pipe) return; if (!fbg) fbg = fwdBindGroup(ff);
        const ctx = R.ctx; let set = false;     // R.ctx ainda guarda o tronco de visão do passe principal
        for (let i = 0; i < fenceR.length; i++) {
          const r = fenceR[i]; if (!(SQ[0] = r.x, SQ[1] = r.y, SQ[2] = r.z, SQ[3] = r.rad, sphereQ(ctx.planes, ctx.nPlanes))) continue;
          if (!set) { pass.setPipeline(ff.pipe); pass.setBindGroup(3, fbg); R.dyn2[0] = 0; pass.setBindGroup(2, R.objBG, R.dyn2, 0, 1); pass.setVertexBuffer(0, fm.vb); pass.setIndexBuffer(fm.ib, 'uint32'); set = true; }
          pass.drawIndexed(r.count, 1, r.first, 0, 0);
        }
      }
    });
  }
}
if (WORLD.active) queueMicrotask(() => BUILD.push(async () => {
  if (TRK.spec && TRK.spec.glb && !TRK.spec.glbFailed) return; // El circuito GLB ya incluye sus propias gradas, boxes, pantallas y vallas escaneadas
  propsBuild();
}));
