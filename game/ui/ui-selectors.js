"use strict";
// Selectores de coche y circuito en el menú
function uiBuildSelectors() {
  const carBox = $("pick-cars"),
    trkBox = $("pick-tracks");
  if (!carBox || !trkBox) return;
  UI.selCar = CARS.active ? CARS.active.id : "";
  UI.selTrack = TRACKS.active ? TRACKS.active.id : "";
  carBox.innerHTML = "";
  for (const c of CARS.list) {
    const id = "car-" + c.id,
      active = CARS.active && c.id === CARS.active.id;
    const card = document.createElement("div");
    card.className = "pick-card";
    const inp = document.createElement("input");
    inp.type = "radio";
    inp.name = "car-choice";
    inp.id = id;
    inp.value = c.id;
    inp.className = "visually-hidden";
    inp.checked = !!active;
    const lbl = document.createElement("label");
    lbl.htmlFor = id;
    lbl.className = "pick-label";
    const sw = document.createElement("span");
    sw.className = "pick-swatch";
    sw.setAttribute("aria-hidden", "true");
    if (c.accent) sw.style.setProperty("--accent", c.accent);
    const info = document.createElement("span");
    info.className = "pick-info";
    const nm = document.createElement("span");
    nm.className = "pick-name";
    nm.textContent = typeof I18N !== "undefined" ? I18N.carName(c) : c.name;
    if (active) {
      const bg = document.createElement("span");
      bg.className = "pick-badge active";
      bg.textContent =
        typeof I18N !== "undefined" ? I18N.t("badge_current") : "Current";
      nm.appendChild(bg);
    }
    const sb = document.createElement("span");
    sb.className = "pick-sub";
    sb.textContent =
      typeof I18N !== "undefined"
        ? I18N.carSpecs(c)
        : c.specs || c.subtitle || "";
    info.appendChild(nm);
    info.appendChild(sb);
    lbl.appendChild(sw);
    lbl.appendChild(info);
    card.appendChild(inp);
    card.appendChild(lbl);
    inp.addEventListener("change", () => {
      if (!inp.checked) return;
      UI.selCar = c.id;
      uiSyncFallbackClass(carBox);
      uiUpdatePrimaryBtn();
    });
    carBox.appendChild(card);
  }
  trkBox.innerHTML = "";
  for (const t of TRACKS.list) {
    const id = "trk-" + t.id,
      active = TRACKS.active && t.id === TRACKS.active.id;
    let bestStr = null;
    try {
      bestStr = uiFmtLap(+localStorage.getItem(uiStorageKey(t)));
    } catch (e) {}
    const card = document.createElement("div");
    card.className = "pick-card";
    const inp = document.createElement("input");
    inp.type = "radio";
    inp.name = "track-choice";
    inp.id = id;
    inp.value = t.id;
    inp.className = "visually-hidden";
    inp.checked = !!active;
    const lbl = document.createElement("label");
    lbl.htmlFor = id;
    lbl.className = "pick-label";
    const info = document.createElement("span");
    info.className = "pick-info";
    const nm = document.createElement("span");
    nm.className = "pick-name";
    nm.textContent = typeof I18N !== "undefined" ? I18N.trackName(t) : t.name;
    if (active) {
      const bg = document.createElement("span");
      bg.className = "pick-badge active";
      bg.textContent =
        typeof I18N !== "undefined" ? I18N.t("badge_current") : "Current";
      nm.appendChild(bg);
    }
    if (bestStr) {
      const bb = document.createElement("span");
      bb.className = "pick-badge";
      bb.textContent =
        (typeof I18N !== "undefined" ? I18N.t("badge_best") : "Best ") +
        bestStr;
      nm.appendChild(bb);
    }
    const sb = document.createElement("span");
    sb.className = "pick-sub";
    sb.textContent =
      typeof I18N !== "undefined"
        ? I18N.trackSpecs(t)
        : t.specs || t.subtitle || "";
    info.appendChild(nm);
    info.appendChild(sb);
    lbl.appendChild(info);
    card.appendChild(inp);
    card.appendChild(lbl);
    inp.addEventListener("change", () => {
      if (!inp.checked) return;
      UI.selTrack = t.id;
      uiSyncFallbackClass(trkBox);
      uiUpdatePrimaryBtn();
    });
    trkBox.appendChild(card);
  }
  uiSyncFallbackClass(carBox);
  uiSyncFallbackClass(trkBox);
  const activeCar = carBox.querySelector("input:checked");
  if (activeCar && activeCar.closest(".pick-card")) {
    setTimeout(
      () =>
        activeCar.closest(".pick-card").scrollIntoView({ block: "nearest" }),
      0,
    );
  }
  const activeTrk = trkBox.querySelector("input:checked");
  if (activeTrk && activeTrk.closest(".pick-card")) {
    setTimeout(
      () =>
        activeTrk.closest(".pick-card").scrollIntoView({ block: "nearest" }),
      0,
    );
  }
}
function uiChangePreferredCam(val) {
  const camIdx = Math.max(0, Math.min(3, parseInt(val, 10) || 0));
  if (typeof saveSelection === "function") {
    const cur = typeof loadSelection === "function" ? loadSelection() : {};
    saveSelection(cur.car, cur.track, Object.assign({}, cur, { cam: camIdx }));
  }
  if (typeof GS !== "undefined") {
    GS.cam = camIdx;
    GS.cut = true;
    GS.chaseInit = false;
    GS.tvCur = -1;
  }
}

function uiChangeGearbox(val) {
  const isManual = val === "manual";
  if (typeof saveSelection === "function") {
    const cur = typeof loadSelection === "function" ? loadSelection() : {};
    saveSelection(
      cur.car,
      cur.track,
      Object.assign({}, cur, { gearbox: isManual ? "manual" : "auto" }),
    );
  }
  if (typeof GAME !== "undefined") {
    GAME.manualGearbox = isManual;
  }
}
