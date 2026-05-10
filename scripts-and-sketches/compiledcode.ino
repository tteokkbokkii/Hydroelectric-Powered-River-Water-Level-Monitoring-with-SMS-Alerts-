#include <WiFi.h>
#include <ESPmDNS.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <RTClib.h>
#include <WiFiManager.h>
#include <Preferences.h>
#include <esp_task_wdt.h>
#include <NewPing.h>

#define ULTRASONIC_TRIG     13
#define ULTRASONIC_ECHO     14
#define FLOATER_LOW         27
#define FLOATER_MID         26
#define FLOATER_HIGH        25
#define MODEM_TX            17
#define MODEM_RX            16
#define MODEM_PWRKEY        4

#define genbox 69
#define shallow_pontoon_diff 6.7
#define SENSOR_HEIGHT_CM 386.0
#define SENSOR_HEIGHT_INCHES (SENSOR_HEIGHT_CM / 2.54)

// --- PHYSICAL CONSTANTS (For Validation Only) ---
const float DIST_TO_HIGH_FLOAT = 75.0; // Distance down to CRITICAL float (cm)
const float DIST_TO_MID_FLOAT  = 202.0; // Distance down to WARNING float (cm)
const float DIST_TO_LOW_FLOAT  = 237.0; // Distance down to SAFE float (cm)
const float TOLERANCE          = 5.0;   // Margin of error (cm)

NewPing sonar(ULTRASONIC_TRIG, ULTRASONIC_ECHO, SENSOR_HEIGHT_CM);

WiFiClient espClient;
PubSubClient client(espClient);
RTC_DS3231 rtc;
Preferences preferences;

IPAddress mqttIP;

const int mqtt_port = 1883;
const char* mqtt_topic = "sensor/hulo/reading";
const char* settings_topic = "system/settings";
const char* sms_command_topic = "sms/command";
const char* esp_health_topic = "system/status/esp32";
const char* sms_log_topic = "sms/log";

float threshold_normal_ft = 8.0, threshold_attention_ft = 10.0, threshold_critical_ft = 12.0;
int reading_interval_min = 5;

float smaBuffer[5];
int smaIndex = 0;

float dist = SENSOR_HEIGHT_CM;
float temp_threshold_normal_ft = threshold_normal_ft;
float temp_threshold_attention_ft = threshold_attention_ft;
float temp_threshold_critical_ft = threshold_critical_ft;
int temp_reading_interval_min = reading_interval_min;

bool settingsReceived = false, contactsReceived = false, gsmReady = false;
String lastAlertRange = "";

static bool rawAlertTriggered;

struct Contact {
    String name;
    String phone;
    String alertLevel;
};
Contact contacts[20];
int contactCount = 0;

bool newSettingsAvailable = false;
String pending_settings_msg = "";
String last_applied_settings_msg = "";

Contact temp_contacts[20];
int temp_contactCount = 0;

bool newContactsAvailable = false;
String pending_contacts_msg = "";
String last_applied_contacts_msg = "";

int consecutive_bad = 0;
int consecutive_good = 0;

bool anomaly_wifi_notified = false;
bool anomaly_mqtt_notified = false;
bool anomaly_sensor_notified = false;
bool ultraAnomalySMS = false;
int consecutive_validation_fails = 0;

String ultraStatus = "OK";

#define MAX_HISTORY 30
long history_time[MAX_HISTORY];
float history_level[MAX_HISTORY];
int history_count = 0, history_index = 0;

float lastValidElev = -1.0;

