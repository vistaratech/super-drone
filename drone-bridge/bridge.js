// SUPER-DRONE EDGE BRIDGE (Runs on Samsung Galaxy S21 FE)
const socket = io();

// BLE UUIDs (Must match ESP32 Firmware)
const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

let bleDevice = null;
let commandCharacteristic = null;
let localStream = null;
let peerConnection = null;

const srvStatus = document.getElementById('srv-status');
const bleStatus = document.getElementById('ble-status');
const camStatus = document.getElementById('cam-status');
const logBox = document.getElementById('log-box');
const btnConnectBle = document.getElementById('btn-connect-ble');
const btnStartStream = document.getElementById('btn-start-stream');
const localPreview = document.getElementById('local-preview');

function log(msg) {
  logBox.textContent = `[${new Date().toLocaleTimeString()}] ${msg}\n` + logBox.textContent.slice(0, 1000);
}

// 1. REGISTER WITH 5G CLOUD RELAY
socket.on('connect', () => {
  srvStatus.textContent = 'CONNECTED (5G)';
  srvStatus.className = 'status-badge connected';
  socket.emit('register', 'drone');
  log('Registered as 5G Drone Endpoint');
});

socket.on('disconnect', () => {
  srvStatus.textContent = 'DISCONNECTED';
  srvStatus.className = 'status-badge';
  log('5G Connection Lost!');
});

// 2. RECEIVE 5G COMMANDS & WRITE TO ESP32 BLE
socket.on('cmd', async (cmdData) => {
  if (commandCharacteristic) {
    try {
      const encoder = new TextEncoder();
      // Send compact string to ESP32 without buffering
      await commandCharacteristic.writeValueWithoutResponse(encoder.encode(cmdData));
      log(`5G -> BLE: ${cmdData}`);
    } catch (err) {
      log(`BLE Write Error: ${err.message}`);
    }
  }
});

// 3. CONNECT TO ESP32 SUPER MINI VIA WEB BLUETOOTH
btnConnectBle.addEventListener('click', async () => {
  try {
    log('Scanning for ESP32 Super Mini (SuperDrone-BLE)...');
    bleDevice = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'SuperDrone-BLE' }],
      optionalServices: [SERVICE_UUID]
    });

    bleDevice.addEventListener('gattserverdisconnected', onBleDisconnected);
    const server = await bleDevice.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    commandCharacteristic = await service.getCharacteristic(CHAR_UUID);

    bleStatus.textContent = 'CONNECTED (BLE)';
    bleStatus.className = 'status-badge connected';
    btnConnectBle.textContent = '✅ ESP32 CONNECTED';
    log('ESP32 Super Mini Connected via BLE!');
  } catch (err) {
    log(`BLE Connection Failed: ${err.message}`);
    alert(`Bluetooth Error: ${err.message}`);
  }
});

function onBleDisconnected() {
  bleStatus.textContent = 'DISCONNECTED';
  bleStatus.className = 'status-badge';
  btnConnectBle.textContent = '🔗 1. CONNECT ESP32 (BLE)';
  commandCharacteristic = null;
  log('ESP32 BLE Disconnected! Failsafe trigger imminent.');
}

// 4. CAMERA & WEBRTC LIVE STREAM (Back Camera 1080p)
btnStartStream.addEventListener('click', async () => {
  try {
    log('Requesting Samsung S21 FE 60FPS Back Camera...');
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 60 }
      },
      audio: false
    });
    localPreview.srcObject = localStream;
    camStatus.textContent = 'ACTIVE (1080p)';
    camStatus.className = 'status-badge connected';
    btnStartStream.textContent = '✅ 5G STREAM BROADCASTING';

    initWebRTC();
  } catch (err) {
    log(`Camera Error: ${err.message}`);
    alert(`Camera access failed: ${err.message}`);
  }
});

function initWebRTC() {
  const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
  peerConnection = new RTCPeerConnection(config);

  localStream.getTracks().forEach((track) => peerConnection.addTrack(track, localStream));

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc_ice', event.candidate);
    }
  };

  peerConnection.createOffer().then((offer) => {
    peerConnection.setLocalDescription(offer);
    socket.emit('webrtc_offer', offer);
    log('Sent WebRTC Offer to Pilot Cockpit');
  });
}

socket.on('webrtc_answer', (answer) => {
  if (peerConnection) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    log('WebRTC Live Stream Connected to Pilot!');
  }
});

socket.on('webrtc_ice', (candidate) => {
  if (peerConnection) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

// 5. PHONE TELEMETRY (Battery & GPS to Pilot)
if ('getBattery' in navigator) {
  navigator.getBattery().then((battery) => {
    setInterval(() => {
      socket.emit('telemetry', {
        battery: Math.round(battery.level * 100)
      });
    }, 1000);
  });
}
