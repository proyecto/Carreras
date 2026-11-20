'use strict';
/**
 * ============================================================================
 * SERVIDOR LOCAL DE SEÑALIZACIÓN WEBRTC Y ARCHIVOS ESTÁTICOS (server.js)
 * ============================================================================
 * - Servidor HTTP nativo de Node.js sin dependencias externas (cero npm).
 * - Sirve index.html, assets, scripts y shaders con cabeceras MIME correctas.
 * - Endpoint WebSocket nativo (/ws) para emparejamiento y señalización WebRTC P2P
 *   entre dos jugadores en tiempo real con latencia inferior a 5 ms.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 8000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
  '.ico': 'image/x-icon'
};

// Salas de emparejamiento WebRTC en memoria: room -> Set<Socket>
const rooms = new Map();

// --- Servidor HTTP ---
const server = http.createServer((req, res) => {
  // CORS y cabeceras de aislamiento para WebGPU
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 No Encontrado: ' + reqPath);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// --- Servidor WebSocket Nativo (RFC 6455) para Señalización WebRTC ---
function sendWsFrame(socket, text) {
  if (socket.destroyed || !socket.writable) return;
  const payload = Buffer.from(text, 'utf8');
  const len = payload.length;
  let header;

  if (len < 126) {
    header = Buffer.from([0x81, len]);
  } else if (len <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }

  socket.write(Buffer.concat([header, payload]));
}

server.on('upgrade', (req, socket, head) => {
  if (req.url.split('?')[0] !== '/ws') {
    socket.destroy();
    return;
  }

  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }

  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');

  const responseHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '\r\n'
  ];

  socket.write(responseHeaders.join('\r\n'));

  let currentRoom = null;
  let buffer = Buffer.alloc(0);

  socket.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const b0 = buffer[0];
      const b1 = buffer[1];
      const opcode = b0 & 0x0f;
      const isMasked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let offset = 2;

      if (len === 126) {
        if (buffer.length < 4) break;
        len = buffer.readUInt16BE(2);
        offset = 4;
      } else if (len === 127) {
        if (buffer.length < 10) break;
        len = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }

      const maskLength = isMasked ? 4 : 0;
      if (buffer.length < offset + maskLength + len) break; // Frame incompleto

      let payload = buffer.slice(offset + maskLength, offset + maskLength + len);
      if (isMasked) {
        const mask = buffer.slice(offset, offset + 4);
        for (let i = 0; i < payload.length; i++) {
          payload[i] ^= mask[i % 4];
        }
      }

      buffer = buffer.slice(offset + maskLength + len);

      if (opcode === 0x08) {
        // Close frame
        socket.end();
        return;
      } else if (opcode === 0x09) {
        // Ping frame -> enviar Pong
        socket.write(Buffer.from([0x8a, 0]));
      } else if (opcode === 0x01) {
        // Mensaje de texto (JSON de señalización)
        try {
          const msg = JSON.parse(payload.toString('utf8'));
          handleSignalMessage(socket, msg);
        } catch (e) {
          console.warn('[Signaling] Error procesando JSON:', e.message);
        }
      }
    }
  });

  function handleSignalMessage(client, msg) {
    if (msg.type === 'join') {
      const room = String(msg.room || 'default');
      currentRoom = room;
      if (!rooms.has(room)) rooms.set(room, new Set());
      const peers = rooms.get(room);

      peers.add(client);
      const isInitiator = peers.size === 1;

      sendWsFrame(client, JSON.stringify({
        type: 'joined',
        room,
        isInitiator,
        count: peers.size
      }));

      // Si se acaba de unir el segundo jugador, notificar que la sala está lista para conectar
      if (peers.size === 2) {
        for (const peer of peers) {
          sendWsFrame(peer, JSON.stringify({
            type: 'ready',
            room
          }));
        }
      }
    } else if (msg.type === 'signal') {
      // Reenvía SDP Offer / Answer o ICE Candidate al otro peer en la sala
      if (!currentRoom || !rooms.has(currentRoom)) return;
      const peers = rooms.get(currentRoom);
      for (const peer of peers) {
        if (peer !== client) {
          sendWsFrame(peer, JSON.stringify({
            type: 'signal',
            data: msg.data
          }));
        }
      }
    }
  }

  function cleanup() {
    if (currentRoom && rooms.has(currentRoom)) {
      const peers = rooms.get(currentRoom);
      peers.delete(socket);
      for (const peer of peers) {
        sendWsFrame(peer, JSON.stringify({ type: 'peer_left', room: currentRoom }));
      }
      if (peers.size === 0) rooms.delete(currentRoom);
    }
  }

  socket.on('close', cleanup);
  socket.on('error', cleanup);
});

server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`  🏎️  CARRERAS WebGPU - Servidor Local + Señalización P2P`);
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Señalización WebSocket activa en ws://localhost:${PORT}/ws`);
  console.log(`================================================================`);
});