void connectToPriorityNetwork(bool isLooping) {
    esp_task_wdt_delete(NULL);
    struct Network {
        const char* ssid;
        const char* pass;
    };
    Network list[] = {
        {"River-Monitor", "thesis2026"},
        {"asdfgh1", "asdfgh123"},
        {"Raspberry-Fi", "Hulo2026"},
    };
    Serial.println("\n--- WiFi Connection Phase ---");

    int totalNetworks = sizeof(list) / sizeof(list[0]);
    for (int i = 0; i < totalNetworks; i++) {
        WiFi.disconnect();
        delay(100);
        Serial.printf("Attempt [%d/%d]: %s\n", i + 1, totalNetworks, list[i].ssid);
        WiFi.begin(list[i].ssid, list[i].pass);

        int retry = 0;
        while (WiFi.status() != WL_CONNECTED && retry < 10) {
            delay(500);
            Serial.print(".");
            retry++;
        }

        if (WiFi.status() == WL_CONNECTED) {
            Serial.printf("\n✅ WiFi Connected! IP: %s\n", WiFi.localIP().toString().c_str());
            esp_task_wdt_add(NULL);
            return;
        }
        Serial.println("\n❌ Network not found.");
    }
    
    if (!isLooping) {
        WiFiManager wm;
        wm.setConfigPortalTimeout(180); // 3-minute timeout
        
        if (!wm.startConfigPortal("Hulo-Sensor-Setup", "hulo2026")) {
            Serial.println("⚠️ Setup portal timed out.");
        }
    } else {
        Serial.println("⚠️ Background reconnect failed.");
    }

    esp_task_wdt_add(NULL);
}

String getCommandResponse(uint32_t waitTime) {
    String response = "";
    response.reserve(250);

    unsigned long start = millis();
    while (millis() - start < waitTime) {
        while (Serial2.available() && response.length() < 249) {
            response += (char)Serial2.read();
        }

        if (response.length() >= 249) {
            Serial.println("⚠️ Modem response buffer full! Truncating.");
            break;
        }

        vTaskDelay(pdMS_TO_TICKS(10));
        if (client.connected()) client.loop();
    }
    return response;
}

void sendBulkSMS(String text, String targetLevel, float current_water_level) {
    if (!gsmReady) return;
    Serial.println("\n--- Starting Bulk SMS Dispatch for: " + targetLevel + " ---");
    Serial2.println("AT+CMGF=1");
    delay(500);
    for (int i = 0; i < contactCount; i++) {
        esp_task_wdt_reset();
        if (client.connected()) client.loop();

        if (contacts[i].phone == "") continue;

        if (!contacts[i].alertLevel.equalsIgnoreCase("ALL") && !contacts[i].alertLevel.equalsIgnoreCase(targetLevel)) {
            continue;
        }

        bool isSent = false;
        int retryCount = 0;
        while (!isSent && retryCount < 3) {
            if (retryCount > 0) {
                Serial.println("🔄 Retrying message to [" + contacts[i].phone + "] (Attempt " + String(retryCount + 1) + ")...");
                unsigned long retryWait = millis();
                while (millis() - retryWait < 3000) {
                    esp_task_wdt_reset();
                    if (client.connected()) client.loop();
                    delay(10);
                }
            } else {
                Serial.print("Sending to [" + contacts[i].phone + "]... ");
            }

            Serial2.print("AT+CMGS=\"");
            Serial2.print(contacts[i].phone);
            Serial2.println("\"");
            unsigned long waitStart = millis();
            bool promptReceived = false;

            while (millis() - waitStart < 5000) {
                esp_task_wdt_reset();
                if (client.connected()) client.loop();

                if (Serial2.available()) {
                    if (Serial2.read() == '>') {
                        promptReceived = true;
                        break;
                    }
                }
            }

            if (promptReceived) {
                Serial2.print(text);
                Serial2.write(26);

                unsigned long txWait = millis();
                while (millis() - txWait < 100) {
                    esp_task_wdt_reset();
                }

                String confirm = getCommandResponse(10000);
                Serial.print("Modem Reply: ");
                Serial.println(confirm);
                if (confirm.indexOf("+CMGS") != -1 || confirm.indexOf("OK") != -1) {
                    Serial.println("✅ Sent.");
                    vTaskDelay(pdMS_TO_TICKS(4000));
                    
                    JsonDocument logDoc;
                    logDoc["type"] = "ALERT";
                    logDoc["level"] = targetLevel;
                    logDoc["water_level"] = current_water_level;
                    logDoc["phone"] = contacts[i].phone;
                    logDoc["name"] = contacts[i].name;
                    logDoc["message"] = text;

                    char logBuffer[256];
                    serializeJson(logDoc, logBuffer);

                    if (client.connected()) {
                        client.publish(sms_log_topic, logBuffer);
                        Serial.println("📤 Published SMS Log to MQTT");
                    }
                    isSent = true;
                } else {
                    Serial.println("❌ Network Timeout. (Modem did not confirm)");
                    retryCount++;
                }
            } else {
                Serial.println("❌ Modem Prompt Failed.");
                retryCount++;
            }
            yield();
        }

        unsigned long nextContactWait = millis();
        while (millis() - nextContactWait < 1500) {
            esp_task_wdt_reset();
            if (client.connected()) client.loop();
            delay(10);
        }
    }
    Serial.println("--- Bulk SMS Complete ---\n");
}

