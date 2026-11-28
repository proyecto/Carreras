'use strict';
// Panel de opciones y remapeo de controles
const CONTROL_ACTIONS = [
  { id: 'accel', labelKey: 'action_accel' },
  { id: 'brake', labelKey: 'action_brake' },
  { id: 'left', labelKey: 'action_left' },
  { id: 'right', labelKey: 'action_right' },
  { id: 'handbrake', labelKey: 'action_handbrake' },
  { id: 'gearUp', labelKey: 'action_gear_up', fallback: 'Subir marcha' },
  { id: 'gearDown', labelKey: 'action_gear_down', fallback: 'Bajar marcha' },
  { id: 'tc', labelKey: 'action_tc', fallback: 'Control de tracción (TC)' },
  { id: 'camera', labelKey: 'action_camera' },
  { id: 'lookBack', labelKey: 'action_look_back' },
  { id: 'reset', labelKey: 'action_reset' },
  { id: 'mute', labelKey: 'action_mute' },
  { id: 'stats', labelKey: 'action_stats' },
];

function uiShowOptions(show) {
  if (typeof UI !== 'undefined' && UI.listeningKey) {
    UI.listeningKey = null;
  }
  const pMain = (typeof UI !== 'undefined' && UI.pMain) || document.getElementById('panel-main');
  const pOpt = (typeof UI !== 'undefined' && UI.pOpt) || document.getElementById('panel-options');
  if (pMain) pMain.style.display = show ? 'none' : 'block';
  if (pOpt) pOpt.style.display = show ? 'block' : 'none';

  if (show) {
    uiRenderControls();
    const bBack = (typeof UI !== 'undefined' && UI.bOptBack) || document.getElementById('b-opt-back');
    if (bBack) bBack.focus();
  } else {
    const b0 = (typeof UI !== 'undefined' && UI.b0) || document.getElementById('b0');
    if (b0) b0.focus();
  }
}

function uiOpenMultiplayer() {
  uiShowOptions(true);
  const grp = document.getElementById('opt-group-multiplayer');
  if (grp) {
    setTimeout(() => grp.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }
}

function uiNetCreateRoom() {
  if (typeof NET === 'undefined') return;
  NET.createRoom();
  const shareCont = document.getElementById('net-share-container');
  const shareInput = document.getElementById('net-share-url');
  if (shareCont && shareInput) {
    shareCont.style.display = 'flex';
    const loc = window.location;
    const url = `${loc.protocol}//${loc.host}${loc.pathname}?room=${NET.roomId}`;
    shareInput.value = url;
  }
}

function uiNetJoinRoom() {
  if (typeof NET === 'undefined') return;
  const input = document.getElementById('net-room-input');
  if (!input || !input.value) return;
  let code = input.value.trim();
  if (code.includes('?room=')) {
    try {
      const u = new URL(code, window.location.href);
      code = u.searchParams.get('room') || code;
    } catch (e) {}
  }
  NET.joinRoom(code);
}

function uiNetCopyLink() {
  const shareInput = document.getElementById('net-share-url');
  const copyBtn = document.getElementById('b-copy-link');
  if (!shareInput) return;
  shareInput.select();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(shareInput.value);
  } else {
    document.execCommand('copy');
  }
  if (copyBtn) {
    const orig = copyBtn.textContent;
    copyBtn.textContent = (typeof I18N !== 'undefined') ? I18N.t('link_copied') : '¡Copiado!';
    setTimeout(() => { copyBtn.textContent = orig; }, 2000);
  }
}

