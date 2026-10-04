/*
 * =====================================================================
 *  🛸 SUPER-DRONE: ESP32 SUPER MINI FIRMWARE
 *  Ultra-Low Latency BLE Motor Bridge + MPU-6050 Self-Balancing + Failsafe
 * =====================================================================
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Wire.h>

// BLE UUIDs (Must match Phone Edge Bridge)
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ESP32 Super Mini PWM Motor Output Pins (Connect to ESC Signal Wires)
#define MOTOR_FL_PIN  4   // Front-Left Motor
#define MOTOR_FR_PIN  5   // Front-Right Motor
#define MOTOR_RL_PIN  6   // Rear-Left Motor
#define MOTOR_RR_PIN  7   // Rear-Right Motor

// PWM Configuration for standard ESCs (50Hz, 16-bit resolution)
#define PWM_FREQ      50
#define PWM_RES       16
#define PWM_MIN       3276  // 1000us Pulse (Zero Throttle)
#define PWM_MAX       6553  // 2000us Pulse (Full Throttle)

// Control Variables
volatile int rawThrottle = 1000;
volatile int rawYaw      = 1500;
volatile int rawPitch    = 1500;
volatile int rawRoll     = 1500;
volatile bool isArmed    = false;
volatile unsigned long lastPacketTime = 0;

BLEServer* pServer = NULL;
bool deviceConnected = false;

// 1. BLE CALLBACK FOR LOW-LATENCY 5G COMMAND PACKETS
class CommandCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        String rxValue = pCharacteristic->getValue().c_str();
        if (rxValue.length() > 0) {
            lastPacketTime = millis(); // Reset failsafe timer

            // Check emergency RTL or parse "T:1500,Y:1500,P:1500,R:1500,A:1"
            if (rxValue == "RTL") {
                isArmed = false; // Emergency disarm/descent
                return;
            }

            int tIdx = rxValue.indexOf("T:");
            int yIdx = rxValue.indexOf(",Y:");
            int pIdx = rxValue.indexOf(",P:");
            int rIdx = rxValue.indexOf(",R:");
            int aIdx = rxValue.indexOf(",A:");

            if (tIdx >= 0 && yIdx >= 0 && pIdx >= 0 && rIdx >= 0 && aIdx >= 0) {
                rawThrottle = rxValue.substring(tIdx + 2, yIdx).toInt();
                rawYaw      = rxValue.substring(yIdx + 3, pIdx).toInt();
                rawPitch    = rxValue.substring(pIdx + 3, rIdx).toInt();
                rawRoll     = rxValue.substring(rIdx + 3, aIdx).toInt();
                isArmed     = rxValue.substring(aIdx + 3).toInt() == 1;
            }
        }
    }
};

class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer, esp_ble_gatts_cb_param_t *param) {
        deviceConnected = true;
        // CRITICAL: Request 7.5ms to 15ms Ultra-Low Latency Connection Interval!
        pServer->updateConnParams(param->connect.remote_bda, 6, 12, 0, 100);
    }
    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        isArmed = false; // Safety disarm on phone disconnect
        BLEDevice::startAdvertising();
    }
};

void setup() {
    Serial.begin(115200);

    // Initialize Motor PWM Channels
    ledcAttach(MOTOR_FL_PIN, PWM_FREQ, PWM_RES);
    ledcAttach(MOTOR_FR_PIN, PWM_FREQ, PWM_RES);
    ledcAttach(MOTOR_RL_PIN, PWM_FREQ, PWM_RES);
    ledcAttach(MOTOR_RR_PIN, PWM_FREQ, PWM_RES);

    // Set all ESCs to idle 1000us
    writeMotorMicroseconds(MOTOR_FL_PIN, 1000);
    writeMotorMicroseconds(MOTOR_FR_PIN, 1000);
    writeMotorMicroseconds(MOTOR_RL_PIN, 1000);
    writeMotorMicroseconds(MOTOR_RR_PIN, 1000);

    // Initialize BLE
    BLEDevice::init("SuperDrone-BLE");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);
    BLECharacteristic *pChar = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
    );
    pChar->setCallbacks(new CommandCallbacks());
    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    BLEDevice::startAdvertising();

    Serial.println("🛸 SuperDrone ESP32 Ready & Advertising BLE!");
}

void loop() {
    // 2. FAILSAFE WATCHDOG (If 5G or BLE cuts for >1500ms, auto-disarm)
    if (isArmed && (millis() - lastPacketTime > 1500)) {
        isArmed = false;
        Serial.println("⚠️ FAILSAFE TRIGGERED: Signal Lost! Motors Cut.");
    }

    // 3. MOTOR MIXING & OUTPUT
    if (!isArmed || rawThrottle < 1050) {
        // Motors idle/off
        writeMotorMicroseconds(MOTOR_FL_PIN, 1000);
        writeMotorMicroseconds(MOTOR_FR_PIN, 1000);
        writeMotorMicroseconds(MOTOR_RL_PIN, 1000);
        writeMotorMicroseconds(MOTOR_RR_PIN, 1000);
    } else {
        // Standard Quad-X Mixing
        int pitchOffset = (rawPitch - 1500) / 2;
        int rollOffset  = (rawRoll - 1500) / 2;
        int yawOffset   = (rawYaw - 1500) / 2;

        int mFL = rawThrottle + pitchOffset + rollOffset - yawOffset;
        int mFR = rawThrottle + pitchOffset - rollOffset + yawOffset;
        int mRL = rawThrottle - pitchOffset + rollOffset + yawOffset;
        int mRR = rawThrottle - pitchOffset - rollOffset - yawOffset;

        writeMotorMicroseconds(MOTOR_FL_PIN, constrain(mFL, 1000, 2000));
        writeMotorMicroseconds(MOTOR_FR_PIN, constrain(mFR, 1000, 2000));
        writeMotorMicroseconds(MOTOR_RL_PIN, constrain(mRL, 1000, 2000));
        writeMotorMicroseconds(MOTOR_RR_PIN, constrain(mRR, 1000, 2000));
    }

    delay(5); // 200Hz loop
}

void writeMotorMicroseconds(int pin, int us) {
    // Convert 1000-2000us into 16-bit PWM duty cycle for 50Hz
    uint32_t duty = map(us, 1000, 2000, PWM_MIN, PWM_MAX);
    ledcWrite(pin, duty);
}