void initGSM() {
    Serial2.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);

    Serial.println("\n--- Initializing A7670E Modem ---");
    pinMode(MODEM_PWRKEY, OUTPUT);
    digitalWrite(MODEM_PWRKEY, LOW);
    delay(1200);
    digitalWrite(MODEM_PWRKEY, HIGH);

    Serial.println("Waiting 20 seconds for network registration...");
    
    unsigned long gsmWait = millis();
    while (millis() - gsmWait < 20000) {
        esp_task_wdt_reset();
        delay(10);
    }

    Serial2.println("ATE0");
    getCommandResponse(1000);
    Serial2.println("AT+CMGF=1");
    String cmgfRes = getCommandResponse(1000);
    if (cmgfRes.indexOf("OK") != -1 || cmgfRes != "") {
        gsmReady = true;
        Serial.println("✅ GSM Modem Ready and Text Mode set.");
    } else {
        Serial.println("⚠️ Warning: Modem initialization check incomplete, but continuing.");
        gsmReady = true;
    }

    Serial2.println("AT+CGATT=0");
    delay(100);
    Serial2.println("AT+CGPS=0");
    delay(100);

    Serial.println("✅ GSM Power Optimizations Applied (Data & GPS Disabled).");
}

void addToHistory(float lvl) {
    static int consecutive_outliers = 0;
    if (lastValidElev != -1.0) {
        if (fabs(lvl - lastValidElev) > 3.0) {
            consecutive_outliers++;
            Serial.println("⚠️ Outlier rejected. Streak: " + String(consecutive_outliers));

            if (consecutive_outliers >= 3) {
                Serial.println("⚠️ Multiple outliers detected. Accepting as new baseline.");
                lastValidElev = lvl;
                consecutive_outliers = 0;
            } else {
                return;
            }
        } else {
            consecutive_outliers = 0;
        }
    } else {
        consecutive_outliers = 0;
    }

    lastValidElev = lvl;

    history_time[history_index] = rtc.now().unixtime();
    history_level[history_index] = lvl;

    history_index = (history_index + 1) % MAX_HISTORY;
    if (history_count < MAX_HISTORY) history_count++;

    smaBuffer[smaIndex] = lvl;
    smaIndex = (smaIndex + 1) % 5;
}

float predictLevel() {
    if (history_count < 2) return (history_count == 1) ? history_level[0] : 0.0;
    double sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (int i = 0; i < history_count; i++) {
        double x = (double)(history_time[i] - history_time[0]);
        sumX += x;
        sumY += history_level[i];
        sumXY += x * history_level[i];
        sumX2 += x * x;
    }
    double slope = (history_count * sumXY - sumX * sumY) / (history_count * sumX2 - sumX * sumX);
    double intercept = (sumY - slope * sumX) / history_count;
    long future_offset_seconds = reading_interval_min * 60;
    return (float)(intercept + slope * ((rtc.now().unixtime() + future_offset_seconds) - history_time[0]));
}

float predictHour() {
    if (history_count < 3) return predictLevel();
    double sumX = 0, sumY = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0, sumXY = 0, sumX2Y = 0;
    for (int i = 0; i < history_count; i++) {
        double x = (double)(history_time[i] - history_time[0]);
        double y = history_level[i];
        double x2 = x * x;
        sumX += x;
        sumY += y;
        sumX2 += x2;
        sumX3 += x2 * x;
        sumX4 += x2 * x2;
        sumXY += x * y;
        sumX2Y += x2 * y;
    }

    double n = history_count;
    double denom = n * (sumX2 * sumX4 - sumX3 * sumX3) - sumX * (sumX * sumX4 - sumX2 * sumX3) + sumX2 * (sumX * sumX3 - sumX2 * sumX2);
    if (denom == 0) return predictLevel();

    double a = (sumY * (sumX2 * sumX4 - sumX3 * sumX3) - sumX * (sumXY * sumX4 - sumX2Y * sumX3) + sumX2 * (sumXY * sumX3 - sumX2Y * sumX2)) / denom;
    double b = (n * (sumXY * sumX4 - sumX2Y * sumX3) - sumY * (sumX * sumX4 - sumX2 * sumX3) + sumX2 * (sumX * sumX2Y - sumX2 * sumXY)) / denom;
    double c_val = (n * (sumX2 * sumX2Y - sumX3 * sumXY) - sumX * (sumX * sumX2Y - sumX2 * sumXY) + sumY * (sumX * sumX3 - sumX2 * sumX2)) / denom;
    double target_time = (rtc.now().unixtime() + 3600) - history_time[0];
    return (float)(c_val * target_time * target_time + b * target_time + a);
}

