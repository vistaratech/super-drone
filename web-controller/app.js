/**
 * =====================================================================
 *  🛸 SUPERDRONE 5G BVLOS | 2026 NEXT-GEN ENTERPRISE GCS ENGINE
 *  Tactile Cockpit Controls + SVS 3D Simulation + Military Aviation HUD
 * =====================================================================
 */

// 1. SYSTEM STATE & TELEMETRY
// 1. SYSTEM STATE & TELEMETRY
const state = {
  isArmed: false,
  audioEnabled: true,
  droneOnline: false, // Strict truth of whether Samsung S21 FE is connected
  simMode: false,     // Disabled by default so real connection state is always shown
  vehicle: 'quad',    // 'quad' | 'wing'
  serverIp: '172.20.10.3',
  serverPort: 3000,
  
  // Channels (Standard 1000us - 2000us PWM)
  throttle: 1000,
  yaw: 1500,
  pitch: 1500,
  roll: 1500,

  // Trims (-100 to +100)
  trimPitch: 0,
  trimRoll: 0,
  trimYaw: 0,
  
  // Flight Telemetry
  heading: 352,
  pitchDeg: 0,
  rollDeg: 0,
  altitude: 0.0, // meters
  speedKmh: 0,
  climbRate: 0,  // m/s
  gLoad: 1.0,
  batteryPct: 0,
  voltage: 0.0,
  pingMs: 0,
  satellites: 0,
  gpsLat: 13.0827,
  gpsLng: 80.2707,
  distanceToHome: 0,
  homeLat: 13.0820,
  homeLng: 80.2700,
  
  // Flight Mode
  flightMode: 'STABILIZE',
  
  // Mission Timer
  missionSeconds: 0,
  timerInterval: null
};

// 2. SOCKET.IO CONNECTION
const socket = io();
let pingStart = Date.now();

// Register as pilot immediately
socket.emit('register', 'pilot');

socket.on('connect', () => {
  console.log('[+] Connected to 5G Edge Relay Server');
  // Re-register upon connect / reconnect
  socket.emit('register', 'pilot');
  
  // Measure Ping RTT to Relay Server
  setInterval(() => {
    pingStart = Date.now();
    socket.volatile.emit('ping_check');
  }, 1000);
});

socket.on('disconnect', () => {
  console.warn('[-] Disconnected from 5G Server');
  updateDroneConnectionUI(false, state.serverIp, state.serverPort);
});

socket.on('pong_check', () => {
  const rtt = Date.now() - pingStart;
  state.pingMs = rtt;
  updatePingDisplay(rtt);
});

// Ground truth from server: whether Samsung Galaxy S21 FE (drone) is connected
socket.on('drone_status', (data) => {
  console.log('[i] Drone status update from server:', data);
  const info = data.droneInfo || {};
  
  // Real phone connected condition:
  // Must be registered as drone AND (actually be a mobile browser OR have BLE connected OR have video stream active)
  const isRealPhone = !!data.online && (info.isMobile || info.bleConnected || info.streamActive);
  state.droneOnline = isRealPhone;
  if (data.serverIp) state.serverIp = data.serverIp;
  if (data.port) state.serverPort = data.port;
  
  updateDroneConnectionUI(isRealPhone, info, data.serverIp || state.serverIp, data.port || 3000);
});

socket.on('telemetry', (data) => {
  if (data.battery !== undefined) {
    state.batteryPct = data.battery;
    state.voltage = (13.2 + (state.batteryPct / 100) * 3.6).toFixed(1);
    const bVal = document.getElementById('val-batt');
    if (bVal) bVal.textContent = `${state.batteryPct}%`;
    const bFill = document.getElementById('batt-fill');
    if (bFill) bFill.style.width = `${state.batteryPct}%`;
  }
  if (data.pitch !== undefined) state.pitchDeg = data.pitch;
  if (data.roll !== undefined) state.rollDeg = data.roll;
  if (data.heading !== undefined) state.heading = data.heading;
  if (data.alt !== undefined) state.altitude = data.alt;
  if (data.speed !== undefined) state.speedKmh = data.speed;
  if (data.sats !== undefined) {
    state.satellites = data.sats;
    const sEl = document.getElementById('val-sat');
    if (sEl) sEl.innerHTML = `${state.satellites} SATS <span class="fix-tag">3D RTK</span>`;
  }
});

function updateDroneConnectionUI(isRealPhone, info = {}, ip = '172.20.10.3', port = 3000) {
  state.droneOnline = isRealPhone;
  const valLink = document.getElementById('val-link');
  const bars = document.querySelectorAll('.signal-meter .sig-bar');
  const mobilePill = document.getElementById('mobile-status-pill');
  const mobileText = document.getElementById('mobile-status-text');
  const banner = document.getElementById('phone-connect-banner');
  const bannerTitle = document.getElementById('banner-title');
  const bannerHint = document.getElementById('banner-hint');
  const valSat = document.getElementById('val-sat');
  const valBatt = document.getElementById('val-batt');
  const battFill = document.getElementById('batt-fill');
  const serverIpEl = document.getElementById('server-lan-ip');

  if (serverIpEl) serverIpEl.textContent = ip;

  if (isRealPhone) {
    if (valLink) {
      valLink.textContent = '5G Live';
      valLink.className = 'telem-val text-cyan';
    }
    bars.forEach(b => b.classList.add('active'));

    if (mobilePill) {
      mobilePill.className = 'phone-chip connected';
      mobileText.textContent = info.bleConnected ? 'PHONE: BLE + 5G' : 'PHONE: S21 FE (5G)';
    }

    if (banner) {
      banner.className = 'standby-pill connected';
      if (bannerTitle) bannerTitle.textContent = 'Samsung Galaxy S21 FE 5G Connected';
      if (bannerHint) bannerHint.innerHTML = info.streamActive 
        ? `<span>1080p 60FPS Video Active</span>` 
        : `<span>Tap <b>'Start Stream'</b> on phone to stream 1080p Video</span>`;
    }
  } else {
    if (valLink) {
      valLink.textContent = 'Disconnected';
      valLink.className = 'telem-val text-rose';
    }
    bars.forEach(b => b.classList.remove('active'));

    if (mobilePill) {
      mobilePill.className = 'phone-chip disconnected';
      // If someone has an open desktop browser tab on PC, don't falsely claim phone is online!
      if (info.online && !info.isMobile) {
        mobileText.textContent = 'PHONE: OFFLINE (PC Tab)';
      } else {
        mobileText.textContent = 'PHONE: OFFLINE';
      }
    }

    if (banner) {
      banner.className = 'standby-pill disconnected';
      if (bannerTitle) bannerTitle.textContent = 'Samsung Galaxy S21 FE Not Connected';
      if (bannerHint) bannerHint.innerHTML = `Open <b>http://${ip}:${port}/bridge</b> on phone Chrome to link`;
    }

    if (!state.simMode) {
      if (valSat) valSat.innerHTML = `-- SATS <span class="fix-tag no-fix">NO FIX</span>`;
      if (valBatt) valBatt.textContent = `--%`;
      if (battFill) battFill.style.width = '0%';
      const gpsEl = document.getElementById('hud-gps');
      if (gpsEl) gpsEl.textContent = 'Awaiting Phone GPS';
    }
  }
}

