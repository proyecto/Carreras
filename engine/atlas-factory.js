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