void callback(char* topic, byte* payload, unsigned int length) {
    String msg;
    for (int i = 0; i < length; i++) msg += (char)payload[i];

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, msg);
    if (error) {
        Serial.print("❌ JSON Parse Failed: ");
        Serial.println(error.f_str());
        return;
    }

    if (String(topic) == settings_topic) {
        temp_threshold_normal_ft = doc["threshold_normal"] |
        temp_threshold_normal_ft;
        temp_threshold_attention_ft = doc["threshold_attention"] | temp_threshold_attention_ft;
        temp_threshold_critical_ft = doc["threshold_critical"] | temp_threshold_critical_ft;
        temp_reading_interval_min = doc["reading_interval"] | temp_reading_interval_min;

        pending_settings_msg = msg;
        settingsReceived = true;
        newSettingsAvailable = true;
    } else if (String(topic) == "contacts/list") {
        JsonArray arr = doc.as<JsonArray>();
        temp_contactCount = 0;
        for (JsonObject obj : arr) {
            if (temp_contactCount < 20) {
                temp_contacts[temp_contactCount++] = {
                    obj["name"].as<String>(),
                    obj["phone"].as<String>(),
                  
                    obj["alertLevel"].as<String>()
                };
            }
        }
        pending_contacts_msg = msg;
        contactsReceived = true;
        newContactsAvailable = true;
    } else if (String(topic) == sms_command_topic) {
        String targetPhone = doc["phone"].as<String>();
        String alertMsg = doc["message"].as<String>();

        Serial.println("\n📥 Received Manual SMS Command for Single Contact");
        Serial.println("Sending to: " + targetPhone);
        Serial2.println("AT+CMGF=1");
        delay(500);
        Serial2.print("AT+CMGS=\"");
        Serial2.print(targetPhone);
        Serial2.println("\"");

        delay(1000);
        Serial2.print(alertMsg);
        delay(100);
        Serial2.write(26);

        Serial.println("✅ Manual SMS dispatched.");
    }
}

//TOP-DOWN VALIDATION LOGIC
bool isSensorDataValid(float emptySpaceDistance, bool fLow, bool fMid, bool fHigh) {
    if (fHigh) {
        if (emptySpaceDistance > (DIST_TO_HIGH_FLOAT + TOLERANCE) || !fMid || !fLow) return false;
    } 
    else if (fMid) {
        if (emptySpaceDistance > (DIST_TO_MID_FLOAT + TOLERANCE) || 
            emptySpaceDistance < (DIST_TO_HIGH_FLOAT - TOLERANCE) || 
            !fLow) return false;
    } 
    else if (fLow) {
        if (emptySpaceDistance < (DIST_TO_MID_FLOAT - TOLERANCE)) return false;
    } 
    else {
        if (emptySpaceDistance < (DIST_TO_LOW_FLOAT - TOLERANCE)) return false;
    }
    return true; 
}

