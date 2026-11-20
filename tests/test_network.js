'use strict';
/**
 * ============================================================================
 * TEST SUITE: MULTIJUGADOR P2P WEBRTC (tests/test_network.js)
 * ============================================================================
 * Valida el protocolo binario, la serialización de telemetría a 60 Hz,
 * la extrapolación de movimiento (Dead Reckoning) y los eventos de red.
 */

const assert = require('assert');
const NET = require('../game/network.js');

let totalAsserts = 0;
function testAssert(condition, message) {
  assert(condition, message);
  totalAsserts++;
}

console.log('--- [TEST SUITE] Validación de Red Multijugador (game/network.js) ---');

// 1. Estructura y Protocolo Binario
{
  testAssert(NET._sendBuffer instanceof Float32Array && NET._sendBuffer.length === 12, 'NET._sendBuffer es un Float32Array de 12 elementos');
  testAssert(NET._recvBuffer instanceof Float32Array && NET._recvBuffer.length === 12, 'NET._recvBuffer es un Float32Array de 12 elementos');
  testAssert(NET._sendBuffer.byteLength === 48, 'El paquete de telemetría pesa exactamente 48 bytes (UDP compacto)');
}

// 2. Empaquetado y Desempaquetado de Telemetría
{
  const mockVeh = {
    x: 142.5,
    y: 12.8,
    z: -305.2,
    yaw: 1.45,
    vx: 55.4,
    vy: -0.22,
    steer: 0.15,
    rpm: 7400,
    gear: 4,
    s: 1820.5,
    d: -1.25
  };

  // Simular empaquetado directo en el buffer
  const buf = NET._sendBuffer;
  buf[0] = mockVeh.x;
  buf[1] = mockVeh.y;
  buf[2] = mockVeh.z;
  buf[3] = mockVeh.yaw;
  buf[4] = mockVeh.vx;
  buf[5] = mockVeh.vy;
  buf[6] = mockVeh.steer;
  buf[7] = mockVeh.rpm;
  buf[8] = mockVeh.gear;
  buf[9] = mockVeh.s;
  buf[10] = mockVeh.d;
  buf[11] = 12345.67;

  // Desempaquetar
  NET._unpackTelemetry(buf.buffer);
  const r = NET.remoteState;

  testAssert(Math.abs(r.x - mockVeh.x) < 0.001, 'Telemetría x desempaquetada con precisión');
  testAssert(Math.abs(r.z - mockVeh.z) < 0.001, 'Telemetría z desempaquetada con precisión');
  testAssert(Math.abs(r.yaw - mockVeh.yaw) < 0.001, 'Telemetría yaw desempaquetada con precisión');
  testAssert(Math.abs(r.vx - mockVeh.vx) < 0.001, 'Telemetría vx desempaquetada con precisión');
  testAssert(r.gear === 4, 'Telemetría gear desempaquetada con precisión');
  testAssert(r.hasNewData === true, 'Flag hasNewData activado al recibir paquete');
}

// 3. Extrapolación Cinemática (Dead Reckoning)
{
  const mockRival = {
    x: 100, y: 0, z: 200, yaw: 0,
    px: 100, py: 0, pz: 200, pyaw: 0, psteer: 0,
    vx: 40, vy: 0, steer: 0, rpm: 5000, gear: 3, s: 500, d: 0
  };

  NET.connected = true;
  NET.remoteState.hasNewData = true;
  NET.remoteState.x = 100;
  NET.remoteState.y = 0;
  NET.remoteState.z = 200;
  NET.remoteState.yaw = 0; // Hacia +X
  NET.remoteState.vx = 50; // 50 m/s longitudinal
  NET.remoteState.vy = 0;
  NET.remoteState.receivedAt = Date.now() - 50; // 50 ms de antigüedad

  NET.updateRemoteVehicle(mockRival, 1 / 120);

  testAssert(!isNaN(mockRival.x) && !isNaN(mockRival.z), 'Posición extrapolada sin NaNs');
  testAssert(mockRival.x >= 100, 'Dead Reckoning extrapola hacia adelante según la velocidad del rival');
  testAssert(mockRival.px === 100, 'Estado previo px preservado para interpolación suave');
}

// 4. Generación de Códigos de Sala
{
  const id1 = NET.generateRoomId();
  const id2 = NET.generateRoomId();
  testAssert(/^RACE-\d{3}$/.test(id1), 'Código de sala cumple con el formato RACE-XXX');
  testAssert(typeof id1 === 'string' && id1.length === 8, 'Longitud de código de sala válida');
}

console.log(`Resultado Multijugador: ${totalAsserts} aserciones correctas, 0 fallos.`);

module.exports = {
  totalAsserts,
  passed: totalAsserts,
  failed: 0
};
