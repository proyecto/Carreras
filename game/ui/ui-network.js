'use strict';
// UI multijugador P2P WebRTC
function uiSetupNetworkListeners() {
  if (typeof NET === 'undefined') return;

  NET.onStatusChange = (state, message) => {
    const dot = document.getElementById('net-status-dot');
    const txt = document.getElementById('net-status-text');
    const pingEl = document.getElementById('net-ping-badge');
    const rivalBadge = document.getElementById('net-rival-badge');

    if (dot) {
      dot.className = 'net-status-dot ' + (state === 'connected' ? 'is-connected' : state === 'connecting' || state === 'waiting' ? 'is-connecting' : 'is-idle');
    }
    if (txt) {
      txt.textContent = message;
    }
    if (pingEl) {
      pingEl.style.display = state === 'connected' ? 'inline-block' : 'none';
      if (state === 'connected') pingEl.textContent = `${NET.ping} ms`;
    }
    if (rivalBadge && state === 'connected') {
      rivalBadge.style.display = 'block';
    }
  };

  NET.onRemoteCarSelected = (carId, name) => {
    const rivalName = document.getElementById('net-rival-name');
    const rivalCar = document.getElementById('net-rival-car');
    if (rivalName) rivalName.textContent = name || 'Rival P2P';
    if (rivalCar) {
      const carObj = typeof CARS !== 'undefined' ? CARS.get(carId) : null;
      rivalCar.textContent = carObj ? carObj.name : carId;
    }
  };

  setInterval(() => {
    if (NET && NET.connected) {
      const pingEl = document.getElementById('net-ping-badge');
      if (pingEl) pingEl.textContent = `${NET.ping} ms`;
    }
  }, 1000);
}

function uiRenderControls() {
  const container = document.getElementById('controls-config');
  const ctrlMgr = (typeof CONTROLS !== 'undefined') ? CONTROLS : (typeof window !== 'undefined' ? window.CONTROLS : null);
  if (!container || !ctrlMgr || !ctrlMgr.keys) return;
  container.innerHTML = '';

  for (const act of CONTROL_ACTIONS) {
    const row = document.createElement('div');
    row.className = 'ctrl-config-row';

    const lbl = document.createElement('span');
    lbl.className = 'ctrl-config-label';
    lbl.textContent = (typeof I18N !== 'undefined') ? I18N.t(act.labelKey) : act.id;
    row.appendChild(lbl);

    const keysDiv = document.createElement('div');
    keysDiv.className = 'ctrl-config-keys';

    const keys = ctrlMgr.keys[act.id] || ['', ''];
    for (let slot = 0; slot < 2; slot++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'key-btn';
      const isListening = (typeof UI !== 'undefined') && UI.listeningKey && UI.listeningKey.action === act.id && UI.listeningKey.slot === slot;
      if (isListening) {
        btn.classList.add('listening');
        btn.textContent = (typeof I18N !== 'undefined') ? I18N.t('press_key') : '…';
      } else {
        const code = keys[slot];
        btn.textContent = ctrlMgr.formatKey(code);
        if (!code) btn.classList.add('empty');
      }

      btn.onclick = (e) => {
        e.stopPropagation();
        if (typeof UI === 'undefined') return;
        if (UI.listeningKey && UI.listeningKey.action === act.id && UI.listeningKey.slot === slot) {
          UI.listeningKey = null;
        } else {
          UI.listeningKey = { action: act.id, slot: slot, btnEl: btn };
        }
        uiRenderControls();
      };
      keysDiv.appendChild(btn);
    }

    row.appendChild(keysDiv);
    container.appendChild(row);
  }
}

if (typeof window !== 'undefined') {
  window.uiShowOptions = uiShowOptions;
  window.uiRenderControls = uiRenderControls;
}
function uiStorageKey(trk) {
  const t = trk || TRACKS.active;
  return (t && t.storageKey) || ('melhor-' + (t ? t.id : 'default'));
}
function uiFmtLap(sec) {
  if (!(sec > 20 && sec < 600)) return null;
  const cs = Math.round(sec * 100), m = (cs / 6000) | 0, s = ((cs / 100) | 0) % 60, c = cs % 100;
  return m + ':' + (s < 10 ? '0' : '') + s + '.' + (c < 10 ? '0' : '') + c;
}
function uiSelectionChanged() {
  const carChanged = !!(CARS.active && UI.selCar !== CARS.active.id);
  const trkChanged = !!(TRACKS.active && UI.selTrack !== TRACKS.active.id);
  const rivalCurrent = (typeof GAME !== 'undefined' && typeof GAME.rivalEnabled !== 'undefined')
    ? (GAME.rivalEnabled !== false)
    : true;
  const rivalChanged = (UI.selRival !== rivalCurrent);
  const rivalCarCurrent = (CARS.rival ? CARS.rival.id : ((typeof window !== 'undefined' && window.__rivalCarId) || ''));
  const rivalCarChanged = (UI.selRival && UI.selRivalCar && rivalCarCurrent && UI.selRivalCar !== rivalCarCurrent);
  const rivalCountCurrent = (typeof GAME !== 'undefined' && GAME.rivalCount)
    ? GAME.rivalCount
    : ((typeof window !== 'undefined' && window.__rivalCount) || 1);
  const rivalCountChanged = (UI.selRival && UI.selRivalCount !== rivalCountCurrent);
  const totalLapsCurrent = (typeof GAME !== 'undefined' && GAME.totalLaps)
    ? GAME.totalLaps
    : ((typeof window !== 'undefined' && window.__totalLaps) || 3);
  const totalLapsChanged = (UI.selTotalLaps && UI.selTotalLaps !== totalLapsCurrent);
  return carChanged || trkChanged || rivalChanged || rivalCarChanged || rivalCountChanged || totalLapsChanged;
}
function uiUpdatePrimaryBtn() {
  if (!UI.b0) return;
  if (uiSelectionChanged()) {
    UI.b0.textContent = (typeof I18N !== 'undefined') ? (I18N.t('btn_apply_race') || 'Apply & Race') : 'Apply & Race';
  } else {
    if (UI.st === ST.INICIO) {
      UI.b0.textContent = (typeof I18N !== 'undefined') ? I18N.t('btn_start') : 'Start';
    } else if (UI.st === ST.RESULT) {
      UI.b0.textContent = (typeof I18N !== 'undefined') ? I18N.t('btn_resume_driving') : 'Resume driving';
    } else {
      UI.b0.textContent = (typeof I18N !== 'undefined') ? I18N.t('btn_continue') : 'Continue';
    }
  }
}
function uiApplySelection(startDirectly = true) {
  saveSelection(UI.selCar, UI.selTrack, {
    rival: UI.selRival,
    rivalCar: UI.selRivalCar,
    rivalCount: UI.selRivalCount,
    totalLaps: UI.selTotalLaps
  });
  if (typeof setMsg === 'function') setMsg((typeof I18N !== 'undefined') ? I18N.t('loading') : 'Loading…');
  if (UI.el) UI.el.style.display = 'none';
  const p = new URLSearchParams(location.search);
  p.set('car', UI.selCar);
  p.set('track', UI.selTrack);
  p.set('laps', String(UI.selTotalLaps || 3));
  p.set('rival', UI.selRival ? '1' : '0');
  if (UI.selRival) {
    p.set('rivals', String(UI.selRivalCount));
    if (UI.selRivalCar) p.set('rivalCar', UI.selRivalCar);
    else p.delete('rivalCar');
  } else {
    p.delete('rivals');
    p.delete('rivalCar');
  }
  if (startDirectly) p.set('play', '1');
  location.search = '?' + p.toString();
}

