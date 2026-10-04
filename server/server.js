const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const os = require('os');

const app = express();
app.use(cors());

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// Serve Web Controller, Drone Bridge, and Hardware static files
app.use('/controller', express.static(path.join(__dirname, '../web-controller')));
app.use('/bridge', express.static(path.join(__dirname, '../drone-bridge')));
app.use('/hardware', express.static(path.join(__dirname, '../hardware')));

// Redirect root to controller
app.get('/', (req, res) => {
  res.redirect('/controller');
});

// Server status API endpoint
app.get('/api/status', (req, res) => {
  res.json({
    droneOnline: droneSocket !== null,
    droneInfo,
    serverIp: getLocalIp(),
    port: PORT
  });
});

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
let droneInfo = {
  online: false,
  isMobile: false,
  deviceModel: 'Not Connected',
  bleConnected: false,
  streamActive: false
};

io.on('connection', (socket) => {
  console.log(`[+] New Connection: ${socket.id}`);

  // Handshake registration
  socket.on('register', (payload) => {
    const role = typeof payload === 'string' ? payload : (payload && payload.role);
    if (role === 'drone') {
      droneSocket = socket;
      const isMobile = typeof payload === 'object' ? !!payload.isMobile : false;
      const deviceModel = (typeof payload === 'object' && payload.deviceModel) || (isMobile ? 'Samsung Galaxy S21 FE' : 'Desktop Browser');
      droneInfo = {
        online: true,
        isMobile,
        deviceModel,
        bleConnected: (payload && payload.bleConnected) || false,
        streamActive: (payload && payload.streamActive) || false
      };
      console.log(`[🛸 DRONE REGISTERED] Socket ID: ${socket.id} | Device: ${deviceModel} (isMobile: ${isMobile})`);
      if (pilotSocket) {
        pilotSocket.emit('drone_status', { online: true, droneInfo, serverIp: getLocalIp(), port: PORT });
      }
    } else if (role === 'pilot') {
      pilotSocket = socket;
      console.log(`[🕹️ PILOT REGISTERED] Socket ID: ${socket.id}`);
      socket.emit('drone_status', { online: droneSocket !== null, droneInfo, serverIp: getLocalIp(), port: PORT });
    }
  });

  // Hardware status updates from phone gateway
  socket.on('drone_hardware_status', (data) => {
    if (socket === droneSocket) {
      droneInfo = { ...droneInfo, ...data };
      if (pilotSocket) {
        pilotSocket.emit('drone_status', { online: true, droneInfo, serverIp: getLocalIp(), port: PORT });
      }
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
      droneInfo = { online: false, isMobile: false, deviceModel: 'Not Connected', bleConnected: false, streamActive: false };
      if (pilotSocket) pilotSocket.emit('drone_status', { online: false, droneInfo, serverIp: getLocalIp(), port: PORT });
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