void setup() {
    Serial.begin(115200);
    setCpuFrequencyMhz(80);
    delay(2000);
    esp_task_wdt_deinit();
    esp_task_wdt_config_t twdt_config = {
        .timeout_ms = 30000,
        .idle_core_mask = (1 << portNUM_PROCESSORS) - 1,
        .trigger_panic = true,
    };
    esp_task_wdt_init(&twdt_config);
    esp_task_wdt_add(NULL); 

    preferences.begin("hulo_settings", false);
    threshold_normal_ft = preferences.getFloat("norm", 8.0);
    threshold_attention_ft = preferences.getFloat("attn", 10.0);
    threshold_critical_ft = preferences.getFloat("crit", 12.0);
    reading_interval_min = preferences.getInt("interval", 5);

    temp_threshold_normal_ft = threshold_normal_ft;
    temp_threshold_attention_ft = threshold_attention_ft;
    temp_threshold_critical_ft = threshold_critical_ft;
    temp_reading_interval_min = reading_interval_min;

    Serial.println("\n--- Loaded Settings from Flash Memory ---");
    Serial.println("Normal: " + String(threshold_normal_ft) + " | Attn: " + String(threshold_attention_ft) + " | Crit: " + String(threshold_critical_ft));
    String savedContacts = preferences.getString("contacts", "");
    if (savedContacts != "") {
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, savedContacts);
        if (!error) {
            JsonArray arr = doc.as<JsonArray>();
            contactCount = 0;
            for (JsonObject obj : arr) {
                if (contactCount < 20) {
                    contacts[contactCount++] = {
                        obj["name"].as<String>(),
                        obj["phone"].as<String>(),
                        obj["alertLevel"].as<String>()
                    };
                }
            }
            Serial.println("Loaded " + String(contactCount) + " contacts from Flash Memory.");
        }
    }

    pinMode(FLOATER_LOW, INPUT_PULLUP);
    pinMode(FLOATER_MID, INPUT_PULLUP);
    pinMode(FLOATER_HIGH, INPUT_PULLUP);
    delay(200);

    Wire.begin();
    if (!rtc.begin()) Serial.println("RTC Failed!");

    initGSM();
    connectToPriorityNetwork(false); // Pass false directly instead of using a global variable

    Serial.println("\n--- Locating Raspberry Pi (rivermonitoring.local) ---");
    MDNS.begin("esp32-node");
    bool found = false;
    for (int i = 0; i < 10; i++) {
        mqttIP = MDNS.queryHost("rivermonitoring");
        if (mqttIP.toString() != "0.0.0.0") {
            Serial.println("✅ FOUND PI: " + mqttIP.toString());
            found = true;
            break;
        }
        delay(1000);
        Serial.print("?");
    }

    if (!found) {
        mqttIP = WiFi.gatewayIP();
        Serial.println("\n⚠️ mDNS failed. Defaulting to Gateway: " + mqttIP.toString());
    }

    client.setServer(mqttIP, mqtt_port);
    client.setCallback(callback);
    client.setBufferSize(1024);
    client.setKeepAlive(60);
    Serial.println("\n--- Performing Initial Sensor Sanity Check ---");
    float duration = 0;
    int attempts = 0;
    while (duration == 0 && attempts < 5) {
        // ping_median(5) takes 5 rapid readings, discards the highest and lowest spikes, 
        // and averages the rest.
        // It returns the time in microseconds.
        duration = sonar.ping_median(5); 
        
        if (duration == 0) delay(50);
        attempts++;
    }

    float dist = (duration * 0.034 / 2);
    float elev_ft = ((fabs(SENSOR_HEIGHT_CM - dist)/2.54) / 12.0) + shallow_pontoon_diff;
    bool isWeird = (dist > 0 && dist < 9.0) ||
                   (dist > SENSOR_HEIGHT_CM + 10.0); // || (elev_ft < 2.0);
    if (duration == 0 || isWeird) {
        consecutive_bad = 2;
        consecutive_good = 0;
        ultraStatus = "ERROR";
        Serial.println("⚠️ SETUP SANITY CHECK FAILED: Ultrasonic sensor reporting abnormalities.");
    } else {
        consecutive_good = 2;
        consecutive_bad = 0;
        ultraStatus = "OK";
        Serial.println("✅ SETUP SANITY CHECK PASSED: Ultrasonic sensor normal.");
    }

    Serial.println("Connecting to MQTT to broadcast boot-up health...");
    int mqttretry = 0;

    while (!client.connected() && mqttretry < 3) {
        Serial.println("Reconnecting to MQTT...");
        if (client.connect("HuloESP32")) {
            Serial.println("✅ MQTT connected!");

            client.subscribe(settings_topic);
            client.subscribe("contacts/list");
            client.subscribe(sms_command_topic);
            JsonDocument healthDoc;
            healthDoc["online"] = true;
            healthDoc["ultrasonic"] = ultraStatus;
            healthDoc["float"] = "OK";

            char healthBuf[256];
            serializeJson(healthDoc, healthBuf);
            client.publish(esp_health_topic, healthBuf, true);
            Serial.println("📤 Initial Health Status pushed to Dashboard.");
            break;
        } else {
            Serial.print("❌ Failed, rc=");
            Serial.println(client.state());
            mqttretry++;
            delay(2000);
        }
    }
    Serial.println("--- Setup Complete ---\n");
}

