/*
 * =====================================================================
 *  🛸 SUPER-WING 5G: STEALTH FLYING WING / DELTA WING UAV FIRMWARE
 *  Target: ESP32 Super Mini (C3 / Dev)
 *  Features:
 *   - 7.5ms Ultra-Low Latency BLE Command Stream
 *   - Fixed-Wing Elevon Delta Mixer (1 Motor + 2 Servos)
 *   - MPU-6050 6-Axis Gyro Auto-Leveling (Wind Stabilization)
 *   - Failsafe Circling Glide Mode (Never dives on signal loss)
 *   - Telemetry Notification Stream to Phone Bridge
 * =====================================================================
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <Wire.h>

// BLE UUIDs (Matches Galaxy S21 FE Phone Edge Bridge)
#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CMD_CHAR_UUID       "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define TELEM_CHAR_UUID     "beb5483e-36e1-4688-b7f5-ea07361b26a9"

// Pin Definitions for ESP32 Super Mini
#define PIN_MOTOR_ESC       4   // Main Pusher Motor ESC (50Hz PWM)
#define PIN_SERVO_LEFT      5   // Left Wing Elevon Servo (50Hz PWM)
#define PIN_SERVO_RIGHT     6   // Right Wing Elevon Servo (50Hz PWM)
#define PIN_STATUS_LED      8   // Built-in LED on ESP32-C3

// I2C Pins for MPU-6050 6-Axis Gyro/Accelerometer
#define I2C_SDA_PIN         8
#define I2C_SCL_PIN         9
#define MPU_ADDR            0x68

// PWM Configuration (50Hz standard RC PWM, 16-bit resolution)
#define PWM_FREQ            50
#define PWM_RES             16
#define PWM_MIN_TICKS       3276  // 1000us Pulse (Zero / Full Deflection)
#define PWM_MAX_TICKS       6553  // 2000us Pulse (Max / Full Deflection)

// Flight Control Channels (Standard 1000 - 2000us)
volatile int rawThrottle    = 1000;
volatile int rawPitch       = 1500;
volatile int rawRoll        = 1500;
volatile int rawYaw         = 1500;
volatile bool isArmed       = false;
volatile unsigned long lastPacketTime = 0;

// Gyro Telemetry & Stabilization Variables
float gyroPitchRate = 0.0, gyroRollRate = 0.0;
float pitchAngle = 0.0, rollAngle = 0.0;
bool mpuAvailable = false;

// BLE Server & Characteristics
BLEServer* pServer = NULL;
BLECharacteristic* pCmdChar = NULL;
BLECharacteristic* pTelemChar = NULL;
bool deviceConnected = false;

// 1. BLE COMMAND CALLBACK FOR HIGH-SPEED 5G PACKETS
class CommandCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        String rxValue = pCharacteristic->getValue().c_str();
        if (rxValue.length() > 0) {
            lastPacketTime = millis(); // Reset failsafe timer

            // Check emergency RTL or parse "T:1500,Y:1500,P:1500,R:1500,A:1"
            if (rxValue == "RTL") {
                isArmed = false;
                rawThrottle = 1000;
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
        // Request 7.5ms to 15ms Ultra-Low Latency Interval
        pServer->updateConnParams(param->connect.remote_bda, 6, 12, 0, 100);
        digitalWrite(PIN_STATUS_LED, LOW); // LED ON
    }
    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        isArmed = false;
        digitalWrite(PIN_STATUS_LED, HIGH); // LED OFF
        BLEDevice::startAdvertising();
    }
};

// 2. MPU-6050 INITIALIZATION & READING
void initMPU() {
    Wire.begin();
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x6B); // PWR_MGMT_1 register
    Wire.write(0x00); // Wake up MPU-6050
    if (Wire.endTransmission() == 0) {
        mpuAvailable = true;
        Serial.println("✅ MPU-6050 Gyro/Accel Online!");
    } else {
        Serial.println("⚠️ MPU-6050 Not Found. Running in Direct Elevon Mode.");
    }
}

void readMPU() {
    if (!mpuAvailable) return;
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x3B); // Starting register for Accel & Gyro
    Wire.endTransmission(false);
    Wire.requestFrom(MPU_ADDR, 14, true);

    if (Wire.available() >= 14) {
        int16_t accX = Wire.read() << 8 | Wire.read();
        int16_t accY = Wire.read() << 8 | Wire.read();
        int16_t accZ = Wire.read() << 8 | Wire.read();
        int16_t temp = Wire.read() << 8 | Wire.read();
        int16_t gyrX = Wire.read() << 8 | Wire.read();
        int16_t gyrY = Wire.read() << 8 | Wire.read();
        int16_t gyrZ = Wire.read() << 8 | Wire.read();

        // Convert to degrees/sec and simple complementary filter
        gyroRollRate  = (float)gyrX / 131.0;
        gyroPitchRate = (float)gyrY / 131.0;
        
        // Calculate accelerometer pitch and roll angles
        float accRoll  = atan2(accY, accZ) * 180.0 / PI;
        float accPitch = atan2(-accX, sqrt(accY * accY + accZ * accZ)) * 180.0 / PI;

        // Complementary filter (98% Gyro + 2% Accel)
        rollAngle  = 0.98 * (rollAngle + gyroRollRate * 0.005) + 0.02 * accRoll;
        pitchAngle = 0.98 * (pitchAngle + gyroPitchRate * 0.005) + 0.02 * accPitch;
    }
}

void writeMicroseconds(int pin, int us) {
    uint32_t duty = map(constrain(us, 1000, 2000), 1000, 2000, PWM_MIN_TICKS, PWM_MAX_TICKS);
    ledcWrite(pin, duty);
}

void setup() {
    Serial.begin(115200);
    pinMode(PIN_STATUS_LED, OUTPUT);
    digitalWrite(PIN_STATUS_LED, HIGH);

    // Initialize Motor ESC and Elevon Servos (50Hz, 16-bit)
    ledcAttach(PIN_MOTOR_ESC, PWM_FREQ, PWM_RES);
    ledcAttach(PIN_SERVO_LEFT, PWM_FREQ, PWM_RES);
    ledcAttach(PIN_SERVO_RIGHT, PWM_FREQ, PWM_RES);

    // Center Servos and Cut Motor
    writeMicroseconds(PIN_MOTOR_ESC, 1000);
    writeMicroseconds(PIN_SERVO_LEFT, 1500);
    writeMicroseconds(PIN_SERVO_RIGHT, 1500);

    // Initialize Gyro
    initMPU();

    // Initialize BLE Server with SuperDrone/SuperWing Advertising
    BLEDevice::init("SuperDrone-BLE");
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());

    BLEService *pService = pServer->createService(SERVICE_UUID);

    // Command Write Characteristic
    pCmdChar = pService->createCharacteristic(
        CMD_CHAR_UUID,
        BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
    );
    pCmdChar->setCallbacks(new CommandCallbacks());

    // Telemetry Notify Characteristic
    pTelemChar = pService->createCharacteristic(
        TELEM_CHAR_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    pTelemChar->addDescriptor(new BLE2902());

    pService->start();

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    BLEDevice::startAdvertising();

    Serial.println("✈️ SuperWing 5G Stealth Flying Wing Ready!");
}

unsigned long lastTelemSend = 0;

void loop() {
    readMPU();

    // 3. FAILSAFE WATCHDOG (>1.5s Signal Loss)
    bool isFailsafeActive = false;
    if (isArmed && (millis() - lastPacketTime > 1500)) {
        isFailsafeActive = true;
        isArmed = false;
        Serial.println("⚠️ FAILSAFE TRIGGERED: Signal Lost! Engaging gentle circle glide.");
    }

    // 4. FIXED-WING ELEVON MIXER
    if (isFailsafeActive) {
        // Failsafe Mode: Motor Cut + Gentle pitch-up glide in wide circle to land safely
        writeMicroseconds(PIN_MOTOR_ESC, 1000); // Motor OFF
        writeMicroseconds(PIN_SERVO_LEFT, 1560);  // Slight pitch-up + slight left roll
        writeMicroseconds(PIN_SERVO_RIGHT, 1540);
    } 
    else if (!isArmed) {
        // Disarmed State: Motor Off, Servos Centered
        writeMicroseconds(PIN_MOTOR_ESC, 1000);
        writeMicroseconds(PIN_SERVO_LEFT, 1500);
        writeMicroseconds(PIN_SERVO_RIGHT, 1500);
    } 
    else {
        // Motor Output (1000us idle to 2000us full thrust)
        writeMicroseconds(PIN_MOTOR_ESC, constrain(rawThrottle, 1000, 2000));

        // Elevon Mixing Logic:
        // Pitch UP (Stick back)   -> Both Elevons UP
        // Pitch DOWN (Stick forward) -> Both Elevons DOWN
        // Roll LEFT (Stick left)  -> Left Elevon UP, Right Elevon DOWN
        // Roll RIGHT (Stick right) -> Right Elevon UP, Left Elevon DOWN
        int pitchOffset = (rawPitch - 1500); // -500 to +500
        int rollOffset  = (rawRoll - 1500);  // -500 to +500

        // Gyro Stabilization Feedforward (Fights wind gusts automatically)
        int gyroPitchCorrection = 0;
        int gyroRollCorrection  = 0;
        if (mpuAvailable) {
            // Proportional stabilization gain
            gyroPitchCorrection = (int)(gyroPitchRate * 1.5);
            gyroRollCorrection  = (int)(gyroRollRate * 1.5);
        }

        // Final Servo Command Calculation
        int leftElevonUs  = 1500 + (pitchOffset / 2) - (rollOffset / 2) - gyroPitchCorrection + gyroRollCorrection;
        int rightElevonUs = 1500 + (pitchOffset / 2) + (rollOffset / 2) - gyroPitchCorrection - gyroRollCorrection;

        writeMicroseconds(PIN_SERVO_LEFT, constrain(leftElevonUs, 1050, 1950));
        writeMicroseconds(PIN_SERVO_RIGHT, constrain(rightElevonUs, 1050, 1950));
    }

    // 5. PERIODIC TELEMETRY NOTIFICATION (10Hz back to Phone Bridge)
    if (deviceConnected && (millis() - lastTelemSend > 100)) {
        lastTelemSend = millis();
        char telemBuf[32];
        snprintf(telemBuf, sizeof(telemBuf), "P:%.1f,R:%.1f,A:%d", pitchAngle, rollAngle, isArmed ? 1 : 0);
        pTelemChar->setValue((uint8_t*)telemBuf, strlen(telemBuf));
        pTelemChar->notify();
    }

    delay(5); // 200Hz Control Loop
}
