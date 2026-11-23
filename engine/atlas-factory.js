'use strict';
/**
 * AtlasFactory - Fábrica centralizada de texturas procedurales y Atlas 2D/WebGPU
 *
 * Sigue los principios SOLID de Responsabilidad Única y Open/Closed:
 * 1. Tipografía Vectorial Procedural (Bézier):
 *    - GLY: Glifos tipográficos trazados por curvas cúbicas de Bézier en caja normalizada 4x6.
 *    - GWID / gAdv / textW / strokeText: Cálculo métrico proporcional, interletraje y renderizado en Canvas 2D.
 * 2. Generación Procedural de Multitud y Comisarios:
 *    - personSprite: Figura humana detallada con canales R (luz/volumen), G (ropa/máscara), B (cabello/calzado),
 *      degradados de iluminación, posturas aleatorias, prendas, gorras, gafas y sombreados.
 *    - personStrip: Tiras de público y comisarios con dilatación antialiasing y canal alfa recto.
 * 3. Atlas de Pista y Patrocinio Oficial:
 *    - buildPropsAtlas: Generación del atlas completo de 4096x2048 (lógico 2048x1024 a 2x) con carteles oficiales F1,
 *      rótulos de circuito (Las Vegas, Nürburgring, Spa), chevrons de curva, pit lane, garajes, distancia de frenada (150/100/50),
 *      patrocinadores oficiales FIA (Heineken 0.0, TAG Heuer, Pirelli, Aramco, Rolex, etc.) y carga a textura WebGPU.
 */

