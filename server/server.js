const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// Serve both Web Controller and Drone Bridge static files
app.use('/controller', express.static(path.join(__dirname, '../web-controller')));
app.use('/bridge', express.static(path.join(__dirname, '../drone-bridge')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 1000,
  pingTimeout: 3000
});

let droneSocket = null;
let pilotSocket = null;
let lastHeartbeat = Date.now();

io.on('connection', (socket) => {
  console.log(`[+] New Connection: ${socket.id}`);

  // Handshake registration
  socket.on('register', (role) => {
    if (role === 'drone') {
      droneSocket = socket;
      console.log(`[🛸 DRONE REGISTERED] Socket ID: ${socket.id}`);
      if (pilotSocket) pilotSocket.emit('drone_status', { online: true });
    } else if (role === 'pilot') {
      pilotSocket = socket;
      console.log(`[🕹️ PILOT REGISTERED] Socket ID: ${socket.id}`);
      socket.emit('drone_status', { online: droneSocket !== null });
    }
  });

  // Low-latency RTT Ping Check
  socket.on('ping_check', () => {
    socket.emit('pong_check');
  });

  // Relay high-speed control packets from Pilot to Drone (Sub-15ms)
  // Format: "T:1500,Y:1500,P:1500,R:1500,A:0"
  socket.on('cmd', (data) => {
    if (droneSocket && socket === pilotSocket) {
      droneSocket.emit('cmd', data);
    }
  });

  // Relay telemetry back from Drone to Pilot
  socket.on('telemetry', (data) => {
    if (pilotSocket && socket === droneSocket) {
      pilotSocket.emit('telemetry', data);
    }
  });

  // WebRTC Signaling for Live Video Stream
  socket.on('webrtc_offer', (data) => {
    if (pilotSocket) pilotSocket.emit('webrtc_offer', data);
  });

  socket.on('webrtc_answer', (data) => {
    if (droneSocket) droneSocket.emit('webrtc_answer', data);
  });

  socket.on('webrtc_ice', (data) => {
    socket.broadcast.emit('webrtc_ice', data);
  });

  // Emergency Return-To-Home or Disarm trigger
  socket.on('emergency_rtl', () => {
    console.warn('⚠️ [EMERGENCY RTL TRIGGERED]');
    if (droneSocket) droneSocket.emit('cmd', 'RTL');
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    if (socket === droneSocket) {
      console.warn('❌ [DRONE DISCONNECTED] Triggering failsafe alert to pilot');
      droneSocket = null;
      if (pilotSocket) pilotSocket.emit('drone_status', { online: false });
    } else if (socket === pilotSocket) {
      console.log('[-] Pilot disconnected');
      pilotSocket = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SUPER-DRONE 5G RELAY SERVER ONLINE ON PORT ${PORT}`);
  console.log(`👉 Web Controller (GCS): http://localhost:${PORT}/controller`);
  console.log(`👉 Drone Phone Bridge : http://localhost:${PORT}/bridge`);
  console.log(`======================================================\n`);
});
