"use strict";
// Configuración de rival IA, número de rivales, vueltas y selección
function uiToggleRival() {
  UI.selRival = !UI.selRival;
  if (UI.selRival && !UI.selRivalCar) {
    uiRerollRival(false);
  }
  uiUpdateRivalDOM();
  uiUpdatePrimaryBtn();
}

function uiChangeRivalCount(val) {
  const count = Math.max(1, Math.min(15, parseInt(val, 10) || 1));
  UI.selRivalCount = count;
  uiUpdateRivalDOM();
  uiUpdatePrimaryBtn();
}

function uiChangeTotalLaps(val) {
  const laps = Math.max(1, Math.min(50, parseInt(val, 10) || 3));
  UI.selTotalLaps = laps;
  uiUpdateLapsDOM();
  uiUpdatePrimaryBtn();
}

function _populateLapSelect(sel) {
  if (!sel || sel.options.length > 0) return;
  const options = [1, 2, 3, 5, 7, 10, 15, 20];
  for (const n of options) {
    const opt = document.createElement("option");
    opt.value = String(n);
    opt.textContent = String(n);
    sel.appendChild(opt);
  }
}

function uiUpdateLapsDOM() {
  const laps = Math.max(1, Math.min(50, UI.selTotalLaps || 3));
  UI.selTotalLaps = laps;
  const selMain = $("lap-count-select");
  const selOpt = $("opt-lap-count-select");
  if (selMain) {
    _populateLapSelect(selMain);
    selMain.value = String(laps);
  }
  if (selOpt) {
    _populateLapSelect(selOpt);
    selOpt.value = String(laps);
  }
}

function uiRerollRival(applyChanged = true) {
  const manifest = (typeof window !== "undefined" && window.CAR_MANIFEST) || [];
  const pool = manifest.filter((c) => c.id !== UI.selCar);
  if (pool.length === 0) return;
  const candidates = pool.filter((c) => c.id !== UI.selRivalCar);
  const pickFrom = candidates.length > 0 ? candidates : pool;
  const picked = pickFrom[Math.floor(Math.random() * pickFrom.length)];
  UI.selRivalCar = picked.id;
  uiUpdateRivalDOM();
  if (applyChanged) uiUpdatePrimaryBtn();
}

function _populateRivalSelect(sel) {
  if (!sel || sel.options.length === 15) return;
  sel.innerHTML = "";
  for (let i = 1; i <= 15; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    sel.appendChild(opt);
  }
}