(() => {
const _PI = Math.PI;
const _TAU = Math.PI * 2;

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

function textW(txt, h) {
  let w = 0;
  for (const ch of txt) w += gAdv(ch);
  return (w - 1.05) * h / 6;
}

function strokeText(g, txt, x, y, h, color, weight, skew) {
  const u = h / 6;
  g.save();
  g.translate(x, y + h);
  if (skew) g.transform(1, 0, -skew, 1, 0, 0);
  g.strokeStyle = color;
  g.lineWidth = u * (weight || 1.0);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  let cx = 0;
  for (const ch of txt) {
    const gl = GLY[ch];
    if (gl) {
      g.beginPath();
      for (const m of gl.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
        const n = m[2].trim().split(/[ ,]+/).filter(t => t.length).map(Number);
        const X = k => cx + n[k] * u;
        const Y = k => -n[k] * u;
        if (m[1] === 'M') g.moveTo(X(0), Y(1));
        else if (m[1] === 'L') g.lineTo(X(0), Y(1));
        else if (m[1] === 'C') g.bezierCurveTo(X(0), Y(1), X(2), Y(3), X(4), Y(5));
        else g.closePath();
      }
      g.stroke();
    }
    cx += u * gAdv(ch);
  }
  g.restore();
}

/**
 * Figuras humanas en el atlas para público y comisarios
 * Canales: sombreado (R), máscara de vestimenta (G) y calzado/cabello (B)
 * kind 0 = sentada (160x224), kind 1 = en pie (104x288). Coordenadas lógicas; canvas en escala 2x.
 */
function personSprite(g, ox, oy, W, H, kind, rnd) {
  const TAU = typeof window !== 'undefined' && window.TAU ? window.TAU : _TAU;
  const PI = typeof window !== 'undefined' && window.PI ? window.PI : _PI;
  const C = (r, m) => `rgb(${r | 0},${m === 1 ? 255 : 0},${m === 2 ? 255 : 0})`;
  const CA = (r, m, a) => `rgba(${r | 0},${m === 1 ? 255 : 0},${m === 2 ? 255 : 0},${a})`;
  const grad = (x0, y0, x1, y1, r0, r1, m) => {
    const q = g.createLinearGradient(x0, y0, x1, y1);
    q.addColorStop(0, C(r0, m));
    q.addColorStop(1, C(r1, m));
    return q;
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.globalCompositeOperation = 'source-over';
  const fem = rnd() < 0.42, u = (kind ? 35 : 31) * (0.93 + rnd() * 0.14), big = 0.9 + rnd() * 0.26;
  const cx = ox + W / 2 + (rnd() - 0.5) * 6, lean = (rnd() - 0.5) * (kind ? 3 : 9), look = (rnd() - 0.5) * 0.9;
  const ty = oy + (kind ? 10 : 16) + rnd() * 8, hx = cx + lean, hy = ty + u * 0.5, rx = u * 0.36, ry = u * 0.5;
  const sy = ty + u * 1.2, shw = u * (fem ? 0.84 : 1.0) * big, wy = sy + u * 1.7, ww = shw * (fem ? 0.74 : 0.9), hipY = wy + u * 0.38, hipW = shw * (fem ? 0.98 : 0.92);
  const sx = cx + lean * 0.45;
  const sleeve = rnd() < 0.45 ? 0 : 1, pose = rnd();

  // ---- pernas ----
  if (kind) {
    const footY = oy + H - 8, kneeY = hipY + (footY - hipY) * 0.5;
    for (const sd of [-1, 1]) {
      const lx = sx + sd * hipW * 0.5, fx = lx + sd * (2 + rnd() * 3);
      g.fillStyle = grad(0, hipY, 0, footY, 150, 78, 2);
      g.beginPath();
      g.moveTo(lx - hipW * 0.5, hipY - 4);
      g.bezierCurveTo(lx - hipW * 0.5, kneeY, fx - u * 0.2, kneeY, fx - u * 0.17, footY - 6);
      g.lineTo(fx + u * 0.17, footY - 6);
      g.bezierCurveTo(fx + u * 0.22, kneeY, lx + hipW * 0.5, kneeY, lx + hipW * 0.5, hipY - 4);
      g.closePath();
      g.fill();
      g.fillStyle = C(38, 2);
      g.beginPath();
      g.ellipse(fx + sd * 2, footY - 3, u * 0.24, 6, 0, 0, TAU);
      g.fill();
    }
    g.strokeStyle = CA(60, 2, 0.5);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(sx, hipY + 6);
    g.lineTo(sx, hipY + u * 1.6);
    g.stroke();
  } else {
    const kY = Math.min(oy + H - 6, hipY + u * 0.95);
    for (const sd of [-1, 1]) {
      const kx = sx + sd * hipW * 0.62;
      g.fillStyle = grad(0, hipY - 6, 0, kY, 165, 88, 2);
      g.beginPath();
      g.moveTo(sx - sd * 2, hipY - 8);
      g.lineTo(sx + sd * hipW * 1.02, hipY - 8);
      g.bezierCurveTo(sx + sd * hipW * 1.1, hipY + u * 0.5, kx + sd * u * 0.32, kY, kx, kY);
      g.bezierCurveTo(kx - sd * u * 0.34, kY, sx - sd * 3, hipY + u * 0.5, sx - sd * 2, hipY - 8);
      g.closePath();
      g.fill();
      const kg = g.createRadialGradient(kx, kY - u * 0.3, 1, kx, kY - u * 0.3, u * 0.36);
      kg.addColorStop(0, CA(205, 2, 0.75));
      kg.addColorStop(1, CA(205, 2, 0));
      g.fillStyle = kg;
      g.beginPath();
      g.arc(kx, kY - u * 0.3, u * 0.36, 0, TAU);
      g.fill();
    }
  }

  // ---- tronco: trapézio do pescoço, ombros caídos, cintura ----
  const torso = () => {
    g.beginPath();
    g.moveTo(sx - u * 0.2, sy - u * 0.12);
    g.bezierCurveTo(sx - shw * 0.55, sy - u * 0.08, sx - shw * 0.95, sy + u * 0.02, sx - shw, sy + u * 0.24);
    g.bezierCurveTo(sx - shw * 1.02, sy + u * 0.9, sx - ww, wy - u * 0.3, sx - ww, wy);
    g.bezierCurveTo(sx - ww, wy + u * 0.2, sx - hipW, hipY - u * 0.1, sx - hipW, hipY);
    g.lineTo(sx + hipW, hipY);
    g.bezierCurveTo(sx + hipW, hipY - u * 0.1, sx + ww, wy + u * 0.2, sx + ww, wy);
    g.bezierCurveTo(sx + ww, wy - u * 0.3, sx + shw * 1.02, sy + u * 0.9, sx + shw, sy + u * 0.24);
    g.bezierCurveTo(sx + shw * 0.95, sy + u * 0.02, sx + shw * 0.55, sy - u * 0.08, sx + u * 0.2, sy - u * 0.12);
    g.closePath();
  };
  g.fillStyle = grad(0, sy - u * 0.1, 0, hipY, 238, 138, 1);
  torso();
  g.fill();
  g.save();
  torso();
  g.clip();

  for (const sd of [-1, 1]) {
    const q = g.createLinearGradient(sx + sd * shw * 1.02, 0, sx + sd * shw * 0.35, 0);
    q.addColorStop(0, CA(70, 1, 0.6));
    q.addColorStop(1, CA(70, 1, 0));
    g.fillStyle = q;
    g.fillRect(sx + (sd < 0 ? -shw * 1.1 : shw * 0.3), sy - u * 0.2, shw * 0.8, hipY - sy + u * 0.3);
  }
  {
    const q = g.createLinearGradient(0, wy - u * 0.5, 0, hipY);
    q.addColorStop(0, CA(80, 1, 0));
    q.addColorStop(1, CA(80, 1, 0.45));
    g.fillStyle = q;
    g.fillRect(sx - shw * 1.1, wy - u * 0.5, shw * 2.2, hipY - wy + u * 0.5);
  }
  g.lineWidth = 2.2;
  for (let k = 0; k < 5; k++) {
    const fy = sy + u * (0.5 + rnd() * 1.4), fx = sx + (rnd() - 0.5) * shw * 1.3, fl = u * (0.25 + rnd() * 0.35), sg = rnd() < 0.5 ? -1 : 1;
    g.strokeStyle = CA(95, 1, 0.3);
    g.beginPath();
    g.moveTo(fx, fy);
    g.quadraticCurveTo(fx + sg * fl * 0.5, fy + fl * 0.5, fx + sg * fl, fy + fl * 0.25);
    g.stroke();
    g.strokeStyle = CA(250, 1, 0.22);
    g.beginPath();
    g.moveTo(fx, fy - 2.5);
    g.quadraticCurveTo(fx + sg * fl * 0.5, fy + fl * 0.5 - 2.5, fx + sg * fl, fy + fl * 0.25 - 2.5);
    g.stroke();
  }
  if (rnd() < 0.3) {
    g.strokeStyle = CA(105, 1, 0.5);
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(sx, sy + u * 0.1);
    g.lineTo(sx + lean * 0.1, hipY);
    g.stroke();
  }
  g.restore();

  // decote/gola
  const neckT = rnd();
  g.fillStyle = C(178, 0);
  g.beginPath();
  if (neckT < 0.45) {
    g.moveTo(sx - u * 0.19, sy - u * 0.13);
    g.lineTo(sx, sy + u * (0.12 + rnd() * 0.2));
    g.lineTo(sx + u * 0.19, sy - u * 0.13);
  } else {
    g.ellipse(sx, sy - u * 0.1, u * 0.2, u * 0.12, 0, 0, PI);
  }
  g.fill();
  if (neckT > 0.75) {
    g.strokeStyle = C(250, 1);
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(sx - u * 0.24, sy - u * 0.14);
    g.lineTo(sx - u * 0.06, sy + u * 0.1);
    g.moveTo(sx + u * 0.24, sy - u * 0.14);
    g.lineTo(sx + u * 0.06, sy + u * 0.1);
    g.stroke();
  }

  // ---- braços: braço (manga) + antebraço + mão ----
  const limb = (x0, y0, x1, y1, w0, w1, r0, r1, m) => {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    g.fillStyle = grad(x0, y0, x1, y1, r0, r1, m);
    g.beginPath();
    g.moveTo(x0 + nx * w0, y0 + ny * w0);
    g.lineTo(x1 + nx * w1, y1 + ny * w1);
    g.arc(x1, y1, w1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), dx * ny - dy * nx > 0);
    g.lineTo(x0 - nx * w0, y0 - ny * w0);
    g.arc(x0, y0, w0, Math.atan2(-ny, -nx), Math.atan2(ny, nx), dx * ny - dy * nx > 0);
    g.closePath();
    g.fill();
    g.strokeStyle = CA(60, m, 0.35);
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(x0 - nx * w0, y0 - ny * w0);
    g.lineTo(x1 - nx * w1, y1 - ny * w1);
    g.stroke();
  };
  const aw = u * (fem ? 0.14 : 0.17) * big, raise = !kind && pose > 0.86 ? (rnd() < 0.5 ? -1 : 1) : 0, crossed = pose < 0.2, hips = kind && pose > 0.55 && pose < 0.75;
  for (const sd of [-1, 1]) {
    const ax = sx + sd * (shw - aw * 0.7), ay = sy + u * 0.3;
    let ex, ey, fx, fy;
    if (raise === sd) { ex = ax + sd * u * 0.42; ey = ay - u * 0.55; fx = ex + sd * u * 0.1; fy = ey - u * 0.85; }
    else if (crossed) { ex = ax + sd * u * 0.08; ey = ay + u * 0.95; fx = sx - sd * shw * 0.35; fy = ey - u * 0.12 + sd * 3; }
    else if (hips) { ex = ax + sd * u * 0.42; ey = ay + u * 0.8; fx = sx + sd * ww * 0.95; fy = wy + u * 0.15; }
    else if (kind) { ex = ax + sd * u * 0.1; ey = ay + u * 0.98; fx = ex - sd * u * 0.02; fy = ey + u * 0.88; }
    else if (pose > 0.6) { ex = ax + sd * u * 0.12; ey = ay + u * 0.92; fx = sx + sd * u * 0.12; fy = sy + u * (0.9 + rnd() * 0.3); }
    else { ex = ax + sd * u * 0.1; ey = ay + u * 0.95; fx = sx + sd * hipW * (0.35 + rnd() * 0.3); fy = hipY + u * (0.25 + rnd() * 0.2); }
    const mx = sleeve ? ex : ax + (ex - ax) * 0.55, my = sleeve ? ey : ay + (ey - ay) * 0.55;
    limb(ax, ay, mx, my, aw * 1.12, aw, 225, 150, 1);
    if (!sleeve) limb(mx, my, ex, ey, aw * 0.86, aw * 0.8, 215, 170, 0);
    limb(ex, ey, fx, fy, aw * (sleeve ? 0.95 : 0.78), aw * (sleeve ? 0.8 : 0.66), sleeve ? 205 : 210, sleeve ? 150 : 172, sleeve ? 1 : 0);
    g.fillStyle = C(205, 0);
    g.beginPath();
    g.ellipse(fx + (fx - ex) * 0.12, fy + (fy - ey) * 0.12, aw * 0.78, aw * 0.95, Math.atan2(fy - ey, fx - ex) + PI / 2, 0, TAU);
    g.fill();
  }

  // ---- pescoço e cabeça ----
  g.fillStyle = grad(0, hy + ry * 0.5, 0, sy, 150, 190, 0);
  g.beginPath();
  g.moveTo(hx - u * 0.17, hy + ry * 0.55);
  g.lineTo(sx - u * 0.19, sy - u * 0.08);
  g.lineTo(sx + u * 0.19, sy - u * 0.08);
  g.lineTo(hx + u * 0.17, hy + ry * 0.55);
  g.closePath();
  g.fill();
  g.fillStyle = CA(95, 0, 0.6);
  g.beginPath();
  g.ellipse(hx, hy + ry * 0.92, u * 0.19, u * 0.1, 0, 0, TAU);
  g.fill();

  // orelhas, crânio oval com queixo mais estreito
  g.fillStyle = C(185, 0);
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.ellipse(hx + sd * rx * 0.98 - look * 2, hy + ry * 0.08, rx * 0.16, ry * 0.2, 0, 0, TAU);
    g.fill();
  }
  const hg = g.createRadialGradient(hx - rx * 0.3 + look * 3, hy - ry * 0.35, 1, hx, hy, ry * 1.25);
  hg.addColorStop(0, C(246, 0));
  hg.addColorStop(0.65, C(205, 0));
  hg.addColorStop(1, C(150, 0));
  const skull = () => {
    g.beginPath();
    g.moveTo(hx, hy - ry);
    g.bezierCurveTo(hx + rx * 1.1, hy - ry, hx + rx * 1.12, hy + ry * 0.1, hx + rx * 0.82, hy + ry * 0.55);
    g.bezierCurveTo(hx + rx * 0.55, hy + ry * 1.0, hx - rx * 0.55, hy + ry * 1.0, hx - rx * 0.82, hy + ry * 0.55);
    g.bezierCurveTo(hx - rx * 1.12, hy + ry * 0.1, hx - rx * 1.1, hy - ry, hx, hy - ry);
    g.closePath();
  };
  g.fillStyle = hg;
  skull();
  g.fill();

  // rosto sugerido
  const fxo = look * rx * 0.3, ey0 = hy - ry * 0.02;
  g.save();
  skull();
  g.clip();
  g.fillStyle = CA(120, 0, 0.42);
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.ellipse(hx + fxo + sd * rx * 0.42, ey0, rx * 0.26, ry * 0.11, 0, 0, TAU);
    g.fill();
  }
  g.fillStyle = CA(40, 0, 0.75);
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.ellipse(hx + fxo + sd * rx * 0.42, ey0 + 0.5, rx * 0.13, ry * 0.05, 0, 0, TAU);
    g.fill();
  }
  g.strokeStyle = CA(70, 0, 0.6);
  g.lineWidth = 1.5;
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(hx + fxo + sd * rx * 0.2, ey0 - ry * 0.16);
    g.lineTo(hx + fxo + sd * rx * 0.66, ey0 - ry * 0.18);
    g.stroke();
  }
  g.strokeStyle = CA(120, 0, 0.5);
  g.lineWidth = 1.6;
  g.beginPath();
  g.moveTo(hx + fxo * 1.3 + rx * 0.06, ey0 + ry * 0.05);
  g.lineTo(hx + fxo * 1.5 + rx * 0.1, ey0 + ry * 0.36);
  g.lineTo(hx + fxo * 1.3 - rx * 0.06, ey0 + ry * 0.38);
  g.stroke();
  g.strokeStyle = CA(105, 0, 0.6);
  g.lineWidth = 1.7;
  g.beginPath();
  g.moveTo(hx + fxo - rx * 0.26, hy + ry * 0.6);
  g.quadraticCurveTo(hx + fxo, hy + ry * (0.62 + rnd() * 0.08), hx + fxo + rx * 0.26, hy + ry * 0.6);
  g.stroke();
  {
    const q = g.createLinearGradient(hx - rx, 0, hx + rx, 0);
    q.addColorStop(0, CA(90, 0, look > 0 ? 0.05 : 0.38));
    q.addColorStop(0.5, CA(90, 0, 0));
    q.addColorStop(1, CA(90, 0, look > 0 ? 0.38 : 0.05));
    g.fillStyle = q;
    g.fillRect(hx - rx * 1.2, hy - ry, rx * 2.4, ry * 2);
  }
  if (!fem && rnd() < 0.3) {
    g.fillStyle = CA(70, 2, 0.5);
    g.beginPath();
    g.ellipse(hx + fxo, hy + ry * 0.72, rx * 0.62, ry * 0.3, 0, 0, PI);
    g.fill();
  }
  g.restore();

  // ---- cabelo / boné / chapéu ----
  const hs = rnd();
  const hairTop = (lowY) => {
    g.beginPath();
    g.moveTo(hx - rx * 1.08, lowY);
    g.bezierCurveTo(hx - rx * 1.25, hy - ry * 1.0, hx - rx * 0.6, hy - ry * 1.22, hx, hy - ry * 1.18);
    g.bezierCurveTo(hx + rx * 0.6, hy - ry * 1.22, hx + rx * 1.25, hy - ry * 1.0, hx + rx * 1.08, lowY);
  };
  const fr = hy - ry * (0.48 + rnd() * 0.2);
  if (fem && hs < 0.7) {
    const len = hs < 0.45 ? sy + u * (0.2 + rnd() * 0.5) : hy + ry * 0.7;
    g.fillStyle = grad(0, hy - ry, 0, len, 215, 110, 2);
    hairTop(hy);
    g.bezierCurveTo(hx + rx * 1.35, hy + ry, hx + rx * 1.2, len, hx + rx * 0.75, len);
    g.lineTo(hx + rx * 0.72, hy + ry * 0.2);
    g.bezierCurveTo(hx + rx * 0.7, fr, hx - rx * 0.3 + fxo, fr - 4, hx - rx * 0.72, hy + ry * 0.2);
    g.lineTo(hx - rx * 0.75, len);
    g.bezierCurveTo(hx - rx * 1.2, len, hx - rx * 1.35, hy + ry, hx - rx * 1.08, hy);
    g.closePath();
    g.fill();
  } else if (hs < 0.62) {
    g.fillStyle = grad(0, hy - ry * 1.2, 0, hy, 205, 120, 2);
    const sideY = hy + ry * (rnd() * 0.25 - 0.05);
    hairTop(sideY);
    g.bezierCurveTo(hx + rx * 0.9, hy - ry * 0.3, hx + rx * 0.5 + fxo, fr, hx + fxo, fr + 2);
    g.bezierCurveTo(hx - rx * 0.5 + fxo, fr - 2, hx - rx * 0.9, hy - ry * 0.3, hx - rx * 1.08, sideY);
    g.closePath();
    g.fill();
  } else if (hs < 0.84) {
    const m = rnd() < 0.5 ? 1 : 2;
    g.fillStyle = grad(0, hy - ry * 1.2, 0, hy - ry * 0.3, 235, 150, m);
    hairTop(hy - ry * 0.38);
    g.closePath();
    g.fill();
    g.fillStyle = C(120, m);
    g.beginPath();
    g.ellipse(hx + fxo * 2.5, hy - ry * 0.36, rx * 1.25, ry * 0.13, 0, 0, TAU);
    g.fill();
    g.fillStyle = CA(70, 0, 0.45);
    g.beginPath();
    g.ellipse(hx + fxo, hy - ry * 0.2, rx * 0.9, ry * 0.14, 0, 0, TAU);
    g.fill();
  } else if (hs < 0.92) {
    g.fillStyle = grad(0, hy - ry * 1.3, 0, hy - ry * 0.4, 240, 170, 1);
    g.beginPath();
    g.ellipse(hx, hy - ry * 0.5, rx * 1.9, ry * 0.2, 0, 0, TAU);
    g.fill();
    hairTop(hy - ry * 0.5);
    g.closePath();
    g.fill();
    g.fillStyle = CA(70, 0, 0.5);
    g.beginPath();
    g.ellipse(hx + fxo, hy - ry * 0.28, rx * 0.95, ry * 0.17, 0, 0, TAU);
    g.fill();
  } else {
    g.fillStyle = CA(120, 2, 0.5);
    hairTop(hy - ry * 0.55);
    g.closePath();
    g.fill();
  }
  if (rnd() < 0.18) {
    g.strokeStyle = C(30, 2);
    g.lineWidth = 2.6;
    g.beginPath();
    for (const sd of [-1, 1]) {
      g.moveTo(hx + fxo + sd * rx * 0.2, ey0);
      g.lineTo(hx + fxo + sd * rx * 0.68, ey0);
    }
    g.stroke();
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(hx + fxo - rx * 0.2, ey0);
    g.lineTo(hx + fxo + rx * 0.2, ey0);
    g.stroke();
  }
}