function updatePingDisplay(ms) {
  const valPing = document.getElementById('val-ping');
  const pingDot = document.getElementById('ping-dot');

  if (!state.droneOnline && !state.simMode) {
    valPing.textContent = `${ms} ms (Relay)`;
    valPing.style.color = 'var(--text-secondary)';
    pingDot.className = 'ping-pulse-dot ping-idle';
    return;
  }

  valPing.textContent = `${ms} ms`;
  pingDot.className = 'ping-pulse-dot';
  
  if (ms < 40) {
    valPing.style.color = 'var(--accent-emerald)';
    pingDot.style.background = 'var(--accent-emerald)';
  } else if (ms < 90) {
    valPing.style.color = 'var(--accent-amber)';
    pingDot.style.background = 'var(--accent-amber)';
  } else {
    valPing.style.color = 'var(--accent-rose)';
    pingDot.style.background = 'var(--accent-rose)';
  }
}

// 3. AEROSPACE SOUND SYNTHESIS ENGINE (Web Audio API)
class ModernAudioEngine {
  constructor() {
    this.ctx = null;
    this.motorOsc = null;
    this.motorGain = null;
    this.motorFilter = null;
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

  playTone(freq = 600, duration = 0.06, vol = 0.08, type = 'sine') {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;
    
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
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
    this.playTone(850, 0.035, 0.08, 'triangle');
  }

  playArmToggle(isArming) {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      
      if (isArming) {
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);
      } else {
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.22);
      }
      
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  playEmergencySiren() {
    if (!state.audioEnabled) return;
    this.init();
    if (!this.ctx) return;
    
    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.25);
      osc.frequency.linearRampToValueAtTime(440, now + 0.5);
      
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.6);
    } catch (e) {}
  }

  // Brushless Motor Turbine Sound
  updateMotorHum(throttlePwm, isArmed) {
    if (!state.audioEnabled || !isArmed || throttlePwm <= 1040) {
      if (this.motorGain && this.ctx) {
        this.motorGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.05);
      }
      return;
    }

    this.init();
    if (!this.ctx) return;

    if (!this.motorOsc) {
      try {
        this.motorOsc = this.ctx.createOscillator();
        this.motorFilter = this.ctx.createBiquadFilter();
        this.motorGain = this.ctx.createGain();

        this.motorOsc.type = 'triangle';
        this.motorFilter.type = 'lowpass';
        this.motorFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
        this.motorGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

        this.motorOsc.connect(this.motorFilter);
        this.motorFilter.connect(this.motorGain);
        this.motorGain.connect(this.ctx.destination);
        this.motorOsc.start();
      } catch (e) {
        return;
      }
    }

    const tNorm = (throttlePwm - 1000) / 1000; // 0.0 to 1.0
    const targetFreq = 120 + tNorm * 380; // 120Hz to 500Hz
    const targetFilter = 350 + tNorm * 900;
    const targetVol = Math.min(0.08, 0.015 + tNorm * 0.065);

    const now = this.ctx.currentTime;
    this.motorOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.motorFilter.frequency.setTargetAtTime(targetFilter, now, 0.08);
    this.motorGain.gain.setTargetAtTime(targetVol, now, 0.08);
  }
}

const audio = new ModernAudioEngine();

// 4. VEHICLE PROFILE SWITCHING (Quad-X vs Stealth Wing)
const tabQuad = document.getElementById('tab-quad');
const tabWing = document.getElementById('tab-wing');
const quadPropView = document.getElementById('quad-prop-view');
const wingPropView = document.getElementById('wing-prop-view');

tabQuad.addEventListener('click', () => {
  setVehicleProfile('quad');
});

tabWing.addEventListener('click', () => {
  setVehicleProfile('wing');
});

function setVehicleProfile(type) {
  state.vehicle = type;
  audio.playClick();

  if (type === 'quad') {
    tabQuad.classList.add('active');
    tabWing.classList.remove('active');
    quadPropView.style.display = 'block';
    wingPropView.style.display = 'none';
    document.body.className = 'quad-mode';
  } else {
    tabWing.classList.add('active');
    tabQuad.classList.remove('active');
    quadPropView.style.display = 'none';
    wingPropView.style.display = 'block';
    document.body.className = 'wing-mode';
  }
  updateControlsDisplay();
}

// 5. MASTER ARM & EMERGENCY RTL
const btnArmToggle = document.getElementById('btn-arm-toggle');
const armText = document.getElementById('arm-text');
const btnEmergency = document.getElementById('btn-emergency');

btnArmToggle.addEventListener('click', () => {
  // If attempting to arm while phone is offline and simulation is off, prompt user
  if (!state.isArmed && !state.droneOnline && !state.simMode) {
    audio.playTone(300, 0.25, 0.15, 'sawtooth');
    const confirmSim = confirm(
      "⚠️ Mobile Phone (Samsung S21 FE) is DISCONNECTED!\n\n" +
      "To test controls in browser simulator without the phone, click OK to enable SIMULATION MODE.\n\n" +
      "Or open http://" + state.serverIp + ":" + state.serverPort + "/bridge on your phone to link real hardware."
    );
    if (confirmSim) {
      btnSimToggle.click();
    } else {
      return;
    }
  }

  state.isArmed = !state.isArmed;
  audio.playArmToggle(state.isArmed);
  
  if (state.isArmed) {
    btnArmToggle.className = 'arm-btn armed';
    armText.textContent = 'ARMED';
    startMissionTimer();
  } else {
    btnArmToggle.className = 'arm-btn disarmed';
    armText.textContent = 'STANDBY';
    stopMissionTimer();
    state.throttle = 1000;
    document.getElementById('throttle-slider').value = 1000;
    audio.updateMotorHum(1000, false);
  }
  updateControlsDisplay();
});

