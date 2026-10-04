# 🛒 SuperWing 5G: Complete Bill of Materials (BOM) & Buying Guide

This document lists all exact hardware components, specifications, estimated pricing in Indian Rupees (INR), and where to purchase them.

---

## 📋 Complete Hardware Components List

| Category | Component Name & Exact Spec | Qty | Estimated Cost (INR) | Recommended Brands / Source |
| :--- | :--- | :--- | :--- | :--- |
| **Airframe** | **EPP Delta Flying Wing Frame** (800mm - 1000mm wingspan) | 1 | ₹3,500 – ₹4,800 | Sonicmodell AR Wing Pro / Hee Wing / Robu.in / QuadStore |
| **Finish / Skin** | **3D Carbon Fiber Vinyl Wrap** (Twill Weave, 127cm x 30cm) | 1 roll | ₹249 – ₹350 | Amazon India / Car accessories shop |
| **Microcontroller** | **ESP32 Super Mini (ESP32-C3 Dev Board)** | 1 | ₹280 – ₹380 | Robu.in / Amazon / ElectronicsComp |
| **Gyro / IMU** | **MPU-6050 6-Axis Gyroscope & Accelerometer** | 1 | ₹150 – ₹220 | Robu.in / ElectronicsComp |
| **Propulsion Motor** | **2207 Brushless Motor (1800KV – 2450KV)** | 1 | ₹1,100 – ₹1,500 | Emax ECO II / FlashHobby / ReadyToSky |
| **Motor ESC** | **40A Brushless ESC (2-4S LiPo with 5V BEC)** | 1 | ₹650 – ₹900 | Hobbywing Skywalker 40A / Flycolor |
| **Propeller** | **6x4E or 5x5 Pusher Propeller** (Glass Nylon) | 2 sets | ₹120 – ₹180 | Gemfan / HQProp / Robu.in |
| **Servos** | **MG90S 9g Metal Gear Micro Servos** | 2 | ₹320 – ₹420 (for 2) | TowerPro MG90S / Robu.in |
| **Pushrods** | **1.2mm Steel Pushrod Linkage with Clevises** | 2 | ₹90 – ₹150 | Local hobby store / Robu.in |
| **Battery Pack** | **4S 18650 Li-Ion Pack (14.8V 3000mAh – 3500mAh, 30A)** | 1 | ₹1,200 – ₹1,800 | 4x Molicel P28A / Samsung 30Q (Robu / Zbattery) |
| **Connectors** | **XT60 Female Plug + 18AWG Silicone Wires** | 1 set | ₹99 – ₹150 | Robu.in / Amazon |
| **5G Edge Node** | **Samsung Galaxy S21 FE 5G** (Phone Camera + 5G SIM) | 1 | Existing Device | Own Phone |
| **3D Printed Parts** | S21 FE Nose Cradle + 2207 Motor Mount | 2 | ₹0 (DIY 3D Print) | STLs in `hardware/models/` |
| **TOTAL** | | | **~ ₹7,750 – ₹10,500** | *(Full Long-Range BVLOS Flying Wing)* |

---

## 🛠️ Tools & Consumables Required
1. **Medium CA Glue (Cyanoacrylate) + Kicker/Activator:** To glue EPP foam sections together.
2. **Hair Dryer or Heat Gun (Low setting):** To heat-shrink the 3D Carbon Fiber Vinyl Wrap smoothly across wing curves.
3. **Soldering Iron & Solder Wire (60W):** To solder motor bullets and battery XT60 plug.
4. **M3 Screws (8mm length):** 4x to bolt the brushless motor to the rear 3D printed mount.

---

## ⚡ Battery Architecture for 60+ Minutes Flight
* Do **NOT** use heavy LiPo racing packs for long-range cruising!
* Use **Li-Ion 18650 or 21700 cells** in a **4S1P configuration** (4 cells in series):
  * **Voltage:** 14.8V nominal (16.8V fully charged).
  * **Capacity:** 3000mAh (with 4x Molicel P28A or Samsung 30Q cells).
  * **Cruising Current:** At 70 km/h, this wing only pulls **3.5A to 4.2A** of current!
  * **Total Flight Time:** `3000mAh / 4000mA = ~0.75 - 1.2 Hours` (**45 to 75 minutes of non-stop 5G BVLOS flight!**).