void triggerAnomalyAlert(const char* anomalyReason) {
    if (!gsmReady) return;

    Serial.println("🚨 TRIGGERING ANOMALY SMS ALERT 🚨");
    Serial.println(anomalyReason);
    char smsBuffer[160];
    snprintf(smsBuffer, sizeof(smsBuffer),
             "System Issue: %s",
             anomalyReason);
    sendBulkSMS(smsBuffer, "ALL", lastValidElev);
}

void loop() {
    esp_task_wdt_reset();
    
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("⚠️ WiFi Disconnected! prioritizing reconnection...");
        if (!anomaly_wifi_notified) {
            triggerAnomalyAlert("WiFi Connection Lost");
            anomaly_wifi_notified = true;
        }

        while (WiFi.status() != WL_CONNECTED) {
            esp_task_wdt_reset();
            
            Serial.println("🔄 Attempting to reconnect to WiFi...");
            connectToPriorityNetwork(true); // Pass true directly instead of using a global variable
            
            if (WiFi.status() == WL_CONNECTED) {
                break;
            }

            Serial.println("❌ Reconnect failed. Retrying in 10 seconds...");
            for (int i = 0; i < 100; i++) {
                vTaskDelay(pdMS_TO_TICKS(100));
                esp_task_wdt_reset();
            }
        }

        Serial.println("✅ WiFi Restored! Resuming normal operations.");
        anomaly_wifi_notified = false;
    } 
    else {
        if (!client.connected()) {
            static int mqtt_fail_count = 0;
            static unsigned long lastMqttRetry = 0;

            if (millis() - lastMqttRetry > 5000 || lastMqttRetry == 0) {
                lastMqttRetry = millis();
                if (client.connect("HuloESP32")) {
                    mqtt_fail_count = 0;
                    if (anomaly_mqtt_notified) anomaly_mqtt_notified = false;

                    client.subscribe(settings_topic);
                    client.subscribe("contacts/list");
                    client.subscribe(sms_command_topic);
                    Serial.println("✅ MQTT Reconnected.");
                } else {
                    mqtt_fail_count++;
                    if (mqtt_fail_count >= 3 && !anomaly_mqtt_notified) {
                        triggerAnomalyAlert("MQTT Broker Unreachable.");
                        anomaly_mqtt_notified = true;
                    }
                    Serial.println("⚠️ MQTT Offline. Bypassing to maintain sensor operations...");
                }
            }
        } else {
            client.loop();
        }

        static unsigned long syncStartTime = 0;
        static bool syncTimerStarted = false;
        if (!settingsReceived || !contactsReceived) {
            if (!syncTimerStarted) {
                syncStartTime = millis();
                syncTimerStarted = true;
            }

            if (millis() - syncStartTime < 15000) {
                static unsigned long lastWaitMsg = 0;
                if (millis() - lastWaitMsg > 5000) {
                    Serial.println("Waiting for Sync from Dashboard...");
                    lastWaitMsg = millis();
                }
                return;
            } else {
                Serial.println("⚠️ Sync timeout reached. System unblocked, proceeding with Flash Memory settings.");
                settingsReceived = true;
                contactsReceived = true;
            }
        } else {
            syncTimerStarted = false;
        }

        static unsigned long lastSample = 0;
        static unsigned long lastPublish = 0;
        static unsigned long lastTick = 0;

        const unsigned long SAMPLE_INTERVAL = 5000;
        unsigned long publish_interval_ms = reading_interval_min * 60000UL;
        if (millis() - lastTick > 1000 && lastPublish != 0) {
            long elapsed = millis() - lastPublish;
            long secondsLeft = 0;
            if (publish_interval_ms >= elapsed) {
                secondsLeft = (publish_interval_ms - elapsed) / 1000;
            }

            if (secondsLeft > 0 && secondsLeft % 10 == 0) {
                Serial.print("⏳ Next data publish in: ");
                Serial.print(secondsLeft);
                Serial.println(" seconds... (Probing continuously in background)");
            }
            lastTick = millis();
        }

        if (millis() - lastSample > SAMPLE_INTERVAL || lastSample == 0) {

            if (newSettingsAvailable) {
                if (pending_settings_msg != last_applied_settings_msg) {
                    Serial.println("📥 Applied New Message [" + String(settings_topic) + "] Payload: " + pending_settings_msg);
                    last_applied_settings_msg = pending_settings_msg;

                    threshold_normal_ft = temp_threshold_normal_ft;
                    threshold_attention_ft = temp_threshold_attention_ft;
                    threshold_critical_ft = temp_threshold_critical_ft;
                    reading_interval_min = temp_reading_interval_min;
                    publish_interval_ms = reading_interval_min * 60000UL;
                    preferences.putFloat("norm", threshold_normal_ft);
                    preferences.putFloat("attn", threshold_attention_ft);
                    preferences.putFloat("crit", threshold_critical_ft);
                    preferences.putInt("interval", reading_interval_min);
                }
                newSettingsAvailable = false;
            }

            if (newContactsAvailable) {
                if (pending_contacts_msg != last_applied_contacts_msg) {
                    Serial.println("📥 Applied New Message [contacts/list] Payload: " + pending_contacts_msg);
                    last_applied_contacts_msg = pending_contacts_msg;

                    preferences.putString("contacts", pending_contacts_msg);
                }
                for (int i = 0; i < temp_contactCount; i++) {
                    contacts[i] = temp_contacts[i];
                }
                contactCount = temp_contactCount;
                newContactsAvailable = false;
            }

            float duration = 0;
            int attempts = 0;

            while (duration == 0 && attempts < 3) {
                duration = sonar.ping_median(5);
                if (duration == 0) {
                    Serial.println("⚠️ Ultrasonic read timeout! Sensor hardware error or disconnected.");
                    delay(50);
                }
                attempts++;
            }

            float dist = (duration * 0.034 / 2);
            float shallow_ft = ((fabs(SENSOR_HEIGHT_CM - dist))/2.54 / 12.0);
            float elev_ft = shallow_ft + shallow_pontoon_diff;

            if (dist > 25 && dist < genbox && !rawAlertTriggered) {
                Serial.println("⚠️ GENBOX ALERT: Water reached the Generator Box!");
                String rawMsg = "GENBOX ALERT: Water reached the Generator Box!\nWater at " + String(elev_ft, 1) + " ft.\nPlease pull the sliding frame up.";
                Serial.println(rawMsg);
                sendBulkSMS(rawMsg, "ALL", elev_ft);
                rawAlertTriggered = true;
            } else if (dist >= genbox) {
                rawAlertTriggered = false;
            }

            bool isWeird = (dist > 0 && dist < 9.0) ||
            (dist > SENSOR_HEIGHT_CM + 10.0) || (elev_ft < 0);

            if (duration == 0 || isWeird) {
                consecutive_good = 0;
                consecutive_bad++;
                if (consecutive_bad >= 2) ultraStatus = "ERROR";
            } else {
                consecutive_bad = 0;
                consecutive_good++;
                if (consecutive_good >= 2) ultraStatus = "OK";
            }

            if (ultraStatus == "ERROR" && !anomaly_sensor_notified) {
                triggerAnomalyAlert("Ultrasonic sensor dead zones.");
                anomaly_sensor_notified = true;
            } else if (ultraStatus == "OK" && anomaly_sensor_notified) {
                anomaly_sensor_notified = false;
            }

            JsonDocument healthDoc;
            healthDoc["online"] = true;
            healthDoc["ultrasonic"] = ultraStatus;
            healthDoc["float"] = "OK";

            char healthBuf[128];
            serializeJson(healthDoc, healthBuf);
            client.publish(esp_health_topic, healthBuf);

            bool s = !digitalRead(FLOATER_LOW);
            bool w = !digitalRead(FLOATER_MID);
            bool c = !digitalRead(FLOATER_HIGH);

            bool float_match_threshold = isSensorDataValid(dist, s, w, c);
            bool validated = (ultraStatus == "OK") && float_match_threshold;

            String range = (elev_ft >= threshold_critical_ft) ?
            "CRITICAL" : (elev_ft >= threshold_attention_ft) ? "WARNING" : "SAFE";

            if (validated == true) {
                consecutive_validation_fails = 0;
                if (lastPublish == 0 || millis() - lastPublish >= publish_interval_ms) {

                    DateTime now = rtc.now();
                    char dateBuf[11];
                    char timeBuf[9];
                    sprintf(dateBuf, "%04d-%02d-%02d", now.year(), now.month(), now.day());
                    sprintf(timeBuf, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());

                    addToHistory(elev_ft);
                    float rounded_elev = round(elev_ft * 100.0) / 100.0;

                    float raw_pred = predictLevel();
                    if (raw_pred < 1.5) raw_pred = 1.5;
                    if (raw_pred > threshold_critical_ft + 2) raw_pred = threshold_critical_ft + 2;
                    float rounded_pred = round(raw_pred * 100.0) / 100.0;
                    float raw_pred_hour = predictHour();
                    if (raw_pred_hour < 1.5) raw_pred_hour = 1.5;
                    if (raw_pred_hour > threshold_critical_ft + 2) raw_pred_hour = threshold_critical_ft + 2;
                    float rounded_pred_hour = round(raw_pred_hour * 100.0) / 100.0;
                    
                    JsonDocument doc;
                    doc["elevation"] = rounded_elev;
                    doc["distance"]  = rounded_elev; // Reverted: Now back to outputting rounded_elev
                    doc["range"] = range;
                    doc["predicted"] = rounded_pred;
                    doc["predicted_hour"] = rounded_pred_hour;
                    doc["date"] = dateBuf;
                    doc["time"] = timeBuf;
                    doc["shallow_ft"] = shallow_ft;

                    char buffer[256];
                    serializeJson(doc, buffer);
                    Serial.print("📡 Sending Sensor Reading: ");
                    client.publish(mqtt_topic, buffer);
                    Serial.println(buffer);
                    Serial.println(dist);

                    if (range != lastAlertRange && range != "SAFE") {
                        String alertMsg = "";
                        if (range == "CRITICAL") {
                            alertMsg = "RIVER ALERT\n"
                                       "The Hulo River level is critical.\n"
                                       "Data at " + String(now.hour()) + ":" + String(now.minute()) + ":\n"
                                       "Water Level: " + String(elev_ft, 2) + " FT\n"
                                       "Alert Interpretation: CRITICAL";
                        } else if (range == "WARNING") {
                            alertMsg = "RIVER ALERT`\n"
                                       "The Hulo River level is rising.\n"
                                       "Data at " + String(now.hour()) + ":" + String(now.minute()) + ":\n"
                                       "Water Level: " + String(elev_ft, 2) + " FT\n"
                                       "Alert Interpretation: WARNING";
                        }
                        sendBulkSMS(alertMsg, range, elev_ft);
                        lastAlertRange = range;
                    } else if (range == "SAFE") {
                        lastAlertRange = "SAFE";
                    } else {
                        Serial.println("range unchanged, no message sent.");
                    }

                    if (lastPublish == 0) {
                        lastPublish = millis();
                    } else {
                        while (millis() - lastPublish >= publish_interval_ms) {
                            lastPublish += publish_interval_ms;
                        }
                    }

                    Serial.println("✅ Data published. Rigid Schedule Updated.");
                }
            } else {
                consecutive_validation_fails++;
                if (consecutive_validation_fails >= 5 && !ultraAnomalySMS) {
                    triggerAnomalyAlert("Sensor validation mismatch.");
                    ultraAnomalySMS = true;
                }
                else{
                    ultraAnomalySMS = false;
                }
                Serial.println("❌ Validation Error.");
                Serial.println("dist Streak (Bad/Good): " + String(consecutive_bad) + "/" + String(consecutive_good) +
                               " | sensorStatus: " + ultraStatus + " | elev_ft: " + String(elev_ft) + " | dist: " + String(dist) +
                               " | Floaters: s = " + String(s) 
                               + " w = " + String(w) + " c = " + String(c) +
                               "\n | ultraStatus: "+ultraStatus+ " floatmatch: "+ String(float_match_threshold));
                Serial.println("Waiting for next interval or valid recovery.");
            }
            lastSample = millis();
        }
    }    
    vTaskDelay(pdMS_TO_TICKS(10));
}