/**
 * Dibuja n figuras lado a lado y devuelve los píxeles (alfa recto) listos para writeTexture
 */
function personStrip(n, kind, seed, pw, ph) {
  const PI = typeof window !== 'undefined' && window.PI ? window.PI : _PI;
  const W = n * pw * 2, H = ph * 2;
  const mk = () => {
    if (typeof document !== 'undefined' && document.createElement) {
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      return c;
    }
    return { width: W, height: H, getContext: () => null };
  };
  const cm = mk(), gm = cm && cm.getContext ? cm.getContext('2d') : null;
  if (!gm) return { data: new Uint8Array(W * H * 4), w: W, h: H };
  gm.scale(2, 2);
  const rnd = typeof mkRng === 'function' ? mkRng(seed) : Math.random;
  for (let i = 0; i < n; i++) {
    gm.save();
    gm.beginPath();
    gm.rect(i * pw + 2, 2, pw - 4, ph - 4);
    gm.clip();
    personSprite(gm, i * pw, 0, pw, ph, kind, rnd);
    gm.restore();
  }
  const cc = mk(), gc = cc.getContext('2d');
  for (const r of [10, 6, 3]) {
    for (let a = 0; a < 8; a++) {
      gc.drawImage(cm, Math.cos(a * PI / 4) * r, Math.sin(a * PI / 4) * r);
    }
  }
  gc.drawImage(cm, 0, 0);
  const col = gc.getImageData(0, 0, W, H).data;
  const msk = gm.getImageData(0, 0, W, H).data;
  const out = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    out[i * 4] = col[i * 4];
    out[i * 4 + 1] = col[i * 4 + 1];
    out[i * 4 + 2] = col[i * 4 + 2];
    out[i * 4 + 3] = msk[i * 4 + 3];
  }
  return { data: out, w: W, h: H };
}