btnEmergency.addEventListener('click', () => {
  audio.playEmergencySiren();
  state.isArmed = false;
  btnArmToggle.className = 'arm-btn disarmed';
  armText.textContent = 'STANDBY';
  stopMissionTimer();
  
  state.throttle = 1000;
  state.yaw = 1500;
  state.pitch = 1500;
  state.roll = 1500;
  document.getElementById('throttle-slider').value = 1000;
  audio.updateMotorHum(1000, false);
  
  socket.emit('emergency_rtl');
  updateControlsDisplay();
});

function startMissionTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.missionSeconds = 0;
  state.timerInterval = setInterval(() => {
    state.missionSeconds++;
    const h = String(Math.floor(state.missionSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((state.missionSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(state.missionSeconds % 60).padStart(2, '0');
    document.getElementById('val-met').textContent = `${h}:${m}:${s}`;
  }, 1000);
}

function stopMissionTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
}

// 6. SIMULATION MODE TOGGLE
const btnSimToggle = document.getElementById('btn-sim-toggle');
const simStatusText = document.getElementById('sim-status-text');

btnSimToggle.addEventListener('click', () => {
  state.simMode = !state.simMode;
  audio.playClick();
  btnSimToggle.classList.toggle('off', !state.simMode);
  btnSimToggle.classList.toggle('active', state.simMode);
  simStatusText.textContent = state.simMode ? 'SIM ACTIVE' : 'SIM OFF';
  
  if (state.simMode && !state.droneOnline) {
    state.satellites = 19;
    state.batteryPct = 98;
    state.voltage = 16.2;
    state.altitude = 14.2;
    document.getElementById('val-sat').innerHTML = `19 SATS <span class="fix-tag">3D RTK (SIM)</span>`;
    document.getElementById('val-batt').textContent = `98%`;
    document.getElementById('val-volts').textContent = `16.2V`;
    document.getElementById('batt-fill').style.width = `98%`;
    document.getElementById('hud-gps').textContent = `${state.gpsLat.toFixed(4)}° N, ${state.gpsLng.toFixed(4)}° E`;
  } else if (!state.droneOnline) {
    updateDroneConnectionUI(false, state.serverIp, state.serverPort);
  }
  updateControlsDisplay();
});

// 7. UTILITY TOOLS & MODAL
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

// Hardware 3D Modal
const hardwareModal = document.getElementById('hardware-modal');
const btnHardwareModal = document.getElementById('btn-hardware-modal');
const btnModalClose = document.getElementById('btn-modal-close');

btnHardwareModal.addEventListener('click', () => {
  audio.playClick();
  hardwareModal.classList.add('open');
});

btnModalClose.addEventListener('click', () => {
  audio.playClick();
  hardwareModal.classList.remove('open');
});

hardwareModal.addEventListener('click', (e) => {
  if (e.target === hardwareModal) {
    hardwareModal.classList.remove('open');
  }
});

// Snapshot FPV
document.getElementById('btn-snapshot').addEventListener('click', () => {
  audio.playClick();
  const video = document.getElementById('drone-video');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const c = canvas.getContext('2d');
  
  if (video.srcObject) {
    c.drawImage(video, 0, 0, canvas.width, canvas.height);
  } else {
    const svs = document.getElementById('svs-canvas');
    c.drawImage(svs, 0, 0, canvas.width, canvas.height);
  }
  
  const link = document.createElement('a');
  link.download = `SuperDrone_FPV_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

// Reset Trims & Controls
document.getElementById('btn-recenter').addEventListener('click', () => {
  audio.playClick();
  state.trimPitch = 0;
  state.trimRoll = 0;
  state.trimYaw = 0;
  state.pitch = 1500;
  state.roll = 1500;
  state.yaw = 1500;
  document.getElementById('trim-pitch-val').textContent = '0';
  document.getElementById('trim-roll-val').textContent = '0';
  document.getElementById('trim-yaw-val').textContent = '0';
  updateControlsDisplay();
});

// SVS Mode Toggle Button
let svsModeActive = true;
document.getElementById('btn-toggle-svs').addEventListener('click', () => {
  audio.playClick();
  svsModeActive = !svsModeActive;
  document.getElementById('svs-canvas').style.display = svsModeActive ? 'block' : 'none';
  document.getElementById('svs-btn-text').textContent = svsModeActive ? 'SVS 3D ON' : 'SVS 3D OFF';
});

// 8. TACTILE AEROSPACE JOYSTICK ENGINE (Multi-Touch Aware for Mobile & Desktop)
function setupMinimalJoystick(zoneId, knobId, onMove, onRelease) {
  const zone = document.getElementById(zoneId);
  const knob = document.getElementById(knobId);
  let active = false;
  let activeTouchId = null;

  function getMaxRadius() {
    const rect = zone.getBoundingClientRect();
    return Math.max(28, rect.width * 0.32);
  }

  function processCoordinate(clientX, clientY) {
    const rect = zone.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);

    const maxRadius = getMaxRadius();
    const dist = Math.min(maxRadius, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);

    const px = Math.cos(angle) * dist;
    const py = Math.sin(angle) * dist;

    knob.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;

    const normX = px / maxRadius;
    const normY = py / maxRadius;
    onMove(normX, normY);
  }

  // Mouse Handlers
  function handleMouseDown(e) {
    active = true;
    activeTouchId = null;
    processCoordinate(e.clientX, e.clientY);
  }

  function handleMouseMove(e) {
    if (!active || activeTouchId !== null) return;
    processCoordinate(e.clientX, e.clientY);
  }

  function handleMouseUp() {
    if (!active || activeTouchId !== null) return;
    active = false;
    onRelease();
  }

  // Multi-Touch Handlers (Dedicated touch ID per stick so dual thumbs never conflict)
  function handleTouchStart(e) {
    if (e.cancelable) e.preventDefault();
    if (activeTouchId !== null) return; // Already tracking a finger on this stick

    const t = e.changedTouches[0];
    active = true;
    activeTouchId = t.identifier;
    processCoordinate(t.clientX, t.clientY);
  }

  function handleTouchMove(e) {
    if (!active || activeTouchId === null) return;
    if (e.cancelable) e.preventDefault();

    for (let i = 0; i < e.touches.length; i++) {
      if (e.touches[i].identifier === activeTouchId) {
        processCoordinate(e.touches[i].clientX, e.touches[i].clientY);
        break;
      }
    }
  }

  function handleTouchEnd(e) {
    if (!active || activeTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        if (e.cancelable) e.preventDefault();
        active = false;
        activeTouchId = null;
        onRelease();
        break;
      }
    }
  }

  zone.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  zone.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd, { passive: false });
  window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
}

// Left Stick: Throttle (Y) + Yaw (X)
setupMinimalJoystick('stick-left', 'knob-left', (normX, normY) => {
  const thr = Math.round(1500 - normY * 500);
  state.throttle = Math.max(1000, Math.min(2000, thr));
  state.yaw = Math.max(1000, Math.min(2000, Math.round(1500 + normX * 500 + state.trimYaw)));
  document.getElementById('throttle-slider').value = state.throttle;
  updateControlsDisplay();
}, () => {
  state.yaw = 1500 + state.trimYaw;
  const knob = document.getElementById('knob-left');
  const yOffset = -((state.throttle - 1500) / 500) * 38;
  knob.style.transform = `translate(-50%, calc(-50% + ${yOffset}px))`;
  updateControlsDisplay();
});

// Vertical Throttle Slider
const throttleSlider = document.getElementById('throttle-slider');
throttleSlider.addEventListener('input', (e) => {
  state.throttle = parseInt(e.target.value);
  const knob = document.getElementById('knob-left');
  const yOffset = -((state.throttle - 1500) / 500) * 38;
  knob.style.transform = `translate(-50%, calc(-50% + ${yOffset}px))`;
  updateControlsDisplay();
});

// Right Stick: Pitch (Y) + Roll (X)
setupMinimalJoystick('stick-right', 'knob-right', (normX, normY) => {
  state.pitch = Math.max(1000, Math.min(2000, Math.round(1500 - normY * 500 + state.trimPitch)));
  state.roll = Math.max(1000, Math.min(2000, Math.round(1500 + normX * 500 + state.trimRoll)));
  updateControlsDisplay();
}, () => {
  state.pitch = 1500 + state.trimPitch;
  state.roll = 1500 + state.trimRoll;
  const knob = document.getElementById('knob-right');
  knob.style.transform = 'translate(-50%, -50%)';
  updateControlsDisplay();
});

// Sub-Trim Handlers
document.getElementById('trim-yaw-left').addEventListener('click', () => {
  state.trimYaw = Math.max(-100, state.trimYaw - 10);
  document.getElementById('trim-yaw-val').textContent = state.trimYaw;
  state.yaw = 1500 + state.trimYaw;
  updateControlsDisplay();
});

document.getElementById('trim-yaw-right').addEventListener('click', () => {
  state.trimYaw = Math.min(100, state.trimYaw + 10);
  document.getElementById('trim-yaw-val').textContent = state.trimYaw;
  state.yaw = 1500 + state.trimYaw;
  updateControlsDisplay();
});

document.getElementById('trim-pitch-up').addEventListener('click', () => {
  state.trimPitch = Math.min(100, state.trimPitch + 10);
  document.getElementById('trim-pitch-val').textContent = state.trimPitch;
  state.pitch = 1500 + state.trimPitch;
  updateControlsDisplay();
});

document.getElementById('trim-pitch-down').addEventListener('click', () => {
  state.trimPitch = Math.max(-100, state.trimPitch - 10);
  document.getElementById('trim-pitch-val').textContent = state.trimPitch;
  state.pitch = 1500 + state.trimPitch;
  updateControlsDisplay();
});

document.getElementById('trim-roll-left').addEventListener('click', () => {
  state.trimRoll = Math.max(-100, state.trimRoll - 10);
  document.getElementById('trim-roll-val').textContent = state.trimRoll;
  state.roll = 1500 + state.trimRoll;
  updateControlsDisplay();
});

document.getElementById('trim-roll-right').addEventListener('click', () => {
  state.trimRoll = Math.min(100, state.trimRoll + 10);
  document.getElementById('trim-roll-val').textContent = state.trimRoll;
  state.roll = 1500 + state.trimRoll;
  updateControlsDisplay();
});

// Autopilot Flight Mode Segmented Buttons
document.querySelectorAll('.segment-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.flightMode = btn.dataset.fmode;
    audio.playClick();
  });
});

// 9. REAL-TIME KEYBOARD CONTROLS & HUD KEY HIGHLIGHTS
const keys = {};
const keyChipMap = {
  'w': 'k-w',
  's': 'k-s',
  'a': 'k-a',
  'd': 'k-d',
  'arrowup': 'k-up',
  'arrowdown': 'k-down',
  'arrowleft': 'k-left',
  'arrowright': 'k-right'
};

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = true;
  if (k === ' ') btnEmergency.click();
  
  if (keyChipMap[k]) {
    const el = document.getElementById(keyChipMap[k]);
    if (el) el.classList.add('active-key');
  }
  handleKeyboard();
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  keys[k] = false;
  
  if (keyChipMap[k]) {
    const el = document.getElementById(keyChipMap[k]);
    if (el) el.classList.remove('active-key');
  }
  handleKeyboard();
});

function handleKeyboard() {
  if (keys['w']) state.throttle = Math.min(2000, state.throttle + 25);
  if (keys['s']) state.throttle = Math.max(1000, state.throttle - 25);
  document.getElementById('throttle-slider').value = state.throttle;
  
  if (keys['a']) state.yaw = 1320;
  else if (keys['d']) state.yaw = 1680;
  else state.yaw = 1500 + state.trimYaw;

  if (keys['arrowup']) state.pitch = 1680;
  else if (keys['arrowdown']) state.pitch = 1320;
  else state.pitch = 1500 + state.trimPitch;

  if (keys['arrowleft']) state.roll = 1320;
  else if (keys['arrowright']) state.roll = 1680;
  else state.roll = 1500 + state.trimRoll;

  // Move joystick knob visuals
  const knobLeft = document.getElementById('knob-left');
  const yOffsetL = -((state.throttle - 1500) / 500) * 38;
  const xOffsetL = ((state.yaw - 1500) / 500) * 38;
  knobLeft.style.transform = `translate(calc(-50% + ${xOffsetL}px), calc(-50% + ${yOffsetL}px))`;

  const knobRight = document.getElementById('knob-right');
  const yOffsetR = -((state.pitch - 1500) / 500) * 38;
  const xOffsetR = ((state.roll - 1500) / 500) * 38;
  knobRight.style.transform = `translate(calc(-50% + ${xOffsetR}px), calc(-50% + ${yOffsetR}px))`;

  updateControlsDisplay();
}

// 10. GAMEPAD API (USB / BLUETOOTH RC CONTROLLER)
window.addEventListener('gamepadconnected', (e) => {
  const pill = document.getElementById('gamepad-status-pill');
  pill.classList.add('active');
  document.getElementById('gamepad-status-text').textContent = e.gamepad.id.slice(0, 18);
  audio.playTone(880, 0.12, 0.1);
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

    if (Math.abs(leftX) > 0.06) state.yaw = Math.round(1500 + leftX * 500);
    if (Math.abs(leftY) > 0.06) state.throttle = Math.round(1500 - leftY * 500);
    if (Math.abs(rightX) > 0.06) state.roll = Math.round(1500 + rightX * 500);
    if (Math.abs(rightY) > 0.06) state.pitch = Math.round(1500 - rightY * 500);

    if (gp.buttons[1] && gp.buttons[1].pressed) {
      btnEmergency.click();
    }
    updateControlsDisplay();
  }
}

// 11. TELEMETRY & CONTROLS UI UPDATE
function updateControlsDisplay() {
  document.getElementById('hud-left-stick-coords').textContent = `T: ${state.throttle} | Y: ${state.yaw}`;
  document.getElementById('hud-right-stick-coords').textContent = `P: ${state.pitch} | R: ${state.roll}`;
  document.getElementById('raw-packet-text').textContent = `T:${state.throttle}, Y:${state.yaw}, P:${state.pitch}, R:${state.roll}, A:${state.isArmed ? 1 : 0}`;
  
  const throttlePct = Math.round(((state.throttle - 1000) / 1000) * 100);
  document.getElementById('throttle-pct-badge').textContent = `${throttlePct}%`;

  // Audio motor update
  audio.updateMotorHum(state.throttle, state.isArmed);

  // Propulsion View: Quad-X vs Stealth Wing
  if (state.vehicle === 'quad') {
    if (state.isArmed && state.throttle > 1050) {
      const pOff = (state.pitch - 1500) / 2;
      const rOff = (state.roll - 1500) / 2;
      const yOff = (state.yaw - 1500) / 2;

      const m1 = Math.max(1000, Math.min(2000, state.throttle + pOff + rOff - yOff));
      const m2 = Math.max(1000, Math.min(2000, state.throttle + pOff - rOff + yOff));
      const m3 = Math.max(1000, Math.min(2000, state.throttle - pOff + rOff + yOff));
      const m4 = Math.max(1000, Math.min(2000, state.throttle - pOff - rOff - yOff));

      setMotorBar('thrust-m1', 'val-m1', 'pct-m1', 'rpm-m1', m1);
      setMotorBar('thrust-m2', 'val-m2', 'pct-m2', 'rpm-m2', m2);
      setMotorBar('thrust-m3', 'val-m3', 'pct-m3', 'rpm-m3', m3);
      setMotorBar('thrust-m4', 'val-m4', 'pct-m4', 'rpm-m4', m4);

      const totalAmps = (((m1 + m2 + m3 + m4 - 4000) / 4000) * 76).toFixed(1);
      document.getElementById('quad-total-amps').textContent = `${totalAmps}A`;
    } else {
      setMotorBar('thrust-m1', 'val-m1', 'pct-m1', 'rpm-m1', 1000);
      setMotorBar('thrust-m2', 'val-m2', 'pct-m2', 'rpm-m2', 1000);
      setMotorBar('thrust-m3', 'val-m3', 'pct-m3', 'rpm-m3', 1000);
      setMotorBar('thrust-m4', 'val-m4', 'pct-m4', 'rpm-m4', 1000);
      document.getElementById('quad-total-amps').textContent = `0.0A`;
    }
  } else {
    // Stealth Wing Pusher & Elevons
    const wingPwm = state.isArmed ? state.throttle : 1000;
    const wingPct = Math.round(((wingPwm - 1000) / 1000) * 100);
    const wingRpm = Math.round(wingPct * 230);
    document.getElementById('thrust-wing').style.width = `${wingPct}%`;
    document.getElementById('val-wing-pwm').textContent = `${wingPwm}us`;
    document.getElementById('pct-wing').textContent = `${wingPct}%`;
    document.getElementById('wing-rpm').textContent = `${wingRpm.toLocaleString()} RPM`;

    // Elevons: pitch moves both same direction, roll moves them opposing
    const pitchDeflect = ((state.pitch - 1500) / 500) * 30; // deg
    const rollDeflect = ((state.roll - 1500) / 500) * 25;   // deg
    const elevonL = (-pitchDeflect + rollDeflect).toFixed(1);
    const elevonR = (-pitchDeflect - rollDeflect).toFixed(1);

    document.getElementById('val-elevon-l').textContent = `${elevonL >= 0 ? '+' : ''}${elevonL}°`;
    document.getElementById('val-elevon-r').textContent = `${elevonR >= 0 ? '+' : ''}${elevonR}°`;

    const needleL = Math.max(-100, Math.min(100, (elevonL / 30) * 100));
    const needleR = Math.max(-100, Math.min(100, (elevonR / 30) * 100));
    document.getElementById('needle-elevon-l').style.transform = `translateX(calc(-50% + ${needleL * 0.22}px))`;
    document.getElementById('needle-elevon-r').style.transform = `translateX(calc(-50% + ${needleR * 0.22}px))`;
  }

  // Telemetry Attitude Angles
  state.pitchDeg = ((state.pitch - 1500) / 500) * 30;
  state.rollDeg = ((state.roll - 1500) / 500) * 30;
  document.getElementById('hud-pitch-deg').textContent = `${state.pitchDeg >= 0 ? '+' : ''}${state.pitchDeg.toFixed(1)}°`;
  document.getElementById('hud-roll-deg').textContent = `${state.rollDeg >= 0 ? '+' : ''}${state.rollDeg.toFixed(1)}°`;
  document.getElementById('hud-yaw-deg').textContent = `${Math.round(state.heading)}°`;
  document.getElementById('hud-speed-val').textContent = state.speedKmh.toFixed(1);
  document.getElementById('hud-alt-val').textContent = state.altitude.toFixed(1);

  // Vertical Speed (VSI)
  const vsiVal = document.getElementById('vsi-val');
  const vsiNeedle = document.getElementById('vsi-needle');
  vsiVal.textContent = `${state.climbRate >= 0 ? '+' : ''}${state.climbRate.toFixed(1)} m/s`;
  const vsiOffset = Math.max(-28, Math.min(28, state.climbRate * 5.6));
  vsiNeedle.style.transform = `translateX(calc(-50% + ${vsiOffset}px))`;
}

function setMotorBar(barId, valId, pctId, rpmId, pwm) {
  const pct = Math.round(((pwm - 1000) / 1000) * 100);
  const rpm = Math.round(pct * 240); // Max ~24,000 RPM
  const bar = document.getElementById(barId);
  const val = document.getElementById(valId);
  const pEl = document.getElementById(pctId);
  const rEl = document.getElementById(rpmId);

  if (bar) bar.style.width = `${pct}%`;
  if (val) val.textContent = `${pwm}us`;
  if (pEl) pEl.textContent = `${pct}%`;
  if (rEl) rEl.textContent = `${rpm.toLocaleString()} RPM`;
}

// 12. FLIGHT SIMULATION LOOP (Runs in real-time when simMode is active)
let lastSimTime = performance.now();

function stepFlightSimulation(now) {
  const dt = Math.min(0.1, (now - lastSimTime) / 1000);
  lastSimTime = now;

  if (state.simMode) {
    if (state.isArmed) {
      // Throttle affects climb rate & altitude
      if (state.throttle > 1150) {
        const excessThr = (state.throttle - 1450) / 550; // -0.5 to 1.0
        state.climbRate = excessThr * 4.5;
        state.altitude = Math.max(0, state.altitude + state.climbRate * dt);
      } else {
        state.climbRate = -2.0;
        state.altitude = Math.max(0, state.altitude + state.climbRate * dt);
      }

      // Pitch affects forward speed
      const pitchPush = (state.pitch - 1500) / 500; // -1 to 1
      const targetSpeed = Math.max(0, (state.throttle > 1100 ? 15 : 0) + pitchPush * 75);
      state.speedKmh += (targetSpeed - state.speedKmh) * dt * 2.0;

      // Yaw turns heading
      const yawRate = ((state.yaw - 1500) / 500) * 45; // deg/sec
      state.heading = (state.heading + yawRate * dt + 360) % 360;

      // G-force
      state.gLoad = Math.max(0.6, Math.min(2.8, 1.0 + Math.abs(state.rollDeg) / 35 + state.climbRate / 10));

      // Drift coordinates
      const speedMs = state.speedKmh / 3.6;
      const headingRad = (state.heading * Math.PI) / 180;
      state.gpsLat += Math.cos(headingRad) * speedMs * dt * 0.000009;
      state.gpsLng += Math.sin(headingRad) * speedMs * dt * 0.000009;

      // Distance to home
      const dLat = (state.gpsLat - state.homeLat) * 111000;
      const dLng = (state.gpsLng - state.homeLng) * 111000;
      state.distanceToHome = Math.round(Math.hypot(dLat, dLng));
    } else {
      state.climbRate = 0;
      state.speedKmh = Math.max(0, state.speedKmh - dt * 10);
      state.gLoad = 1.0;
    }

    document.getElementById('hud-climbrate').textContent = `${state.climbRate >= 0 ? '+' : ''}${state.climbRate.toFixed(1)} m/s`;
    document.getElementById('hud-g-load').textContent = `${state.gLoad.toFixed(2)} G`;
    document.getElementById('hud-gps').textContent = `${state.gpsLat.toFixed(4)}° N, ${state.gpsLng.toFixed(4)}° E`;
    document.getElementById('radar-dist-val').textContent = `DIST: ${state.distanceToHome}m`;
  }
}

// 13. 50HZ TRANSMISSION LOOP
setInterval(() => {
  if (socket.connected) {
    const packet = `T:${state.throttle},Y:${state.yaw},P:${state.pitch},R:${state.roll},A:${state.isArmed ? 1 : 0}`;
    socket.emit('cmd', packet);
  }
}, 20);

// 14. 3D SYNTHETIC VISION SYSTEM (SVS Canvas Layer)
const svsCanvas = document.getElementById('svs-canvas');
const svsCtx = svsCanvas.getContext('2d');
let gridScrollZ = 0;

function resizeSvsCanvas() {
  const rect = svsCanvas.getBoundingClientRect();
  svsCanvas.width = rect.width * (window.devicePixelRatio || 1);
  svsCanvas.height = rect.height * (window.devicePixelRatio || 1);
  svsCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
}
window.addEventListener('resize', resizeSvsCanvas);
resizeSvsCanvas();

function drawSVS() {
  const w = svsCanvas.getBoundingClientRect().width;
  const h = svsCanvas.getBoundingClientRect().height;
  const cx = w / 2;
  const cy = h / 2;

  svsCtx.clearRect(0, 0, w, h);

  // SVS Sky & Ground Gradient
  const rollRad = (state.rollDeg * Math.PI) / 180;
  const pitchOffset = state.pitchDeg * 4.0;

  svsCtx.save();
  svsCtx.translate(cx, cy);
  svsCtx.rotate(rollRad);
  svsCtx.translate(0, pitchOffset);

  // Sky
  const skyGrad = svsCtx.createLinearGradient(0, -h * 1.5, 0, 0);
  skyGrad.addColorStop(0, '#04091a');
  skyGrad.addColorStop(1, '#0e1f3d');
  svsCtx.fillStyle = skyGrad;
  svsCtx.fillRect(-w * 1.5, -h * 1.5, w * 3, h * 1.5);

  // Ground
  const groundGrad = svsCtx.createLinearGradient(0, 0, 0, h * 1.5);
  groundGrad.addColorStop(0, '#081224');
  groundGrad.addColorStop(1, '#03060c');
  svsCtx.fillStyle = groundGrad;
  svsCtx.fillRect(-w * 1.5, 0, w * 3, h * 1.5);

  // Horizon Line
  svsCtx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
  svsCtx.lineWidth = 1.5;
  svsCtx.beginPath();
  svsCtx.moveTo(-w * 1.5, 0);
  svsCtx.lineTo(w * 1.5, 0);
  svsCtx.stroke();

  // 3D Perspective Ground Grid
  gridScrollZ = (gridScrollZ + (state.speedKmh / 20)) % 40;
  svsCtx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
  svsCtx.lineWidth = 1;

  // Longitudinal perspective lines
  for (let x = -w; x <= w; x += 60) {
    svsCtx.beginPath();
    svsCtx.moveTo(0, 0);
    svsCtx.lineTo(x * 2.2, h * 1.5);
    svsCtx.stroke();
  }

  // Lateral depth rungs
  for (let z = 10; z < h * 1.5; z += 30) {
    const yPos = Math.pow(z / (h * 1.5), 1.6) * (h * 1.5);
    svsCtx.beginPath();
    svsCtx.moveTo(-w * 1.5, yPos);
    svsCtx.lineTo(w * 1.5, yPos);
    svsCtx.stroke();
  }

  svsCtx.restore();
}

// 15. MILITARY AVIATION HUD (HUD Canvas Layer)
const hudCanvas = document.getElementById('hud-canvas');
const hudCtx = hudCanvas.getContext('2d');

function resizeHudCanvas() {
  const rect = hudCanvas.getBoundingClientRect();
  hudCanvas.width = rect.width * (window.devicePixelRatio || 1);
  hudCanvas.height = rect.height * (window.devicePixelRatio || 1);
  hudCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
}
window.addEventListener('resize', resizeHudCanvas);
resizeHudCanvas();

function drawAviationHUD() {
  const w = hudCanvas.getBoundingClientRect().width;
  const h = hudCanvas.getBoundingClientRect().height;
  const cx = w / 2;
  const cy = h / 2;

  hudCtx.clearRect(0, 0, w, h);

  // 1. Center Flight Path Marker (Aircraft Boresight)
  hudCtx.save();
  hudCtx.strokeStyle = 'rgba(0, 240, 255, 0.9)';
  hudCtx.lineWidth = 1.8;
  hudCtx.shadowColor = 'rgba(0, 240, 255, 0.4)';
  hudCtx.shadowBlur = 8;

  // Center Reticle
  hudCtx.beginPath();
  hudCtx.arc(cx, cy, 18, 0, Math.PI * 2);
  hudCtx.stroke();

  // Boresight Wings
  hudCtx.beginPath();
  hudCtx.moveTo(cx - 32, cy);
  hudCtx.lineTo(cx - 18, cy);
  hudCtx.moveTo(cx + 18, cy);
  hudCtx.lineTo(cx + 32, cy);
  hudCtx.moveTo(cx, cy - 18);
  hudCtx.lineTo(cx, cy - 26);
  hudCtx.stroke();

  // Center Target Pip
  hudCtx.fillStyle = '#00f0ff';
  hudCtx.beginPath();
  hudCtx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  hudCtx.fill();
  hudCtx.restore();

  // 2. Pitch Ladder with Degree Angles (-20° to +20°)
  hudCtx.save();
  hudCtx.translate(cx, cy);
  const rollRad = (state.rollDeg * Math.PI) / 180;
  const pitchOffset = state.pitchDeg * 4.0;

  hudCtx.rotate(rollRad);
  hudCtx.translate(0, pitchOffset);

  hudCtx.font = '10px "JetBrains Mono", monospace';
  hudCtx.textAlign = 'left';
  hudCtx.textBaseline = 'middle';

  const pitchSteps = [-20, -15, -10, -5, 5, 10, 15, 20];
  pitchSteps.forEach(deg => {
    const y = -deg * 4.0;
    const isNegative = deg < 0;

    hudCtx.strokeStyle = isNegative ? 'rgba(255, 170, 0, 0.75)' : 'rgba(0, 240, 255, 0.75)';
    hudCtx.lineWidth = 1.4;

    // Left rung
    hudCtx.beginPath();
    if (isNegative) {
      hudCtx.setLineDash([4, 4]); // Dashed for negative
    } else {
      hudCtx.setLineDash([]);
    }
    hudCtx.moveTo(-45, y);
    hudCtx.lineTo(-15, y);
    hudCtx.lineTo(-15, y + (isNegative ? -4 : 4));
    hudCtx.stroke();

    // Right rung
    hudCtx.beginPath();
    hudCtx.moveTo(15, y + (isNegative ? -4 : 4));
    hudCtx.lineTo(15, y);
    hudCtx.lineTo(45, y);
    hudCtx.stroke();

    // Degree text
    hudCtx.fillStyle = isNegative ? 'rgba(255, 170, 0, 0.9)' : 'rgba(0, 240, 255, 0.9)';
    hudCtx.fillText(`${Math.abs(deg)}`, 50, y);
    hudCtx.textAlign = 'right';
    hudCtx.fillText(`${Math.abs(deg)}`, -50, y);
    hudCtx.textAlign = 'left';
  });

  hudCtx.restore();

  // 3. Roll / Bank Angle Scale (Top Arc)
  hudCtx.save();
  hudCtx.translate(cx, cy);
  hudCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  hudCtx.lineWidth = 1.2;

  const arcRadius = 130;
  hudCtx.beginPath();
  hudCtx.arc(0, 0, arcRadius, -Math.PI * 0.75, -Math.PI * 0.25);
  hudCtx.stroke();

  // Tick marks for bank angles
  const rollTicks = [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60];
  rollTicks.forEach(tick => {
    const rad = (-90 + tick) * (Math.PI / 180);
    const tickLen = (tick % 30 === 0) ? 9 : 5;
    const x1 = Math.cos(rad) * arcRadius;
    const y1 = Math.sin(rad) * arcRadius;
    const x2 = Math.cos(rad) * (arcRadius - tickLen);
    const y2 = Math.sin(rad) * (arcRadius - tickLen);

    hudCtx.beginPath();
    hudCtx.moveTo(x1, y1);
    hudCtx.lineTo(x2, y2);
    hudCtx.stroke();
  });

  // Current Roll Pointer
  hudCtx.rotate(rollRad);
  hudCtx.fillStyle = '#00f0ff';
  hudCtx.beginPath();
  hudCtx.moveTo(0, -(arcRadius - 12));
  hudCtx.lineTo(-5, -(arcRadius - 2));
  hudCtx.lineTo(5, -(arcRadius - 2));
  hudCtx.closePath();
  hudCtx.fill();

  hudCtx.restore();
}

// 16. DYNAMIC ROLLING COMPASS RIBBON
const compassCanvas = document.getElementById('compass-canvas');
const compassCtx = compassCanvas.getContext('2d');

function drawCompassRibbon() {
  const w = compassCanvas.width;
  const h = compassCanvas.height;
  compassCtx.clearRect(0, 0, w, h);

  const cx = w / 2;
  const pixelsPerDegree = 4.5;
  const currentHeading = state.heading;

  document.getElementById('heading-deg-text').textContent = `${Math.round(currentHeading)}° ${getCardinal(currentHeading)}`;

  compassCtx.save();
  compassCtx.font = '10px "JetBrains Mono", monospace';
  compassCtx.textAlign = 'center';
  compassCtx.textBaseline = 'top';

  for (let deg = -60; deg <= 60; deg += 5) {
    const headingDeg = (Math.round(currentHeading) + deg + 360) % 360;
    const x = cx + deg * pixelsPerDegree;

    if (headingDeg % 30 === 0) {
      let label = `${headingDeg}`;
      if (headingDeg === 0) label = 'N';
      else if (headingDeg === 90) label = 'E';
      else if (headingDeg === 180) label = 'S';
      else if (headingDeg === 270) label = 'W';

      compassCtx.fillStyle = (label === 'N' || label === 'E' || label === 'S' || label === 'W') ? '#00f0ff' : '#ffffff';
      compassCtx.fillText(label, x, 2);

      compassCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      compassCtx.beginPath();
      compassCtx.moveTo(x, 17);
      compassCtx.lineTo(x, 28);
      compassCtx.stroke();
    } else if (headingDeg % 10 === 0) {
      compassCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      compassCtx.beginPath();
      compassCtx.moveTo(x, 20);
      compassCtx.lineTo(x, 28);
      compassCtx.stroke();
    } else {
      compassCtx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      compassCtx.beginPath();
      compassCtx.moveTo(x, 23);
      compassCtx.lineTo(x, 28);
      compassCtx.stroke();
    }
  }

  compassCtx.restore();
}

function getCardinal(deg) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(deg / 45) % 8];
}

// 17. TACTICAL RADAR MINI-MAP DISPLAY
const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas.getContext('2d');

function drawTacticalRadar() {
  const w = radarCanvas.width;
  const h = radarCanvas.height;
  const cx = w / 2;
  const cy = h / 2;

  radarCtx.clearRect(0, 0, w, h);

  // Concentric Rings
  radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
  radarCtx.lineWidth = 1;
  [22, 44, 60].forEach(r => {
    radarCtx.beginPath();
    radarCtx.arc(cx, cy, r, 0, Math.PI * 2);
    radarCtx.stroke();
  });

  // Crosshairs
  radarCtx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
  radarCtx.beginPath();
  radarCtx.moveTo(cx, 0);
  radarCtx.lineTo(cx, h);
  radarCtx.moveTo(0, cy);
  radarCtx.lineTo(w, cy);
  radarCtx.stroke();

  // Home Point (H)
  radarCtx.save();
  const dLat = (state.homeLat - state.gpsLat) * 111000;
  const dLng = (state.homeLng - state.gpsLng) * 111000;
  const scale = 0.25; // meters to radar pixels
  const homeX = cx + dLng * scale;
  const homeY = cy - dLat * scale;

  // Clamped in circle
  const distFromCenter = Math.hypot(homeX - cx, homeY - cy);
  const maxR = 56;
  const clampedX = distFromCenter > maxR ? cx + ((homeX - cx) / distFromCenter) * maxR : homeX;
  const clampedY = distFromCenter > maxR ? cy + ((homeY - cy) / distFromCenter) * maxR : homeY;

  radarCtx.fillStyle = '#00ff88';
  radarCtx.font = 'bold 9px "JetBrains Mono", monospace';
  radarCtx.textAlign = 'center';
  radarCtx.textBaseline = 'middle';
  radarCtx.fillText('H', clampedX, clampedY);

  // Return Path Line
  radarCtx.setLineDash([2, 3]);
  radarCtx.strokeStyle = 'rgba(0, 255, 136, 0.35)';
  radarCtx.beginPath();
  radarCtx.moveTo(cx, cy);
  radarCtx.lineTo(clampedX, clampedY);
  radarCtx.stroke();
  radarCtx.restore();

  // Drone Position & Heading Cone at Center
  radarCtx.save();
  radarCtx.translate(cx, cy);
  const headRad = (state.heading * Math.PI) / 180;
  radarCtx.rotate(headRad);

  // Heading Vector Arrow
  radarCtx.fillStyle = '#00f0ff';
  radarCtx.beginPath();
  radarCtx.moveTo(0, -9);
  radarCtx.lineTo(-5, 5);
  radarCtx.lineTo(0, 2);
  radarCtx.lineTo(5, 5);
  radarCtx.closePath();
  radarCtx.fill();

  radarCtx.restore();
}

// 18. MAIN RENDERING LOOP (Buttery 60FPS)
function cockpitRenderLoop(time) {
  pollGamepad();
  stepFlightSimulation(time);
  drawSVS();
  drawAviationHUD();
  drawCompassRibbon();
  drawTacticalRadar();

  requestAnimationFrame(cockpitRenderLoop);
}

requestAnimationFrame(cockpitRenderLoop);

// 19. WEBRTC STREAM RECEIVER
let peerConnection;
const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const remoteVideo = document.getElementById('drone-video');
const standbyBanner = document.getElementById('standby-banner');

socket.on('webrtc_offer', async (offer) => {
  peerConnection = new RTCPeerConnection(rtcConfig);

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
    standbyBanner.style.display = 'none';
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
console.log('🛸 SuperDrone 2026 Aerospace Cockpit Ready.');
