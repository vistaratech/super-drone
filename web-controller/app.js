/**
 * =====================================================================
 *  🛸 SUPERDRONE 5G | 2026 NEXT-GEN ENTERPRISE GCS ENGINE
 *  Clean Anti-Aliased HUD Canvas + Modern Audio Feedback + Gamepad API
 * =====================================================================
 */

// 1. SYSTEM STATE & TELEMETRY
const state = {
  isArmed: false,
  audioEnabled: true,
  
  // Channels (Standard 1000us - 2000us PWM)
  throttle: 1000,
  yaw: 1500,
  pitch: 1500,
  roll: 1500,
  
  // Flight Telemetry
  heading: 352,
  pitchDeg: 0,
  rollDeg: 0,
  altitude: 14.2,
  speedKmh: 0,
  batteryPct: 98,
  pingMs: 24,
  
  // Mission Timer
  missionSeconds: 0,
  timerInterval: null
};

// 2. SOCKET.IO CONNECTION
const socket = io();
let pingStart = Date.now();

socket.emit('register', 'pilot');

socket.on('connect', () => {
  console.log('[+] Connected to 5G Edge Server');
  updateLinkStatus(true);
  
  // Measure Ping RTT
  setInterval(() => {
    pingStart = Date.now();
    socket.volatile.emit('ping_check');
  }, 1000);
});

socket.on('disconnect', () => {
  console.warn('[-] Disconnected from 5G Server');
  updateLinkStatus(false);
});

socket.on('pong_check', () => {
  const rtt = Date.now() - pingStart;
  state.pingMs = rtt;
  updatePingDisplay(rtt);
});

socket.on('drone_status', (data) => {
  updateLinkStatus(data.online);
});

socket.on('telemetry', (data) => {
  if (data.battery !== undefined) {
    state.batteryPct = data.battery;
    document.getElementById('val-batt').textContent = `${state.batteryPct}%`;
    document.getElementById('batt-fill').style.width = `${state.batteryPct}%`;
  }
  if (data.pitch !== undefined) state.pitchDeg = data.pitch;
  if (data.roll !== undefined) state.rollDeg = data.roll;
  if (data.heading !== undefined) state.heading = data.heading;
  if (data.alt !== undefined) state.altitude = data.alt;
  if (data.speed !== undefined) state.speedKmh = data.speed;
});

function updateLinkStatus(online) {
  const valLink = document.getElementById('val-link');
  const dot = document.getElementById('link-dot');
  
  if (online) {
    valLink.textContent = '5G Active';
    valLink.style.color = '#fff';
    dot.className = 'status-dot online';
  } else {
    valLink.textContent = 'Standby';
    valLink.style.color = 'var(--text-tertiary)';
    dot.className = 'status-dot';
  }
}

function updatePingDisplay(ms) {
  const valPing = document.getElementById('val-ping');
  valPing.textContent = `${ms} ms`;
  
  if (ms < 40) {
    valPing.style.color = 'var(--accent-emerald)';
  } else if (ms < 90) {
    valPing.style.color = 'var(--accent-amber)';
  } else {
    valPing.style.color = 'var(--accent-rose)';
  }
}

// 3. REFINED 2026 SOUND ENGINE (Web Audio API)
class ModernAudioEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq = 600, duration = 0.06, vol = 0.08) {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;
    
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playClick() {
    this.playTone(800, 0.04, 0.06);
  }

  playArmToggle(isArming) {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    
    if (isArming) {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.18);
    } else {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.18);
    }
    
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(now + 0.2);
  }
}

const audio = new ModernAudioEngine();

// 4. ARM / DISARM LOGIC
const btnArmToggle = document.getElementById('btn-arm-toggle');
const armText = document.getElementById('arm-text');
const btnEmergency = document.getElementById('btn-emergency');

