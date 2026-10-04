# ✈️ SuperWing 5G: Complete Wiring & Circuit Architecture Guide

This guide details the complete hardware connection schema for the **Stealth Flying Wing / Delta Wing UAV** powered by **ESP32 Super Mini (BLE)** and **Samsung Galaxy S21 FE (5G WebRTC Bridge)**.

---

## 📐 Circuit Connection Architecture

```
                    ┌─────────────────────────┐
                    │  4S Li-Ion Battery Pack │
                    │   (14.8V - 16.8V XT60)  │
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           │ Thick High-Current (V+ / GND)             │
           ▼                                           ▼
┌────────────────────────┐                  ┌────────────────────────┐
│  40A Brushless ESC     │                  │  5V 3A UBEC Regulator   │
│  (Motor Speed Control) │                  │  (Clean Step-Down)     │
└──────────┬─────────────┘                  └──────────┬─────────────┘
           │ 3-Phase AC (U, V, W)                      │ 5.0V Regulated
           ▼                                           ▼
┌────────────────────────┐                  ┌────────────────────────┐
│ 2207 / 2216 Brushless  │                  │  Power Rails (5V / GND)│
│ Pusher Motor (Rear)    │                  │  Powers ESP32 & Servos │
└────────────────────────┘                  └──────────┬─────────────┘
                                                       │
                 ┌─────────────────────────────────────┴─────────────────────────────────────┐
                 │                                                                           │
                 ▼                                                                           ▼
      ┌──────────────────────┐                                                    ┌──────────────────────┐
      │   ESP32 Super Mini   │                                                    │  2x MG90S Micro      │
      │   Microcontroller    │                                                    │  Metal Gear Servos   │
      └──────────┬───────────┘                                                    └──────────────────────┘
                 │
                 ├── GPIO 4 (PWM) ─────────> ESC White Signal Wire
                 ├── GPIO 5 (PWM) ─────────> Left Wing Elevon Servo Signal (Orange)
                 ├── GPIO 6 (PWM) ─────────> Right Wing Elevon Servo Signal (Orange)
                 │
                 ├── GPIO 8 (SDA) ─────────> MPU-6050 SDA (I2C Gyro/Accel)
                 ├── GPIO 9 (SCL) ─────────> MPU-6050 SCL (I2C Gyro/Accel)
                 ├── 5V / GND     ─────────> MPU-6050 VCC / GND
                 │
                 │ [ Ultra-Low Latency BLE Link (7.5ms) ]
                 ▼
      ┌──────────────────────────────────────────────────┐
      │  Samsung Galaxy S21 FE (Nose Cockpit Mount)     │
      │  - 5G Cellular Internet Data                     │
      │  - 1080p 60FPS Ultra-Wide Camera Livestream      │
      │  - Edge Gateway (Relays 5G Cloud to ESP32 BLE)   │
      └──────────────────────────────────────────────────┘
```

---

## 📌 Detailed Pinout Mapping Table

| ESP32 Pin | Connected Component | Wire Color / Signal | Description |
| :--- | :--- | :--- | :--- |
| **5V / VBUS** | 5V UBEC Output / Power Rail | Red (+5V) | Main regulated power input (5V 3A) |
| **GND** | Common Ground Bus | Black (GND) | Shared common ground |
| **GPIO 4** | 40A Brushless ESC | White / Orange | 50Hz PWM Throttle (1000us cut - 2000us full) |
| **GPIO 5** | Left Elevon Servo | Orange / White | 50Hz PWM Servo (1000us - 2000us, 1500us neutral) |
| **GPIO 6** | Right Elevon Servo | Orange / White | 50Hz PWM Servo (1000us - 2000us, 1500us neutral) |
| **GPIO 8** | MPU-6050 IMU | Yellow / Blue | I2C Data (SDA) for 6-axis flight stabilization |
| **GPIO 9** | MPU-6050 IMU | Green / Purple | I2C Clock (SCL) for 6-axis flight stabilization |

---

## 🛩️ Elevon Mechanical Direction Checklist

Before taking off, verify the mechanical elevon deflections match the transmitter sticks:

1. **Pull Pitch Stick BACK (Climb / Pitch Up):**
   * **Both Left and Right Elevons must deflect UPWARD (▲ ▲).**
2. **Push Pitch Stick FORWARD (Dive / Pitch Down):**
   * **Both Left and Right Elevons must deflect DOWNWARD (▼ ▼).**
3. **Move Roll Stick LEFT (Bank Left):**
   * **Left Elevon must deflect UP (▲), Right Elevon DOWN (▼).**
4. **Move Roll Stick RIGHT (Bank Right):**
   * **Right Elevon must deflect UP (▲), Left Elevon DOWN (▼).**

*(If a servo moves in the opposite direction, reverse the sign in `SuperWing_ESP32.ino` lines 180-181).*

---

## 🛡️ Failsafe & Emergency Auto-Recovery
* If the 5G connection or BLE link cuts for more than **1500ms**, the ESP32 automatically triggers failsafe mode:
  * **Motor Throttle cuts to 0%** (prevents high-speed fly-away).
  * **Elevons hold a gentle climbing bank** (`1560us` pitch, `1540us` roll) to glide the plane into a calm circular descent onto grass.
