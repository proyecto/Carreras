"use strict";
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
  const ATLAS_CFG =
    (typeof window !== "undefined" && window.__CFG_ENGINE_ATLAS_FACTORY) ||
    (typeof require === "function"
      ? (() => {
          try {
            return require("../config/engine/atlas-factory.json");
          } catch {
            return {};
          }
        })()
      : {});

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
      const TAU =
        typeof window !== "undefined" && window.TAU ? window.TAU : _TAU;
      const targetProps = (typeof PROPS !== "undefined"
        ? PROPS
        : typeof window !== "undefined"
          ? window.PROPS
          : null) || { sets: [], regions: {} };
      const REG = options.regions || targetProps.regions || {};
      targetProps.regions = REG;

      const cvCfg = ATLAS_CFG.canvas || {};
      const physW = cvCfg.width ? cvCfg.width.value : 4096;
      const physH = cvCfg.height ? cvCfg.height.value : 2048;
      const logW = cvCfg.logicalWidth ? cvCfg.logicalWidth.value : 2048;
      const logH = cvCfg.logicalHeight ? cvCfg.logicalHeight.value : 1024;
      const cvScale = cvCfg.scale ? cvCfg.scale.value : 2;

      const reg = (name, x, y, w, h) => {
        REG[name] = [x / logW, y / logH, (x + w) / logW, (y + h) / logH];
      };

      let cv = null,
        g = null;
      if (typeof document !== "undefined" && document.createElement) {
        cv = document.createElement("canvas");
        cv.width = physW;
        cv.height = physH;
        g = cv.getContext("2d");
        if (g) g.scale(cvScale, cvScale);
      }

      const centered = (txt, x, y, w, h, th, color, weight, skew) => {
        if (g)
          strokeText(
            g,
            txt,
            x + (w - textW(txt, th)) / 2,
            y + (h - th) / 2,
            th,
            color,
            weight,
            skew,
          );
      };

      const isVegas = Boolean(
        typeof TRK !== "undefined" &&
        TRK.spec &&
        (TRK.spec.id === "las-vegas-strip" || TRK.spec.urban),
      );
      const trackId =
        (typeof TRK !== "undefined" && TRK.spec && TRK.spec.id) || "";

      if (g) {
        g.fillStyle = "#888";
        g.fillRect(0, 0, 2048, 1024);

        // Nombre del circuito
        const cbCfg = ATLAS_CFG.circuitBanners || {};
        const bLay = cbCfg.layout || {
          width: 1024,
          height: 128,
          stripe1H: 8,
          stripe2H: 4,
          singleStripeH: 10,
        };
        const bKey = isVegas ? "vegas" : cbCfg[trackId] ? trackId : "default";
        const b = cbCfg[bKey] || {
          bg: "#0b2a4a",
          stripe1: "#e8b21c",
          stripe2: null,
          title: "CIRCUIT GP",
          fontSize: 50,
          textColor: "#f4f1e6",
          weight: 1.75,
          skew: 0.1,
        };
        const title =
          bKey === "default" &&
          typeof TRK !== "undefined" &&
          TRK.spec &&
          TRK.spec.name
            ? TRK.spec.name.toUpperCase()
            : b.title;
        g.fillStyle = b.bg;
        g.fillRect(0, 0, bLay.width, bLay.height);
        if (b.stripe2) {
          g.fillStyle = b.stripe1;
          g.fillRect(0, 0, bLay.width, bLay.stripe1H);
          g.fillRect(0, bLay.height - bLay.stripe1H, bLay.width, bLay.stripe1H);
          g.fillStyle = b.stripe2;
          g.fillRect(0, bLay.stripe1H, bLay.width, bLay.stripe2H);
          g.fillRect(
            0,
            bLay.height - bLay.stripe1H - bLay.stripe2H,
            bLay.width,
            bLay.stripe2H,
          );
        } else {
          g.fillStyle = b.stripe1;
          g.fillRect(0, 0, bLay.width, bLay.singleStripeH);
          g.fillRect(
            0,
            bLay.height - bLay.singleStripeH,
            bLay.width,
            bLay.singleStripeH,
          );
        }
        centered(
          title,
          0,
          0,
          bLay.width,
          bLay.height,
          b.fontSize,
          b.textColor,
          b.weight,
          b.skew,
        );
      }
      reg("name", 0, 0, 1024, 128);

      // Setas de curva (chevrons)
      if (g) {
        const chCfg = ATLAS_CFG.chevrons || {};
        const chBg = chCfg.bg ? chCfg.bg.value : "#e9e6dc";
        const chFg = chCfg.fg ? chCfg.fg.value : "#b3160f";
        const chCnt = chCfg.count ? chCfg.count.value : 5;
        const chX0 = chCfg.xStart ? chCfg.xStart.value : 1034;
        const chStep = chCfg.step ? chCfg.step.value : 102;
        const sh = chCfg.shape ? chCfg.shape.value : [8, 48, 92, 64, 120, 44];
        g.fillStyle = chBg;
        g.fillRect(1024, 0, 512, 128);
        g.fillStyle = chFg;
        for (let i = 0; i < chCnt; i++) {
          const x = chX0 + i * chStep;
          g.beginPath();
          g.moveTo(x, sh[0]);
          g.lineTo(x + sh[1], sh[0]);
          g.lineTo(x + sh[2], sh[3]);
          g.lineTo(x + sh[1], sh[4]);
          g.lineTo(x, sh[4]);
          g.lineTo(x + sh[5], sh[3]);
          g.closePath();
          g.fill();
        }
      }
      reg("chev", 1024, 0, 512, 128);

      // Faixa "PIT LANE" / "BOXENGASSE" / "BOXES"
      if (g) {
        const plCfg = ATLAS_CFG.pitLane || {};
        const plBg = plCfg.bg ? plCfg.bg.value : "#161a22";
        const plStripe = isVegas
          ? plCfg.vegasStripe
            ? plCfg.vegasStripe.value
            : "#00a3e0"
          : plCfg.defaultStripe
            ? plCfg.defaultStripe.value
            : "#e8b21c";
        const plTxt = plCfg.textColor ? plCfg.textColor.value : "#ffffff";
        const plFs = plCfg.fontSize ? plCfg.fontSize.value : 68;
        const plLay = plCfg.layout
          ? plCfg.layout.value
          : [1536, 0, 512, 128, 8];
        g.fillStyle = plBg;
        g.fillRect(plLay[0], plLay[1], plLay[2], plLay[3]);
        g.fillStyle = plStripe;
        g.fillRect(plLay[0], plLay[1], plLay[2], plLay[4]);
        g.fillRect(
          plLay[0],
          plLay[1] + plLay[3] - plLay[4],
          plLay[2],
          plLay[4],
        );
        centered(
          isVegas
            ? "PIT LANE"
            : trackId === "nurburgring-gp"
              ? "BOXENGASSE"
              : "PIT LANE",
          plLay[0],
          plLay[1],
          plLay[2],
          plLay[3],
          plFs,
          plTxt,
          1.8,
          0.08,
        );
      }
      reg("boxes", 1536, 0, 512, 128);

      const brCfg = ATLAS_CFG.brands || {};
      let brands;
      if (isVegas) {
        brands = brCfg.vegas || [
          ["HEINEKEN 0.0", "#007A33", "#ffffff", 0],
          ["TAG HEUER", "#0d0f12", "#00d2be", 1],
          ["ARAMCO", "#002044", "#00A3E0", 3],
          ["DHL", "#D40511", "#FFCC00", 4],
          ["PIRELLI", "#D52B1E", "#FFD100", 6],
          ["ROLEX", "#004d30", "#c8a85c", 5],
          ["CAESARS PALACE", "#221230", "#e5c158", 3],
          ["BELLAGIO", "#0e1e36", "#e5c158", 2],
          ["MGM GRAND", "#0a2e1d", "#e5c158", 0],
          ["WYNN LAS VEGAS", "#45131b", "#f5d688", 1],
          ["LVMH", "#141416", "#f5f5f5", 5],
          ["F1 LAS VEGAS", "#e10600", "#ffffff", 4],
        ];
      } else if (trackId === "nurburgring-gp") {
        brands = brCfg["nurburgring-gp"] || [
          ["BILSTEIN", "#005bac", "#ffd000", 0],
          ["ADAC", "#ffcc00", "#111111", 1],
          ["RAVENOL", "#003087", "#ffd100", 3],
          ["BBS", "#15171c", "#c8c8c8", 6],
          ["MICHELIN", "#002060", "#ffea00", 2],
          ["DEKRA", "#008754", "#ffffff", 4],
          ["TOTAL ENERGIES", "#da291c", "#ffffff", 5],
          ["RECARO", "#16181d", "#e30613", 0],
          ["H&R SPRINGS", "#16181d", "#ed1c24", 1],
          ["ROWE MOTOR OIL", "#002f6c", "#ff6600", 3],
          ["PUMA MOTORSPORT", "#111111", "#ffffff", 2],
          ["BOSCH", "#e2001a", "#ffffff", 4],
        ];
      } else if (trackId === "spa-francorchamps") {
        brands = brCfg["spa-francorchamps"] || [
          ["ROLEX", "#004d30", "#c8a85c", 5],
          ["TOTAL ENERGIES", "#da291c", "#ffffff", 2],
          ["PIRELLI", "#D52B1E", "#FFD100", 6],
          ["MOOBLUZ", "#0c1e38", "#ffffff", 3],
          ["DHL", "#D40511", "#FFCC00", 4],
          ["ARAMCO", "#002044", "#00A3E0", 1],
          ["SPA-FRANCORCHAMPS", "#162238", "#dfba60", 0],
          ["TAG HEUER", "#0d0f12", "#00d2be", 1],
          ["HEINEKEN 0.0", "#007A33", "#ffffff", 0],
          ["MICHELIN", "#002060", "#ffea00", 2],
          ["AWS", "#1b2432", "#ff9900", 5],
          ["LIQUI MOLY", "#003e7e", "#e30613", 3],
        ];
      } else {
        brands = brCfg.default || [
          ["PIRELLI", "#D52B1E", "#FFD100", 6],
          ["TAG HEUER", "#0d0f12", "#00d2be", 1],
          ["ARAMCO", "#002044", "#00A3E0", 3],
          ["DHL", "#D40511", "#FFCC00", 4],
          ["MICHELIN", "#002060", "#ffea00", 2],
          ["ROLEX", "#004d30", "#c8a85c", 5],
          ["TOTAL ENERGIES", "#da291c", "#ffffff", 2],
          ["BILSTEIN", "#005bac", "#ffd000", 0],
          ["BOSCH", "#e2001a", "#ffffff", 4],
          ["BBS", "#15171c", "#c8c8c8", 6],
          ["PUMA", "#111111", "#ffffff", 1],
          ["HEINEKEN 0.0", "#007A33", "#ffffff", 0],
        ];
      }

      const brLay = brCfg.layout || {
        tileW: 512,
        tileH: 128,
        textXOffset: 116,
        textW: 388,
        maxFontSize: 62,
        maxTextW: 376,
        weight: 1.8,
        skew: 0.1,
      };
      brands.forEach((b, i) => {
        const x = (i % 4) * brLay.tileW,
          y = brLay.tileH + Math.floor(i / 4) * brLay.tileH;
        if (g) {
          g.fillStyle = b[1];
          g.fillRect(x, y, brLay.tileW, brLay.tileH);
          g.fillStyle = b[2];
          g.strokeStyle = b[2];
          g.lineWidth = brLay.iconLineWidth || 7;
          const ic = b[3],
            ix = x + (brLay.iconXOffset || 62),
            iy = y + (brLay.iconYOffset || 64);
          if (ic === 0) {
            const ci = brLay.circleIcon || [36, 14];
            g.beginPath();
            g.arc(ix, iy, ci[0], 0, TAU);
            g.stroke();
            g.beginPath();
            g.arc(ix, iy, ci[1], 0, TAU);
            g.fill();
          } else if (ic === 1) {
            g.beginPath();
            g.moveTo(ix - 34, iy + 32);
            g.lineTo(ix + 4, iy - 36);
            g.lineTo(ix + 2, iy - 2);
            g.lineTo(ix + 34, iy - 32);
            g.lineTo(ix - 2, iy + 36);
            g.lineTo(ix, iy + 4);
            g.closePath();
            g.fill();
          } else if (ic === 2) {
            const el = brLay.ellipseIcon || [26, 38, 0.5];
            g.beginPath();
            g.ellipse(ix, iy, el[0], el[1], el[2], 0, TAU);
            g.fill();
            g.strokeStyle = b[1];
            g.lineWidth = 5;
            g.beginPath();
            g.moveTo(ix - 12, iy + 30);
            g.quadraticCurveTo(ix + 10, iy, ix + 8, iy - 34);
            g.stroke();
          } else if (ic === 3) {
            g.beginPath();
            g.moveTo(ix, iy - 40);
            g.lineTo(ix + 36, iy - 22);
            g.lineTo(ix + 30, iy + 18);
            g.lineTo(ix, iy + 40);
            g.lineTo(ix - 30, iy + 18);
            g.lineTo(ix - 36, iy - 22);
            g.closePath();
            g.stroke();
          } else if (ic === 4) {
            g.beginPath();
            g.moveTo(ix - 36, iy + 34);
            g.lineTo(ix, iy - 38);
            g.lineTo(ix + 36, iy + 34);
            g.closePath();
            g.fill();
          } else if (ic === 5) {
            g.lineWidth = 8;
            g.beginPath();
            g.moveTo(ix - 22, iy - 40);
            g.lineTo(ix - 22, iy + 40);
            g.moveTo(ix + 22, iy - 40);
            g.lineTo(ix + 22, iy + 40);
            for (let k = -2; k <= 2; k++) {
              g.moveTo(ix - 22, iy + k * 16);
              g.lineTo(ix + 22, iy + k * 16);
            }
            g.stroke();
          } else {
            for (let k = 0; k < 5; k++) {
              g.beginPath();
              g.moveTo(ix - 40 + k * 18, iy + 38);
              g.lineTo(ix - 22 + k * 18, iy - 38);
              g.lineTo(ix - 12 + k * 18, iy - 38);
              g.lineTo(ix - 30 + k * 18, iy + 38);
              g.closePath();
              g.fill();
            }
          }
          const th = Math.min(
            brLay.maxFontSize,
            brLay.maxTextW / textW(b[0], 1),
          );
          centered(
            b[0],
            x + brLay.textXOffset,
            y,
            brLay.textW,
            brLay.tileH,
            th,
            b[2],
            brLay.weight,
            brLay.skew,
          );
        }
        reg("b" + i, x, y, brLay.tileW, brLay.tileH);
        if (b[0].startsWith("HEINEKEN"))
          reg("heineken", x, y, brLay.tileW, brLay.tileH);
      });
      targetProps.nBrands = brands.length;

      // Placas de distancia (150, 100, 50)
      const dsCfg = ATLAS_CFG.distanceSigns || {};
      const dsVals = dsCfg.values ? dsCfg.values.value : ["150", "100", "50"];
      const dsBg = dsCfg.bg ? dsCfg.bg.value : "#f1efe6";
      const dsFg = dsCfg.fg ? dsCfg.fg.value : "#141414";
      const dsLay = dsCfg.layout
        ? dsCfg.layout.value
        : [960, 256, 512, 208, 9, 10];
      const dsFnt = dsCfg.font ? dsCfg.font.value : [78, 104, 1.75];
      dsVals.forEach((t, i) => {
        const x = dsLay[0] + i * dsLay[1],
          y = dsLay[2],
          w = dsLay[1],
          h = dsLay[3],
          ins = dsLay[5];
        if (g) {
          g.fillStyle = dsBg;
          g.fillRect(x, y, w, h);
          g.strokeStyle = dsFg;
          g.lineWidth = dsLay[4];
          g.strokeRect(x + ins, y + ins, w - ins * 2, h - ins * 2);
          centered(
            t,
            x,
            y,
            w,
            h,
            t.length > 2 ? dsFnt[0] : dsFnt[1],
            dsFg,
            dsFnt[2],
            0,
          );
        }
        reg("d" + t, x, y, w, h);
      });

      // Números de garaje (01 a 20)
      const gnCfg = ATLAS_CFG.garageNumbers || {};
      const gnCnt = gnCfg.count ? gnCfg.count.value : 20;
      const gnBg = gnCfg.bg ? gnCfg.bg.value : "#16181c";
      const gnFg = gnCfg.fg ? gnCfg.fg.value : "#f2c318";
      for (let i = 0; i < gnCnt; i++) {
        const x = (i % 10) * 96,
          y = 640 + Math.floor(i / 10) * 64;
        if (g) {
          g.fillStyle = gnBg;
          g.fillRect(x, y, 96, 64);
          centered(
            (i < 9 ? "0" : "") + (i + 1),
            x,
            y,
            96,
            64,
            40,
            gnFg,
            1.4,
            0,
          );
        }
        reg("g" + i, x, y, 96, 64);
      }

      // Franjas diagonales de peligro (caballetes)
      if (g) {
        g.fillStyle = "#e9e6dc";
        g.fillRect(480, 512, 256, 128);
        g.fillStyle = "#c9281c";
        for (let k = -2; k < 8; k++) {
          g.beginPath();
          g.moveTo(480 + k * 48, 640);
          g.lineTo(504 + k * 48, 640);
          g.lineTo(552 + k * 48, 512);
          g.lineTo(528 + k * 48, 512);
          g.closePath();
          g.fill();
        }
      }
      reg("stripe", 484, 516, 248, 120);

      // Si WebGPU está activo, subir textura y tiras de multitud
      let tex = null;
      if (
        typeof mkTex === "function" &&
        typeof G !== "undefined" &&
        G.dev &&
        typeof TU !== "undefined"
      ) {
        const mips = cvCfg.mipLevels ? cvCfg.mipLevels.value : 12;
        const csCfg = ATLAS_CFG.crowdStrips || {};
        const sitCfg = csCfg.sitting
          ? csCfg.sitting.value
          : [16, 0, 31, 128, 224, 0, 1600];
        const stdCfg = csCfg.standing
          ? csCfg.standing.value
          : [3, 1, 57, 104, 288, 3456, 1024];
        tex = mkTex(physW, physH, "rgba8unorm-srgb", TU.RT | TU.TB | TU.CD, {
          mipLevelCount: mips,
        });
        if (cv)
          G.dev.queue.copyExternalImageToTexture(
            { source: cv },
            { texture: tex },
            [physW, physH],
          );
        const sit = personStrip(
          sitCfg[0],
          sitCfg[1],
          sitCfg[2],
          sitCfg[3],
          sitCfg[4],
        );
        const std = personStrip(
          stdCfg[0],
          stdCfg[1],
          stdCfg[2],
          stdCfg[3],
          stdCfg[4],
        );
        G.dev.queue.writeTexture(
          { texture: tex, origin: [sitCfg[5], sitCfg[6]] },
          sit.data,
          { bytesPerRow: sit.w * 4 },
          [sit.w, sit.h],
        );
        G.dev.queue.writeTexture(
          { texture: tex, origin: [stdCfg[5], stdCfg[6]] },
          std.data,
          { bytesPerRow: std.w * 4 },
          [std.w, std.h],
        );
        if (typeof genMips === "function") genMips(tex, "rgba8unorm-srgb");
      }

      const crCfg = ATLAS_CFG.crowdRegions || {};
      const crSit = crCfg.sitting
        ? crCfg.sitting.value
        : [16, 128, 3, 803, 122, 218];
      const crStd = crCfg.standing
        ? crCfg.standing.value
        : [3, 1728, 104, 3, 515, 98, 282];
      for (let i = 0; i < crSit[0]; i++)
        reg("p" + i, i * crSit[1] + crSit[2], crSit[3], crSit[4], crSit[5]);
      for (let i = 0; i < crStd[0]; i++)
        reg(
          "s" + i,
          crStd[1] + i * crStd[2] + crStd[3],
          crStd[4],
          crStd[5],
          crStd[6],
        );

      return tex || { canvas: cv, regions: REG, nBrands: targetProps.nBrands };
    },

    getRegions() {
      if (typeof PROPS !== "undefined" && PROPS.regions) return PROPS.regions;
      if (typeof window !== "undefined" && window.PROPS && window.PROPS.regions)
        return window.PROPS.regions;
      return {};
    },
  };

  // Exportar globalmente
  if (typeof window !== "undefined") {
    window.AtlasFactory = AtlasFactory;
    window.atlasBuild = () => AtlasFactory.buildPropsAtlas();
  }
  if (typeof globalThis !== "undefined") {
    globalThis.AtlasFactory = AtlasFactory;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      AtlasFactory,
      GLY,
      GWID,
      textW,
      strokeText,
      personSprite,
      personStrip,
    };
  }
})();