btnArmToggle.addEventListener('click', () => {
  state.isArmed = !state.isArmed;
  audio.playArmToggle(state.isArmed);
  
  if (state.isArmed) {
    btnArmToggle.className = 'arm-btn armed';
    armText.textContent = 'Armed';
    startMissionTimer();
  } else {
    btnArmToggle.className = 'arm-btn disarmed';
    armText.textContent = 'Standby';
    stopMissionTimer();
    state.throttle = 1000;
    document.getElementById('throttle-slider').value = 1000;
  }
  updateControlsDisplay();
});

btnEmergency.addEventListener('click', () => {
  audio.playTone(400, 0.2, 0.2);
  state.isArmed = false;
  btnArmToggle.className = 'arm-btn disarmed';
  armText.textContent = 'Standby';
  stopMissionTimer();
  
  state.throttle = 1000;
  state.yaw = 1500;
  state.pitch = 1500;
  state.roll = 1500;
  document.getElementById('throttle-slider').value = 1000;
  
  socket.emit('emergency_rtl');
  alert('Emergency Return-To-Home initiated.');
  updateControlsDisplay();
});

function startMissionTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.missionSeconds = 0;
  state.timerInterval = setInterval(() => {
    state.missionSeconds++;
    const m = String(Math.floor(state.missionSeconds / 60)).padStart(2, '0');
    const s = String(state.missionSeconds % 60).padStart(2, '0');
    document.getElementById('val-met').textContent = `00:${m}:${s}`;
  }, 1000);
}

function stopMissionTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
}

// 5. UTILITY TOOLS
document.getElementById('btn-audio-toggle').addEventListener('click', (e) => {
  state.audioEnabled = !state.audioEnabled;
  e.currentTarget.classList.toggle('active', state.audioEnabled);
  audio.playClick();
});

document.getElementById('btn-fullscreen-toggle').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
  audio.playClick();
});

