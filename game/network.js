"use strict";
/**
 * ============================================================================
 * MOTOR MULTIJUGADOR P2P WEBRTC (game/network.js)
 * ============================================================================
 * Implementa juego en red de baja latencia (15-35 ms) entre dos jugadores:
 * - WebRTC DataChannel no ordenado y sin retransmisiones (UDP) para telemetría a 60 Hz.
 * - WebRTC DataChannel confiable para sincronización de partida, reinicio y eventos.
 * - Protocolo binario compacto (Float32Array de 48 bytes) con CERO asignaciones de memoria.
 * - Extrapolación suave de movimiento (Dead Reckoning) sobre el bólido rival.
 * - Señalización automática mediante WebSocket local (/ws) y soporte para código manual.
 */

const RootNetwork =
  typeof window !== "undefined"
    ? window
    : typeof globalThis !== "undefined"
      ? globalThis
      : this;
const NET_CFG =
  (typeof window !== "undefined" && window.__CFG_GAME_NETWORK) ||
  (typeof require === "function"
    ? (() => {
        try {
          return require("../config/game/network.json");
        } catch {
          return {};
        }
      })()
    : {});
const _netC = NET_CFG.network || {};

const NET = {
  active: false,
  isHost: false,
  isGuest: false,
  connected: false,
  connecting: false,
  roomId: "",
  ping: 0,
  lastPingSent: 0,
  remotePlayerName: _netC.defaultRemotePlayerName
    ? _netC.defaultRemotePlayerName.value
    : "Rival P2P",
  remoteCarId: null,

  // Canales WebRTC
  pc: null,
  dcData: null, // No confiable, sin orden (UDP rápido a 60 Hz)
  dcEvent: null, // Confiable (eventos, inicio de carrera, chat)
  wsSignaler: null, // WebSocket de señalización

  // Búferes preasignados para cero asignaciones en el bucle de 60 Hz
  _sendBuffer: new Float32Array(12),
  _recvBuffer: new Float32Array(12),

  // Estado remoto recibido
  remoteState: {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    vx: 0,
    vy: 0,
    steer: 0,
    rpm: 1000,
    gear: 1,
    s: 0,
    d: 0,
    timestamp: 0,
    receivedAt: 0,
    hasNewData: false,
  },

  // Configuración STUN pública gratuita de Google y Cloudflare
  rtcConfig: {
    iceServers: _netC.iceServers
      ? _netC.iceServers.value
      : [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
          { urls: "stun:stun.cloudflare.com:3478" },
        ],
  },

  // Callbacks para UI
  onStatusChange: null,
  onRemoteCarSelected: null,
  onRaceRestart: null,

  /**
   * Inicializa el módulo comprobando si hay una sala en la URL (?room=...)
   */
  init() {
    if (typeof window === "undefined") return;
    try {
      const p = new URLSearchParams(window.location.search);
      const room = p.get("room");
      if (room) {
        console.log(`[NET] Detectada sala en URL: ${room}. Conectando...`);
        this.joinRoom(room);
      }
    } catch (e) {
      console.warn("[NET] Error al leer parámetros de URL:", e);
    }
  },

  /**
   * Genera un identificador de sala corto y legible (ej. "RACE-742")
   */
  generateRoomId() {
    const code = Math.floor(100 + Math.random() * 900);
    return `RACE-${code}`;
  },

  /**
   * Crea una sala como Anfitrión (Host)
   */
  createRoom(roomId = null) {
    this.reset();
    this.roomId = roomId || this.generateRoomId();
    this.isHost = true;
    this.isGuest = false;
    this.connecting = true;
    this._notifyStatus("connecting", `Creando sala ${this.roomId}...`);

    this._connectSignaling(this.roomId, true);
  },

  /**
   * Se une a una sala existente como Invitado (Guest)
   */
  joinRoom(roomId) {
    if (!roomId) return;
    this.reset();
    this.roomId = roomId.trim().toUpperCase();
    this.isHost = false;
    this.isGuest = true;
    this.connecting = true;
    this._notifyStatus("connecting", `Uniéndose a sala ${this.roomId}...`);

    this._connectSignaling(this.roomId, false);
  },

  /**
   * Conecta al endpoint de señalización WebSocket nativo de server.js
   */
  _connectSignaling(roomId, isHost) {
    if (typeof WebSocket === "undefined") {
      this._notifyStatus("error", "WebSocket no disponible en este navegador");
      return;
    }

    try {
      const loc = window.location;
      const wsProtocol = loc.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${loc.host}/ws`;

      const ws = new WebSocket(wsUrl);
      this.wsSignaler = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "join", room: roomId }));
      };

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          await this._handleSignalingMessage(msg);
        } catch (err) {
          console.error("[NET] Error en mensaje de señalización:", err);
        }
      };

      ws.onerror = (e) => {
        console.warn(
          "[NET] No se pudo conectar al WebSocket local /ws. Usando modo manual P2P.",
        );
        this._notifyStatus(
          "manual_ready",
          "Señalización automática no disponible. Puedes usar conexión manual.",
        );
      };

      ws.onclose = () => {
        if (!this.connected && this.connecting) {
          this._notifyStatus(
            "disconnected",
            "Desconectado del servidor de señalización",
          );
        }
      };
    } catch (e) {
      console.warn("[NET] Error al instanciar WebSocket:", e);
    }
  },

  /**
   * Procesa mensajes de señalización (joined, ready, signal)
   */
  async _handleSignalingMessage(msg) {
    if (msg.type === "joined") {
      if (msg.isInitiator) {
        this.isHost = true;
        this._notifyStatus(
          "waiting",
          `Sala ${this.roomId} creada. Esperando al rival...`,
        );
      } else {
        this.isGuest = true;
        this._notifyStatus(
          "waiting",
          `Conectado a ${this.roomId}. Esperando rival...`,
        );
      }
    } else if (msg.type === "ready") {
      // Dos jugadores en la sala: el Host inicia la oferta WebRTC
      if (this.isHost) {
        await this._startWebRTCOffer();
      }
    } else if (msg.type === "signal") {
      await this._handleSignalData(msg.data);
    } else if (msg.type === "peer_left") {
      this._notifyStatus("disconnected", "El rival ha abandonado la sala");
      this.connected = false;
    }
  },

  /**
   * Crea la conexión RTCPeerConnection y canales de datos
   */
  _setupPeerConnection() {
    if (typeof RTCPeerConnection === "undefined") return null;

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.pc = pc;

    pc.onicecandidate = (event) => {
      if (
        event.candidate &&
        this.wsSignaler &&
        this.wsSignaler.readyState === WebSocket.OPEN
      ) {
        this.wsSignaler.send(
          JSON.stringify({
            type: "signal",
            data: { candidate: event.candidate },
          }),
        );
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        console.log("[NET] WebRTC P2P Conectado con éxito!");
        this.connected = true;
        this.connecting = false;
        this._notifyStatus("connected", `¡Conectado P2P con rival!`);
        this._startPingInterval();
        this._sendHandshake();
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        this.connected = false;
        this._notifyStatus("disconnected", "Conexión con rival perdida");
      }
    };

    return pc;
  },

  /**
   * El Host genera la oferta WebRTC y crea los canales
   */
  async _startWebRTCOffer() {
    const pc = this._setupPeerConnection();
    if (!pc) return;

    // 1. Canal UDP no ordenado para telemetría a 60 Hz
    this.dcData = pc.createDataChannel("telemetry", {
      ordered: false,
      maxRetransmits: 0,
    });
    this._bindDataChannel(this.dcData, true);

    // 2. Canal confiable para eventos y handshake
    this.dcEvent = pc.createDataChannel("events", { ordered: true });
    this._bindEventChannel(this.dcEvent);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    if (this.wsSignaler && this.wsSignaler.readyState === WebSocket.OPEN) {
      this.wsSignaler.send(
        JSON.stringify({
          type: "signal",
          data: { sdp: pc.localDescription },
        }),
      );
    }
  },

  /**
   * El Invitado recibe la oferta y crea la respuesta (Answer)
   */
  async _handleSignalData(data) {
    if (!this.pc) {
      this.pc = this._setupPeerConnection();
      this.pc.ondatachannel = (event) => {
        const channel = event.channel;
        if (channel.label === "telemetry") {
          this.dcData = channel;
          this._bindDataChannel(channel, true);
        } else if (channel.label === "events") {
          this.dcEvent = channel;
          this._bindEventChannel(channel);
        }
      };
    }

    if (data.sdp) {
      await this.pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (data.sdp.type === "offer") {
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        if (this.wsSignaler && this.wsSignaler.readyState === WebSocket.OPEN) {
          this.wsSignaler.send(
            JSON.stringify({
              type: "signal",
              data: { sdp: this.pc.localDescription },
            }),
          );
        }
      }
    } else if (data.candidate) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) {
        console.warn("[NET] Error añadiendo candidato ICE:", e);
      }
    }
  },

  /**
   * Configura el canal de telemetría binaria a 60 Hz
   */
  _bindDataChannel(dc, isBinary = true) {
    if (!dc) return;
    if (isBinary) dc.binaryType = "arraybuffer";

    dc.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        this._unpackTelemetry(event.data);
      }
    };
  },

  /**
   * Configura el canal confiable de eventos
   */
  _bindEventChannel(dc) {
    if (!dc) return;
    dc.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this._handleRemoteEvent(msg);
      } catch (e) {
        console.warn("[NET] Error parseando evento confiable:", e);
      }
    };
  },

  /**
   * Desempaqueta el buffer binario Float32Array recibido a 60 Hz
   */
  _unpackTelemetry(buffer) {
    if (buffer.byteLength < 48) return;
    const view = new Float32Array(buffer);
    const r = this.remoteState;

    r.x = view[0];
    r.y = view[1];
    r.z = view[2];
    r.yaw = view[3];
    r.vx = view[4];
    r.vy = view[5];
    r.steer = view[6];
    r.rpm = view[7];
    r.gear = view[8];
    r.s = view[9];
    r.d = view[10];
    r.timestamp = view[11];
    r.receivedAt =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    r.hasNewData = true;
  },

  /**
   * Envía el estado local del vehículo a 60 Hz (empaquetado en Float32Array de 48 bytes)
   */
  sendLocalState(veh) {
    if (
      !this.connected ||
      !this.dcData ||
      this.dcData.readyState !== "open" ||
      !veh
    )
      return;

    const buf = this._sendBuffer;
    buf[0] = veh.x;
    buf[1] = veh.y;
    buf[2] = veh.z;
    buf[3] = veh.yaw;
    buf[4] = veh.vx;
    buf[5] = veh.vy;
    buf[6] = veh.steer;
    buf[7] = veh.rpm;
    buf[8] = veh.gear;
    buf[9] = veh.s;
    buf[10] = veh.d;
    buf[11] =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    try {
      this.dcData.send(buf.buffer);
    } catch (e) {
      // Ignorar saturación ocasional en canales UDP
    }
  },

  /**
   * Aplica extrapolación de movimiento (Dead Reckoning) y actualiza VEH_RIVAL
   */
  updateRemoteVehicle(vehRival, dt = 1 / 120) {
    if (!this.connected || !vehRival || !this.remoteState.hasNewData) return;

    const r = this.remoteState;
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const age = Math.max(0, (now - r.receivedAt) / 1000);

    // Guardar estado previo para interpolación gráfica
    vehRival.px = vehRival.x;
    vehRival.pz = vehRival.z;
    vehRival.pyaw = vehRival.yaw;
    vehRival.py = vehRival.y;
    vehRival.psteer = vehRival.steer;

    // Extrapolación cinemática suave según velocidad longitudinal/lateral
    const c = Math.cos(r.yaw);
    const s = Math.sin(r.yaw);
    const fwdX = c * r.vx - s * r.vy;
    const fwdZ = s * r.vx + c * r.vy;

    const extraDistX = fwdX * age;
    const extraDistZ = fwdZ * age;

    // Filtro complementario de posición para evitar saltos
    const smoothK = 0.65;
    const targetX = r.x + extraDistX;
    const targetZ = r.z + extraDistZ;

    vehRival.x += (targetX - vehRival.x) * smoothK;
    vehRival.z += (targetZ - vehRival.z) * smoothK;
    vehRival.y = r.y;
    vehRival.yaw = r.yaw;
    vehRival.vx = r.vx;
    vehRival.vy = r.vy;
    vehRival.steer = r.steer;
    vehRival.rpm = r.rpm;
    vehRival.gear = r.gear;
    vehRival.s = r.s;
    vehRival.d = r.d;
  },

  /**
   * Envía eventos confiables (handshake, ping, restart)
   */
  sendEvent(data) {
    if (!this.connected || !this.dcEvent || this.dcEvent.readyState !== "open")
      return;
    try {
      this.dcEvent.send(JSON.stringify(data));
    } catch (e) {
      console.warn("[NET] Error enviando evento confiable:", e);
    }
  },

  _sendHandshake() {
    const activeCarId =
      typeof CARS !== "undefined" && CARS.active
        ? CARS.active.id
        : "mercedes-amg-gt3-2020";
    const activeTrackId =
      typeof TRACKS !== "undefined" && TRACKS.active
        ? TRACKS.active.id
        : "nurburgring-gp";

    this.sendEvent({
      type: "handshake",
      carId: activeCarId,
      trackId: activeTrackId,
      isHost: this.isHost,
      name: this.isHost ? "Jugador 1 (Host)" : "Jugador 2",
    });
  },

  _handleRemoteEvent(msg) {
    if (msg.type === "handshake") {
      this.remoteCarId = msg.carId;
      this.remotePlayerName = msg.name || "Rival P2P";
      console.log(`[NET] Handshake recibido: Rival conduce ${msg.carId}`);

      if (typeof this.onRemoteCarSelected === "function") {
        this.onRemoteCarSelected(msg.carId, msg.name);
      }
      this._notifyStatus(
        "connected",
        `¡Conectado con ${this.remotePlayerName}!`,
      );
    } else if (msg.type === "ping") {
      this.sendEvent({ type: "pong", sentAt: msg.t });
    } else if (msg.type === "pong") {
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const rtt = Math.max(1, Math.round(now - msg.sentAt));
      this.ping = rtt;
    } else if (msg.type === "restart") {
      if (typeof this.onRaceRestart === "function") {
        this.onRaceRestart();
      }
    }
  },

  _startPingInterval() {
    setInterval(() => {
      if (this.connected) {
        const now =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        this.sendEvent({ type: "ping", t: now });
      }
    }, 1500);
  },

  _notifyStatus(state, message) {
    if (typeof this.onStatusChange === "function") {
      this.onStatusChange(state, message);
    }
  },

  /**
   * Resetea el estado y cierra conexiones existentes
   */
  reset() {
    this.connected = false;
    this.connecting = false;
    this.isHost = false;
    this.isGuest = false;
    this.ping = 0;
    this.remoteState.hasNewData = false;

    if (this.dcData) {
      try {
        this.dcData.close();
      } catch (e) {}
      this.dcData = null;
    }
    if (this.dcEvent) {
      try {
        this.dcEvent.close();
      } catch (e) {}
      this.dcEvent = null;
    }
    if (this.pc) {
      try {
        this.pc.close();
      } catch (e) {}
      this.pc = null;
    }
    if (this.wsSignaler) {
      try {
        this.wsSignaler.close();
      } catch (e) {}
      this.wsSignaler = null;
    }
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = NET;
}

RootNetwork.NET = NET;
