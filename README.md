# 🛸 SuperDrone & SuperWing 5G: Cloud-Controlled BVLOS Teleoperation System

A complete ultra-low-latency (Sub-30ms) Beyond Visual Line of Sight (BVLOS) UAV teleoperation system using **5G Cellular Network + Samsung Galaxy S21 FE + ESP32 Super Mini (BLE) + 2026 Next-Gen Web GCS Cockpit**.

Supports both **Fixed-Wing Stealth Delta Wings (60-90 min flight time)** and **Standard Multirotor Quadcopters**.

---

## 📂 Project Architecture & Modules

```
Super-Drone/
├── server/                   # 5G Low-Latency Cloud Relay Server (Node.js + Socket.io)
│   ├── package.json
│   └── server.js             # High-speed packet broker with RTT ping & WebRTC signaling
│
├── web-controller/           # 2026 Next-Gen Operator Cockpit (Ground Control Station)
│   ├── index.html            # Apple VisionOS & Tesla aesthetic minimalist cockpit HUD
│   ├── style.css             # Frosted glassmorphism, responsive canvas telemetry
│   └── app.js                # Gamepad API, Web Audio API, WebRTC 1080p 60fps receiver
│
├── drone-bridge/             # Runs on Samsung S21 FE 5G (Phone Edge Gateway)
│   ├── index.html            # High-tech telemetry node with live camera preview
│   └── bridge.js             # 5G WebRTC stream + Web Bluetooth API bridge to ESP32
│
├── esp32-firmware/           # Microcontroller Firmware (ESP32 Super Mini / C3)
│   ├── SuperWing_ESP32.ino   # Stealth Delta Wing: 1 Pusher Motor + 2 Servos + MPU-6050 Gyro Auto-Level
│   └── SuperDrone_ESP32.ino  # Quadcopter: 4 Brushless ESCs + Quad-X PID Stabilization
│
├── hardware/                 # 3D Printable STL Models & CAD Generators
│   ├── generate_stl.py       # Procedural Python STL generator
│   └── models/
│       ├── s21fe_fpv_nose_mount.stl       # Custom aerodynamic nose cradle for Samsung S21 FE
│       └── motor_mount_pusher_2207.stl   # Rear 2207 brushless pusher motor mount
│
└── docs/                     # Documentation & Technical Guides
    ├── stealth-wing-wiring-guide.md # Complete circuit diagram, pinouts & servo deflection check
    ├── stealth-wing-bom.md          # Complete Bill of Materials (BOM) & Buying Links in INR
    ├── investor-pitch.md            # Commercial Business Plan & Deck
    └── wiring-diagram.md            # Quadcopter wiring diagram
```

---

## 🚀 Quick Start Guide

### 1. Launch the 5G Cloud Relay Server
```bash
cd server
npm install
npm start
```
* Access Cockpit: `http://localhost:3000/controller`
* Access Phone Edge Bridge: `http://localhost:3000/bridge`

### 2. Flash ESP32 Super Mini
* For **Stealth Flying Wing (Delta Wing)**: Open `esp32-firmware/SuperWing_ESP32.ino` in Arduino IDE and flash.
* For **Quadcopter**: Open `esp32-firmware/SuperDrone_ESP32.ino` in Arduino IDE and flash.

### 3. Connect Samsung Galaxy S21 FE (Onboard Vehicle)
1. Open Chrome on the S21 FE and navigate to `http://<your-server-ip>:3000/bridge`.
2. Click **"Connect ESP32 (BLE)"** -> Pair with `SuperDrone-BLE`.
3. Click **"Start 1080p 60FPS Stream"** -> Live camera broadcasting initiates.

### 4. Fly from Cockpit (Anywhere in the World)
1. Open `http://<your-server-ip>:3000/controller` on your laptop, tablet, or phone.
2. Arm the vehicle using the sliding **Standby/Armed** switch.
3. Fly using keyboard (`W/S/A/D` + Arrows), on-screen touch joysticks, or an attached USB Gamepad!

---

## 🖨️ 3D Printing Samsung S21 FE Mount
The ready-to-print STL files are located in `hardware/models/`:
* `s21fe_fpv_nose_mount.stl`: Aerodynamic nose cone cradle holding the Samsung S21 FE securely with camera aperture.
* `motor_mount_pusher_2207.stl`: Rear pusher motor mount for 2207/2216 brushless motors.