document.getElementById('btn-snapshot').addEventListener('click', () => {
  audio.playClick();
  const video = document.getElementById('drone-video');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  const link = document.createElement('a');
  link.download = `SuperDrone_FPV_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// 6. TACTILE MINIMALIST JOYSTICK ENGINE
function setupMinimalJoystick(zoneId, knobId, onMove, onRelease) {
  const zone = document.getElementById(zoneId);
  const knob = document.getElementById(knobId);
  let active = false;
  const maxRadius = 40;

  function handleStart(e) {
    active = true;
    handleMove(e);
  }

  function handleMove(e) {
    if (!active) return;
    const rect = zone.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);

    const dist = Math.min(maxRadius, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);

    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;

    knob.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;

    const normX = px / maxRadius;
    const normY = py / maxRadius;
    onMove(normX, normY);
  }

  function handleEnd() {
    if (!active) return;
    active = false;
    onRelease();
  }

  zone.addEventListener('mousedown', handleStart);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleEnd);

  zone.addEventListener('touchstart', handleStart, { passive: false });
  window.addEventListener('touchmove', handleMove, { passive: false });
  window.addEventListener('touchend', handleEnd);
}

// Left Stick: Throttle (Y) + Yaw (X)
setupMinimalJoystick('stick-left', 'knob-left', (normX, normY) => {
  const thr = Math.round(1500 - normY * 500);
  state.throttle = Math.max(1000, Math.min(2000, thr));
  state.yaw = Math.round(1500 + normX * 500);
  document.getElementById('throttle-slider').value = state.throttle;
  updateControlsDisplay();
}, () => {
  state.yaw = 1500;
  const knob = document.getElementById('knob-left');
  const yOffset = -((state.throttle - 1500) / 500) * 40;
  knob.style.transform = `translate(-50%, calc(-50% + ${yOffset}px))`;
  updateControlsDisplay();
});

// Throttle Slider
const throttleSlider = document.getElementById('throttle-slider');
throttleSlider.addEventListener('input', (e) => {
  state.throttle = parseInt(e.target.value);
  const knob = document.getElementById('knob-left');
  const yOffset = -((state.throttle - 1500) / 500) * 40;
  knob.style.transform = `translate(-50%, calc(-50% + ${yOffset}px))`;
  updateControlsDisplay();
});

// Right Stick: Pitch (Y) + Roll (X)
setupMinimalJoystick('stick-right', 'knob-right', (normX, normY) => {
  state.pitch = Math.round(1500 - normY * 500);
  state.roll = Math.round(1500 + normX * 500);
  updateControlsDisplay();
}, () => {
  state.pitch = 1500;
  state.roll = 1500;
  const knob = document.getElementById('knob-right');
  knob.style.transform = 'translate(-50%, -50%)';
  updateControlsDisplay();
});

// Flight Mode Segmented Buttons
document.querySelectorAll('.segment-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    audio.playClick();
  });
});

// 7. KEYBOARD CONTROLS
const keys = {};
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === ' ') btnEmergency.click();
  handleKeyboard();
});

window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
  handleKeyboard();
});

function handleKeyboard() {
  if (keys['w']) state.throttle = Math.min(2000, state.throttle + 20);
  if (keys['s']) state.throttle = Math.max(1000, state.throttle - 20);
  document.getElementById('throttle-slider').value = state.throttle;
  
  if (keys['a']) state.yaw = 1350;
  else if (keys['d']) state.yaw = 1650;
  else state.yaw = 1500;

  if (keys['arrowup']) state.pitch = 1650;
  else if (keys['arrowdown']) state.pitch = 1350;
  else state.pitch = 1500;

  if (keys['arrowleft']) state.roll = 1350;
  else if (keys['arrowright']) state.roll = 1650;
  else state.roll = 1500;

  updateControlsDisplay();
}

// 8. GAMEPAD API
window.addEventListener('gamepadconnected', (e) => {
  const pill = document.getElementById('gamepad-status-pill');
  pill.classList.add('active');
  document.getElementById('gamepad-status-text').textContent = e.gamepad.id.slice(0, 20);
  audio.playTone(800, 0.1, 0.1);
});

window.addEventListener('gamepaddisconnected', () => {
  const pill = document.getElementById('gamepad-status-pill');
  pill.classList.remove('active');
  document.getElementById('gamepad-status-text').textContent = 'Touch & Keyboard Mode';
});

function pollGamepad() {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  if (gamepads && gamepads[0]) {
    const gp = gamepads[0];
    const leftX = gp.axes[0] || 0;
    const leftY = gp.axes[1] || 0;
    const rightX = gp.axes[2] || 0;
    const rightY = gp.axes[3] || 0;

    if (Math.abs(leftX) > 0.08) state.yaw = Math.round(1500 + leftX * 500);
    if (Math.abs(leftY) > 0.08) state.throttle = Math.round(1500 - leftY * 500);
    if (Math.abs(rightX) > 0.08) state.roll = Math.round(1500 + rightX * 500);
    if (Math.abs(rightY) > 0.08) state.pitch = Math.round(1500 - rightY * 500);

    if (gp.buttons[1] && gp.buttons[1].pressed) {
      btnEmergency.click();
    }
    updateControlsDisplay();
  }
}

// 9. TELEMETRY & CONTROLS UI UPDATE
function updateControlsDisplay() {
  document.getElementById('hud-left-stick-coords').textContent = `T: ${state.throttle} | Y: ${state.yaw}`;
  document.getElementById('hud-right-stick-coords').textContent = `P: ${state.pitch} | R: ${state.roll}`;
  document.getElementById('raw-packet-text').textContent = `T:${state.throttle}, Y:${state.yaw}, P:${state.pitch}, R:${state.roll}, A:${state.isArmed ? 1 : 0}`;
  
  // Motor Output Bars
  if (state.isArmed && state.throttle > 1050) {
    const pOff = (state.pitch - 1500) / 2;
    const rOff = (state.roll - 1500) / 2;
    const yOff = (state.yaw - 1500) / 2;

    const m1 = Math.max(1000, Math.min(2000, state.throttle + pOff + rOff - yOff));
    const m2 = Math.max(1000, Math.min(2000, state.throttle + pOff - rOff + yOff));
    const m3 = Math.max(1000, Math.min(2000, state.throttle - pOff + rOff + yOff));
    const m4 = Math.max(1000, Math.min(2000, state.throttle - pOff - rOff - yOff));

    setMotorBar('thrust-m1', 'val-m1', m1);
    setMotorBar('thrust-m2', 'val-m2', m2);
    setMotorBar('thrust-m3', 'val-m3', m3);
    setMotorBar('thrust-m4', 'val-m4', m4);
  } else {
    setMotorBar('thrust-m1', 'val-m1', 1000);
    setMotorBar('thrust-m2', 'val-m2', 1000);
    setMotorBar('thrust-m3', 'val-m3', 1000);
    setMotorBar('thrust-m4', 'val-m4', 1000);
  }

  // Angles
  state.pitchDeg = ((state.pitch - 1500) / 500) * 30;
  state.rollDeg = ((state.roll - 1500) / 500) * 30;
  document.getElementById('hud-pitch-deg').textContent = `${state.pitchDeg >= 0 ? '+' : ''}${state.pitchDeg.toFixed(1)}°`;
  document.getElementById('hud-roll-deg').textContent = `${state.rollDeg >= 0 ? '+' : ''}${state.rollDeg.toFixed(1)}°`;
  document.getElementById('hud-speed-val').textContent = state.speedKmh.toFixed(1);
  document.getElementById('hud-alt-val').textContent = state.altitude.toFixed(1);
}

function setMotorBar(barId, valId, pwm) {
  const pct = Math.round(((pwm - 1000) / 1000) * 100);
  const bar = document.getElementById(barId);
  const val = document.getElementById(valId);
  if (bar) bar.style.width = `${pct}%`;
  if (val) val.textContent = `${pwm}`;
}

// 10. 50HZ TRANSMISSION LOOP
setInterval(() => {
  if (socket.connected) {
    const packet = `T:${state.throttle},Y:${state.yaw},P:${state.pitch},R:${state.roll},A:${state.isArmed ? 1 : 0}`;
    socket.emit('cmd', packet);
  }
}, 20);

// 11. CLEAN 2026 MINIMALIST CANVAS HUD
const canvas = document.getElementById('hud-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * (window.devicePixelRatio || 1);
  canvas.height = rect.height * (window.devicePixelRatio || 1);
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawModernHUD() {
  pollGamepad();

  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  const cx = w / 2;
  const cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // Center Minimal Reticle (Soft anti-aliased ring with center dot)
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, 18, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle Center Pip
  ctx.fillStyle = '#3b82f6';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Artificial Horizon Line
  ctx.translate(cx, cy);
  const rollRad = (state.rollDeg * Math.PI) / 180;
  const pitchOffset = state.pitchDeg * 3.5;

  ctx.rotate(rollRad);
  ctx.translate(0, pitchOffset);

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.7)';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(-110, 0);
  ctx.lineTo(-30, 0);
  ctx.moveTo(30, 0);
  ctx.lineTo(110, 0);
  ctx.stroke();

  // Pitch Degree Ticks (+10, -10)
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  [-10, 10].forEach(deg => {
    const y = -deg * 3.5;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.moveTo(-25, y);
    ctx.lineTo(25, y);
    ctx.stroke();
    ctx.fillText(`${Math.abs(deg)}°`, 32, y + 3);
  });

  ctx.restore();

  requestAnimationFrame(drawModernHUD);
}

requestAnimationFrame(drawModernHUD);

// 12. WEBRTC STREAM RECEIVER
let peerConnection;
const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const remoteVideo = document.getElementById('drone-video');
const standbyRadar = document.getElementById('standby-radar');

socket.on('webrtc_offer', async (offer) => {
  peerConnection = new RTCPeerConnection(rtcConfig);

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    standbyRadar.style.display = 'none';
    audio.playTone(1000, 0.15, 0.1);
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc_ice', event.candidate);
    }
  };

  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit('webrtc_answer', answer);
});

socket.on('webrtc_ice', (candidate) => {
  if (peerConnection) {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }
});

updateControlsDisplay();
console.log('🛸 SuperDrone 2026 Modern Enterprise GCS Online');
