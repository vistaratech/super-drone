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
├── hardware/                 # 3D Printable FPV Quadcopter Frame (TBS Source One V5 Specs)
│   ├── generate_stl.py       # Parametric Python STL generator (226mm wheelbase)
│   ├── viewer.html           # Interactive 3D frame viewer (Three.js)
│   └── models/
│       ├── full_frame_assembled.stl   # ★ Complete assembled frame (preview)
│       ├── bottom_plate.stl           # Chassis plate (30.5 + 20mm stack mounts)
│       ├── top_plate.stl              # Top plate (antenna & buzzer mounts)
│       ├── arm_front_right.stl        # Arm + 2207 motor mount (45°)
│       ├── arm_front_left.stl         # Arm + 2207 motor mount (135°)
│       ├── arm_rear_left.stl          # Arm + 2207 motor mount (225°)
│       ├── arm_rear_right.stl         # Arm + 2207 motor mount (315°)
│       ├── camera_mount_micro.stl     # 19mm micro FPV camera cradle (25° tilt)
│       ├── battery_pad.stl            # Anti-slip battery landing pad
│       └── s21fe_fpv_cradle.stl       # Samsung S21 FE phone mount (FPV camera)
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

## 🖨️ 3D Printable FPV Quadcopter Frame

The frame is designed based on the **TBS Source One V5** open-source specs, optimized for 3D printing.

### Frame Specifications
| Parameter | Value |
|---|---|
| **Wheelbase** | 226mm (True-X) |
| **Prop Size** | 5-inch (127mm) |
| **Arm Thickness** | 7mm (3D print optimized) |
| **Stack Mount** | 30.5×30.5mm (M3) + 20×20mm (M2) |
| **Motor Mount** | 16×19mm M3 bolt pattern (2207 motors) |
| **Camera Mount** | 19mm micro (25° default tilt) |
| **Standoff Height** | 25mm |

### 3D Print Settings (Recommended)
| Setting | Value |
|---|---|
| **Material** | PETG or CF-PETG (NOT PLA) |
| **Layer Height** | 0.2mm |
| **Infill** | 60%+ Gyroid pattern |
| **Walls** | 4 minimum |
| **Supports** | Yes (camera mount & phone cradle) |

### Printable Parts (`hardware/models/`)
| Part | File | Description |
|---|---|---|
| **Bottom Plate** | `bottom_plate.stl` | Main chassis with FC/ESC stack mounting holes |
| **Top Plate** | `top_plate.stl` | Electronics protector with antenna & buzzer mounts |
| **Arms (×4)** | `arm_*.stl` | Tapered arms with integrated 2207 motor mount tubes |
| **Camera Mount** | `camera_mount_micro.stl` | 19mm micro FPV camera cradle at 25° tilt |
| **Battery Pad** | `battery_pad.stl` | Anti-slip grid pad with strap guides |
| **Phone Cradle** | `s21fe_fpv_cradle.stl` | Samsung S21 FE holder with camera aperture |
| **Full Assembly** | `full_frame_assembled.stl` | ★ All parts combined (visualization only) |

### Regenerate STL Files
```bash
python hardware/generate_stl.py
```

### 3D Viewer (Local)
Open `http://localhost:3000/hardware/viewer.html` for interactive Three.js preview with orbit controls.