function uiUpdateRivalDOM() {
  const enabled = !!UI.selRival;
  const count = Math.max(1, Math.min(15, UI.selRivalCount || 1));
  UI.selRivalCount = count;
  const manifest = (typeof window !== "undefined" && window.CAR_MANIFEST) || [];
  let rivalCar = manifest.find((c) => c.id === UI.selRivalCar);
  if (!rivalCar && CARS.rival) rivalCar = CARS.rival;
  if (!rivalCar && manifest.length > 0) {
    const pool = manifest.filter((c) => c.id !== UI.selCar);
    rivalCar = pool[0] || manifest[0];
    if (rivalCar) UI.selRivalCar = rivalCar.id;
  }

  const rivalName = rivalCar
    ? typeof I18N !== "undefined"
      ? I18N.carName(rivalCar)
      : rivalCar.name
    : "";
  const rivalSpecs = rivalCar
    ? typeof I18N !== "undefined"
      ? I18N.carSpecs(rivalCar)
      : rivalCar.specs || rivalCar.subtitle || ""
    : "";

  // 1. Selector de cantidad y botón del panel principal
  const btnMain = $("btn-toggle-rival");
  const txtMain = $("rival-toggle-text");
  const subMain = $("rival-panel-model");
  const wrapMain = $("rival-count-wrapper");
  const selMain = $("rival-count-select");

  if (selMain) {
    _populateRivalSelect(selMain);
    selMain.value = String(count);
  }
  if (wrapMain) {
    wrapMain.classList.toggle("is-hidden", !enabled);
  }

  if (btnMain) {
    btnMain.classList.toggle("is-active", enabled);
    btnMain.setAttribute("aria-pressed", enabled ? "true" : "false");
    const icon = btnMain.querySelector(".rival-icon");
    if (icon) icon.textContent = enabled ? "🏁" : "⏱️";
  }
  if (txtMain) {
    txtMain.textContent =
      typeof I18N !== "undefined"
        ? I18N.t(enabled ? "rival_btn_enabled" : "rival_btn_disabled")
        : enabled
          ? "Rival: Activado"
          : "Rival: Desactivado";
  }
  if (subMain) {
    if (!enabled) {
      subMain.textContent =
        typeof I18N !== "undefined"
          ? I18N.t("rival_status_off")
          : "Práctica en solitario · Pista libre";
    } else if (count > 1) {
      subMain.textContent =
        typeof I18N !== "undefined"
          ? I18N.t("rival_count_multiple", { count: count })
          : `${count} rivales en pista · Modelos reales (${rivalName} y +${count - 1})`;
    } else {
      subMain.textContent =
        typeof I18N !== "undefined"
          ? I18N.t("rival_model_label", { name: rivalName })
          : `Rival actual: ${rivalName}`;
    }
  }

  // 2. Selector de cantidad y botón de la pantalla de Opciones
  const btnOpt = $("b-opt-rival");
  const txtOpt = $("opt-rival-text");
  const optName = $("opt-rival-car-name");
  const optSpecs = $("opt-rival-car-specs");
  const btnReroll = $("b-opt-reroll-rival");
  const wrapOpt = $("opt-rival-count-wrapper");
  const selOpt = $("opt-rival-count-select");

  if (selOpt) {
    _populateRivalSelect(selOpt);
    selOpt.value = String(count);
  }
  if (wrapOpt) {
    wrapOpt.classList.toggle("is-hidden", !enabled);
  }

  if (btnOpt) {
    btnOpt.classList.toggle("is-active", enabled);
    btnOpt.setAttribute("aria-pressed", enabled ? "true" : "false");
    const icon = btnOpt.querySelector(".rival-icon");
    if (icon) icon.textContent = enabled ? "🏁" : "⏱️";
  }
  if (txtOpt) {
    txtOpt.textContent =
      typeof I18N !== "undefined"
        ? I18N.t(enabled ? "rival_btn_enabled" : "rival_btn_disabled")
        : enabled
          ? "Rival: Activado"
          : "Rival: Desactivado";
  }
  if (optName) {
    if (!enabled) {
      optName.textContent =
        typeof I18N !== "undefined"
          ? I18N.t("rival_status_off")
          : "Práctica en solitario · Pista libre";
    } else if (count > 1) {
      optName.textContent =
        typeof I18N !== "undefined"
          ? I18N.t("rival_count_multiple", { count: count })
          : `${count} rivales en pista · Modelos reales`;
    } else {
      optName.textContent = rivalName;
    }
  }
  if (optSpecs) {
    if (!enabled) {
      optSpecs.textContent = "";
    } else if (count > 1) {
      optSpecs.textContent = rivalName
        ? `${rivalName} (${rivalSpecs}) y ${count - 1} más`
        : "";
    } else {
      optSpecs.textContent = rivalSpecs;
    }
  }
  if (btnReroll) {
    btnReroll.style.display = enabled ? "inline-block" : "none";
  }
}
function uiSyncFallbackClass(container) {
  if (
    typeof CSS !== "undefined" &&
    CSS.supports &&
    CSS.supports("selector(:has(*))")
  )
    return;
  const cards = container.querySelectorAll(".pick-card");
  for (let i = 0; i < cards.length; i++) {
    const inp = cards[i].querySelector("input");
    cards[i].classList.toggle("is-selected", !!(inp && inp.checked));
  }
}
