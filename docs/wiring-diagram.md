# ⚡ SUPER-DRONE: Hardware Pinout & Wiring Diagram

This document explains the physical electrical connections between the **ESP32 Super Mini**, **MPU-6050 IMU**, **4-in-1 ESC / Motors**, and the **Samsung S21 FE Motherboard**.

---

## 1. Overall Power Architecture

```
[ 4S Li-ion Battery (14.8V - 16.8V) ]
     │
     ├───► [ 4-in-1 ESC Power Terminals (BAT+ / GND) ] ──► [ 4x BLDC Motors ]
     │
     └───► [ 5V 3A DC-DC Buck Converter (BEC) ]
                 │
                 ├───► ESP32 Super Mini (5V Pin & GND)
                 └───► Samsung Motherboard (USB-C 5V / GND)
```

---

## 2. ESP32 Super Mini Pinout Connections

| ESP32 Super Mini Pin | Connected To | Wire Color (Standard) | Notes |
| :--- | :--- | :--- | :--- |
| **5V** | 5V Output from BEC / ESC | Red | Powers the ESP32 |
| **GND** | Common Ground (ESC GND) | Black | Common reference ground |
| **GPIO 4** | ESC Signal 1 (Front-Left) | White / Yellow | PWM Motor Control |
| **GPIO 5** | ESC Signal 2 (Front-Right) | White / Yellow | PWM Motor Control |
| **GPIO 6** | ESC Signal 3 (Rear-Left) | White / Yellow | PWM Motor Control |
| **GPIO 7** | ESC Signal 4 (Rear-Right) | White / Yellow | PWM Motor Control |
| **GPIO 8 (SDA)** | MPU-6050 SDA | Blue | I2C Data (Gyroscope) |
| **GPIO 9 (SCL)** | MPU-6050 SCL | Yellow | I2C Clock (Gyroscope) |

---

## 3. Quadcopter Motor Rotation & Propeller Directions (Quad-X)

```
        Front
    (M1 ↻)   (M2 ↺)
       \       /
        \     /
         [===]   <-- Samsung S21 FE & ESP32 Center Mount
        /     \
       /       \
    (M3 ↺)   (M4 ↻)
        Rear

* M1 (Front-Left):  Clockwise (CW)
* M2 (Front-Right): Counter-Clockwise (CCW)
* M3 (Rear-Left):   Counter-Clockwise (CCW)
* M4 (Rear-Right):  Clockwise (CW)
```

---

## 4. Samsung S21 FE Motherboard Preparation Checklist

1. **Antenna Coax Wires:**
   * Do NOT cut or pull off the tiny coaxial RF cables. Fasten them along the carbon fiber arms to maintain 5G reception.
2. **Cooling / Heat Dissipation:**
   * Place a 20mm x 20mm adhesive thermal pad and a micro aluminum heatsink over the Exynos/Snapdragon SoC shield.
   * Mount the motherboard right under the propeller downdraft for active airflow cooling.
3. **Vibration Dampening:**
   * Mount both the smartphone motherboard and the ESP32 using **M2/M3 TPU rubber anti-vibration standoffs** to eliminate motor gyro noise and protect the camera OIS (Optical Image Stabilization).