/**
 * Objeto Fábrica AtlasFactory
 */
const AtlasFactory = {
  GLY,
  GWID,
  gAdv,
  textW,
  strokeText,
  personSprite,
  personStrip,

  /**
   * Genera el atlas completo de texturas 4096x2048 y lo transfiere a WebGPU
   */
  buildPropsAtlas(options = {}) {
    const TAU = typeof window !== 'undefined' && window.TAU ? window.TAU : _TAU;
    const targetProps = (typeof PROPS !== 'undefined' ? PROPS : (typeof window !== 'undefined' ? window.PROPS : null)) || { sets: [], regions: {} };
    const REG = options.regions || targetProps.regions || {};
    targetProps.regions = REG;

    const reg = (name, x, y, w, h) => {
      REG[name] = [x / 2048, y / 1024, (x + w) / 2048, (y + h) / 1024];
    };

    let cv = null, g = null;
    if (typeof document !== 'undefined' && document.createElement) {
      cv = document.createElement('canvas');
      cv.width = 4096;
      cv.height = 2048;
      g = cv.getContext('2d');
      if (g) g.scale(2, 2);
    }

    const centered = (txt, x, y, w, h, th, color, weight, skew) => {
      if (g) strokeText(g, txt, x + (w - textW(txt, th)) / 2, y + (h - th) / 2, th, color, weight, skew);
    };

    const isVegas = Boolean(typeof TRK !== 'undefined' && TRK.spec && (TRK.spec.id === 'las-vegas-strip' || TRK.spec.urban));
    const trackId = (typeof TRK !== 'undefined' && TRK.spec && TRK.spec.id) || '';

    if (g) {
      g.fillStyle = '#888';
      g.fillRect(0, 0, 2048, 1024);

      // Nombre del circuito
      if (isVegas) {
        g.fillStyle = '#070b14'; g.fillRect(0, 0, 1024, 128);
        g.fillStyle = '#e10600'; g.fillRect(0, 0, 1024, 8); g.fillRect(0, 120, 1024, 8);
        g.fillStyle = '#d4af37'; g.fillRect(0, 8, 1024, 4); g.fillRect(0, 116, 1024, 4);
        centered('LAS VEGAS STRIP CIRCUIT', 0, 0, 1024, 128, 52, '#ffffff', 1.85, 0.08);
      } else if (trackId === 'nurburgring-gp') {
        g.fillStyle = '#09131f'; g.fillRect(0, 0, 1024, 128);
        g.fillStyle = '#de0000'; g.fillRect(0, 0, 1024, 8); g.fillRect(0, 120, 1024, 8);
        g.fillStyle = '#ffcc00'; g.fillRect(0, 8, 1024, 4); g.fillRect(0, 116, 1024, 4);
        centered('NÜRBURGRING GP-STRECKE', 0, 0, 1024, 128, 50, '#ffffff', 1.8, 0.08);
      } else if (trackId === 'spa-francorchamps') {
        g.fillStyle = '#0b1626'; g.fillRect(0, 0, 1024, 128);
        g.fillStyle = '#ffcc00'; g.fillRect(0, 0, 1024, 8); g.fillRect(0, 120, 1024, 8);
        g.fillStyle = '#de0000'; g.fillRect(0, 8, 1024, 4); g.fillRect(0, 116, 1024, 4);
        centered('SPA-FRANCORCHAMPS', 0, 0, 1024, 128, 52, '#f5f5f5', 1.8, 0.08);
      } else {
        const trkTitle = (typeof TRK !== 'undefined' && TRK.spec && TRK.spec.name) ? TRK.spec.name.toUpperCase() : 'CIRCUIT GP';
        g.fillStyle = '#0b2a4a'; g.fillRect(0, 0, 1024, 128);
        g.fillStyle = '#e8b21c'; g.fillRect(0, 0, 1024, 10); g.fillRect(0, 118, 1024, 10);
        centered(trkTitle, 0, 0, 1024, 128, 50, '#f4f1e6', 1.75, 0.1);
      }
    }
    reg('name', 0, 0, 1024, 128);

    // Setas de curva (chevrons)
    if (g) {
      g.fillStyle = '#e9e6dc'; g.fillRect(1024, 0, 512, 128); g.fillStyle = '#b3160f';
      for (let i = 0; i < 5; i++) {
        const x = 1034 + i * 102;
        g.beginPath();
        g.moveTo(x, 8); g.lineTo(x + 48, 8); g.lineTo(x + 92, 64); g.lineTo(x + 48, 120); g.lineTo(x, 120); g.lineTo(x + 44, 64);
        g.closePath();
        g.fill();
      }
    }
    reg('chev', 1024, 0, 512, 128);

    // Faixa "PIT LANE" / "BOXENGASSE" / "BOXES"
    if (g) {
      g.fillStyle = '#161a22'; g.fillRect(1536, 0, 512, 128);
      g.fillStyle = isVegas ? '#00a3e0' : '#e8b21c'; g.fillRect(1536, 0, 512, 8); g.fillRect(1536, 120, 512, 8);
      centered(isVegas ? 'PIT LANE' : (trackId === 'nurburgring-gp' ? 'BOXENGASSE' : 'PIT LANE'), 1536, 0, 512, 128, 68, '#ffffff', 1.8, 0.08);
    }
    reg('boxes', 1536, 0, 512, 128);

    // Marcas patrocinadoras oficiais de competición
    let brands;
    if (isVegas) {
      brands = [
        ['HEINEKEN 0.0', '#007A33', '#ffffff', 0],
        ['TAG HEUER', '#0d0f12', '#00d2be', 1],
        ['ARAMCO', '#002044', '#00A3E0', 3],
        ['DHL', '#D40511', '#FFCC00', 4],
        ['PIRELLI', '#D52B1E', '#FFD100', 6],
        ['ROLEX', '#004d30', '#c8a85c', 5],
        ['CAESARS PALACE', '#221230', '#e5c158', 3],
        ['BELLAGIO', '#0e1e36', '#e5c158', 2],
        ['MGM GRAND', '#0a2e1d', '#e5c158', 0],
        ['WYNN LAS VEGAS', '#45131b', '#f5d688', 1],
        ['LVMH', '#141416', '#f5f5f5', 5],
        ['F1 LAS VEGAS', '#e10600', '#ffffff', 4],
      ];
    } else if (trackId === 'nurburgring-gp') {
      brands = [
        ['BILSTEIN', '#005bac', '#ffd000', 0],
        ['ADAC', '#ffcc00', '#111111', 1],
        ['RAVENOL', '#003087', '#ffd100', 3],
        ['BBS', '#15171c', '#c8c8c8', 6],
        ['MICHELIN', '#002060', '#ffea00', 2],
        ['DEKRA', '#008754', '#ffffff', 4],
        ['TOTAL ENERGIES', '#da291c', '#ffffff', 5],
        ['RECARO', '#16181d', '#e30613', 0],
        ['H&R SPRINGS', '#16181d', '#ed1c24', 1],
        ['ROWE MOTOR OIL', '#002f6c', '#ff6600', 3],
        ['PUMA MOTORSPORT', '#111111', '#ffffff', 2],
        ['BOSCH', '#e2001a', '#ffffff', 4],
      ];
    } else if (trackId === 'spa-francorchamps') {
      brands = [
        ['ROLEX', '#004d30', '#c8a85c', 5],
        ['TOTAL ENERGIES', '#da291c', '#ffffff', 2],
        ['PIRELLI', '#D52B1E', '#FFD100', 6],
        ['MOOBLUZ', '#0c1e38', '#ffffff', 3],
        ['DHL', '#D40511', '#FFCC00', 4],
        ['ARAMCO', '#002044', '#00A3E0', 1],
        ['SPA-FRANCORCHAMPS', '#162238', '#dfba60', 0],
        ['TAG HEUER', '#0d0f12', '#00d2be', 1],
        ['HEINEKEN 0.0', '#007A33', '#ffffff', 0],
        ['MICHELIN', '#002060', '#ffea00', 2],
        ['AWS', '#1b2432', '#ff9900', 5],
        ['LIQUI MOLY', '#003e7e', '#e30613', 3],
      ];
    } else {
      brands = [
        ['PIRELLI', '#D52B1E', '#FFD100', 6],
        ['TAG HEUER', '#0d0f12', '#00d2be', 1],
        ['ARAMCO', '#002044', '#00A3E0', 3],
        ['DHL', '#D40511', '#FFCC00', 4],
        ['MICHELIN', '#002060', '#ffea00', 2],
        ['ROLEX', '#004d30', '#c8a85c', 5],
        ['TOTAL ENERGIES', '#da291c', '#ffffff', 2],
        ['BILSTEIN', '#005bac', '#ffd000', 0],
        ['BOSCH', '#e2001a', '#ffffff', 4],
        ['BBS', '#15171c', '#c8c8c8', 6],
        ['PUMA', '#111111', '#ffffff', 1],
        ['HEINEKEN 0.0', '#007A33', '#ffffff', 0],
      ];
    }

    brands.forEach((b, i) => {
      const x = (i % 4) * 512, y = 128 + Math.floor(i / 4) * 128;
      if (g) {
        g.fillStyle = b[1]; g.fillRect(x, y, 512, 128);
        g.fillStyle = b[2]; g.strokeStyle = b[2]; g.lineWidth = 7;
        const ic = b[3], ix = x + 62, iy = y + 64;
        if (ic === 0) {
          g.beginPath(); g.arc(ix, iy, 36, 0, TAU); g.stroke();
          g.beginPath(); g.arc(ix, iy, 14, 0, TAU); g.fill();
        } else if (ic === 1) {
          g.beginPath(); g.moveTo(ix - 34, iy + 32); g.lineTo(ix + 4, iy - 36); g.lineTo(ix + 2, iy - 2); g.lineTo(ix + 34, iy - 32); g.lineTo(ix - 2, iy + 36); g.lineTo(ix, iy + 4); g.closePath(); g.fill();
        } else if (ic === 2) {
          g.beginPath(); g.ellipse(ix, iy, 26, 38, 0.5, 0, TAU); g.fill();
          g.strokeStyle = b[1]; g.lineWidth = 5; g.beginPath(); g.moveTo(ix - 12, iy + 30); g.quadraticCurveTo(ix + 10, iy, ix + 8, iy - 34); g.stroke();
        } else if (ic === 3) {
          g.beginPath(); g.moveTo(ix, iy - 40); g.lineTo(ix + 36, iy - 22); g.lineTo(ix + 30, iy + 18); g.lineTo(ix, iy + 40); g.lineTo(ix - 30, iy + 18); g.lineTo(ix - 36, iy - 22); g.closePath(); g.stroke();
        } else if (ic === 4) {
          g.beginPath(); g.moveTo(ix - 36, iy + 34); g.lineTo(ix, iy - 38); g.lineTo(ix + 36, iy + 34); g.closePath(); g.fill();
        } else if (ic === 5) {
          g.lineWidth = 8; g.beginPath(); g.moveTo(ix - 22, iy - 40); g.lineTo(ix - 22, iy + 40); g.moveTo(ix + 22, iy - 40); g.lineTo(ix + 22, iy + 40);
          for (let k = -2; k <= 2; k++) { g.moveTo(ix - 22, iy + k * 16); g.lineTo(ix + 22, iy + k * 16); }
          g.stroke();
        } else {
          for (let k = 0; k < 5; k++) {
            g.beginPath(); g.moveTo(ix - 40 + k * 18, iy + 38); g.lineTo(ix - 22 + k * 18, iy - 38); g.lineTo(ix - 12 + k * 18, iy - 38); g.lineTo(ix - 30 + k * 18, iy + 38); g.closePath(); g.fill();
          }
        }
        const th = Math.min(62, 376 / textW(b[0], 1));
        centered(b[0], x + 116, y, 388, 128, th, b[2], 1.8, 0.1);
      }
      reg('b' + i, x, y, 512, 128);
      if (b[0].startsWith('HEINEKEN')) reg('heineken', x, y, 512, 128);
    });
    targetProps.nBrands = brands.length;

    // Placas de distancia (150, 100, 50)
    ['150', '100', '50'].forEach((t, i) => {
      const x = 960 + i * 256, y = 512;
      if (g) {
        g.fillStyle = '#f1efe6'; g.fillRect(x, y, 256, 208);
        g.strokeStyle = '#141414'; g.lineWidth = 9; g.strokeRect(x + 10, y + 10, 236, 188);
        centered(t, x, y, 256, 208, t.length > 2 ? 78 : 104, '#141414', 1.75, 0);
      }
      reg('d' + t, x, y, 256, 208);
    });

    // Números de garaje (01 a 20)
    for (let i = 0; i < 20; i++) {
      const x = (i % 10) * 96, y = 640 + Math.floor(i / 10) * 64;
      if (g) {
        g.fillStyle = '#16181c'; g.fillRect(x, y, 96, 64);
        centered((i < 9 ? '0' : '') + (i + 1), x, y, 96, 64, 40, '#f2c318', 1.4, 0);
      }
      reg('g' + i, x, y, 96, 64);
    }

    // Franjas diagonales de peligro (caballetes)
    if (g) {
      g.fillStyle = '#e9e6dc'; g.fillRect(480, 512, 256, 128);
      g.fillStyle = '#c9281c';
      for (let k = -2; k < 8; k++) {
        g.beginPath();
        g.moveTo(480 + k * 48, 640); g.lineTo(504 + k * 48, 640); g.lineTo(552 + k * 48, 512); g.lineTo(528 + k * 48, 512);
        g.closePath();
        g.fill();
      }
    }
    reg('stripe', 484, 516, 248, 120);

    // Si WebGPU está activo, subir textura y tiras de multitud
    let tex = null;
    if (typeof mkTex === 'function' && typeof G !== 'undefined' && G.dev && typeof TU !== 'undefined') {
      tex = mkTex(4096, 2048, 'rgba8unorm-srgb', TU.RT | TU.TB | TU.CD, { mipLevelCount: 12 });
      if (cv) G.dev.queue.copyExternalImageToTexture({ source: cv }, { texture: tex }, [4096, 2048]);
      const sit = personStrip(16, 0, 31, 128, 224);
      const std = personStrip(3, 1, 57, 104, 288);
      G.dev.queue.writeTexture({ texture: tex, origin: [0, 1600] }, sit.data, { bytesPerRow: sit.w * 4 }, [sit.w, sit.h]);
      G.dev.queue.writeTexture({ texture: tex, origin: [3456, 1024] }, std.data, { bytesPerRow: std.w * 4 }, [std.w, std.h]);
      if (typeof genMips === 'function') genMips(tex, 'rgba8unorm-srgb');
    }

    for (let i = 0; i < 16; i++) reg('p' + i, i * 128 + 3, 803, 122, 218);
    for (let i = 0; i < 3; i++) reg('s' + i, 1728 + i * 104 + 3, 515, 98, 282);

    return tex || { canvas: cv, regions: REG, nBrands: targetProps.nBrands };
  },

  getRegions() {
    if (typeof PROPS !== 'undefined' && PROPS.regions) return PROPS.regions;
    if (typeof window !== 'undefined' && window.PROPS && window.PROPS.regions) return window.PROPS.regions;
    return {};
  }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
  window.AtlasFactory = AtlasFactory;
  window.atlasBuild = () => AtlasFactory.buildPropsAtlas();
}
if (typeof globalThis !== 'undefined') {
  globalThis.AtlasFactory = AtlasFactory;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AtlasFactory, GLY, GWID, textW, strokeText, personSprite, personStrip };
}
})();
