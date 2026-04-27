#include <WiFi.h>
#include <ESPmDNS.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <RTClib.h>
#include <WiFiManager.h>

// --- Pin Definitions ---
#define ULTRASONIC_TRIG     13
#define ULTRASONIC_ECHO     14
#define FLOATER_SAFE        27
#define FLOATER_WARNING     26
#define FLOATER_CRITICAL    25
#define MODEM_TX            17
#define MODEM_RX            16
#define MODEM_PWRKEY        4
// --- Hardware Constants ---
#define SENSOR_HEIGHT_INCHES 144.0
#define SENSOR_HEIGHT_CM 365.76 

// --- Global Objects ---
WiFiClient espClient;
PubSubClient client(espClient);
RTC_DS3231 rtc;


// --- MQTT & Network State ---
IPAddress mqttIP;
const int mqtt_port = 1883;
const char* mqtt_topic = "sensor/hulo/reading";
const char* settings_topic = "system/settings";
const char* sms_command_topic = "sms/command";
const char* esp_health_topic = "system/status/esp32";

// --- MAIN ACTIVE VARIABLES ---
float threshold_normal_ft = 9.0, threshold_attention_ft = 9.5, threshold_critical_ft = 10.0;
int reading_interval_min = 5;
bool settingsReceived = false, contactsReceived = false, gsmReady = false;
String lastAlertRange = "";

struct Contact { 
    String phone;
    String alertLevel; 
};
Contact contacts[20];
int contactCount = 0;

float distcm = 270;
float temp_threshold_normal_ft = 6.5, temp_threshold_attention_ft = 8.0, temp_threshold_critical_ft = 9.5;
int temp_reading_interval_min = 5;
bool newSettingsAvailable = false;
String pending_settings_msg = "";
String last_applied_settings_msg = ""; 

Contact temp_contacts[20];
int temp_contactCount = 0;
bool newContactsAvailable = false;
String pending_contacts_msg = "";
String last_applied_contacts_msg = ""; 

// --- PERSISTENT FAULT TOLERANCE COUNTERS (Moved to Global) ---
int consecutive_bad = 0; 
int consecutive_good = 0;
String ultraStatus = "OK"; 

// Linear Regression History
#define MAX_HISTORY 30
long history_time[MAX_HISTORY];
float history_level[MAX_HISTORY];
int history_count = 0, history_index = 0;

// ---------- WiFi Priority Logic ----------
void connectToPriorityNetwork() {
    struct Network { const char* ssid;
    const char* pass; };
    Network list[] = {
        {"winderu", "I<3tarub1234"},
        {"asdfgh", "bingeeatingkuno123"},
        {"River-Monitor", "thesis2026"},
        {"bruv", "12345qtq"},
        {"hellnahv", "secretnoclue"}
    };
    Serial.println("\n--- WiFi Connection Phase ---");
    for (int i = 0; i < 3; i++) {
        WiFi.disconnect();
        delay(100);
        Serial.printf("Attempting [%d/3]: %s\n", i+1, list[i].ssid);
        WiFi.begin(list[i].ssid, list[i].pass);
        int retry = 0;
        while (WiFi.status() != WL_CONNECTED && retry < 10) {
            delay(500);
            Serial.print(".");
            retry++;
        }
        if (WiFi.status() == WL_CONNECTED) {
            Serial.printf("\n✅ WiFi Connected! IP: %s\n", WiFi.localIP().toString().c_str());
            return;
        }
        Serial.println("\n❌ Network not found.");
    }
    WiFiManager wm;
    if(!wm.startConfigPortal("Hulo-Sensor-Setup", "hulo2026")) {
        delay(3000); ESP.restart();
    }
}

// ---------- NEW OPTIMIZED GSM HELPERS (A7670E) ----------
String getCommandResponse(String cmd, int waitTime = 1000) {
    while(Serial2.available()) Serial2.read(); 
    if (cmd != "") Serial2.println(cmd);
    
    String response = "";
    unsigned long start = millis();
    while (millis() - start < waitTime) {
        while (Serial2.available()) {
            response += (char)Serial2.read();
        }
    }
    return response;
}

void sendBulkSMS(String text, String targetLevel) {
    if (!gsmReady) return;
    Serial.println("\n--- Starting Bulk SMS Dispatch for: " + targetLevel + " ---");
    
    Serial2.println("AT+CMGF=1"); 
    delay(500);
    for (int i = 0; i < contactCount; i++) {
        if (contacts[i].phone == "") continue;

        if (!contacts[i].alertLevel.equalsIgnoreCase("ALL") && !contacts[i].alertLevel.equalsIgnoreCase(targetLevel)) {
            continue; 
        }

        Serial.print("Sending to [" + contacts[i].phone + "]... ");
        
        Serial2.print("AT+CMGS=\""); 
        Serial2.print(contacts[i].phone); 
        Serial2.println("\"");
        
        unsigned long waitStart = millis();
        bool promptReceived = false;
        
        while(millis() - waitStart < 5000) { 
            if(Serial2.available()) {
                if(Serial2.read() == '>') {
                    promptReceived = true;
                    break;
                }
            }
        }

        if (promptReceived) {
            Serial2.print(text);
            delay(100);
            Serial2.write(26); 
            
            String confirm = getCommandResponse("", 5000);
            if (confirm.indexOf("+CMGS") != -1 || confirm.indexOf("OK") != -1) {
                Serial.println("✅ Sent.");
            } else {
                Serial.println("❌ Network Timeout.");
            }
        } else {
            Serial.println("❌ Modem Prompt Failed.");
        }
        
        delay(1500);
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
    delay(20000); 
    
    getCommandResponse("ATE0", 1000);

    String cmgfRes = getCommandResponse("AT+CMGF=1", 1000);
    if (cmgfRes.indexOf("OK") != -1 || cmgfRes != "") {
        gsmReady = true;
        Serial.println("✅ GSM Modem Ready and Text Mode set.");
    } else {
        Serial.println("⚠️ Warning: Modem initialization check incomplete, but continuing.");
        gsmReady = true;
    }
}

// ---------- Logic & Prediction ----------
void addToHistory(float lvl) {
    if (rtc.begin()) {
        history_time[history_index] = rtc.now().unixtime();
        history_level[history_index] = lvl;
        history_index = (history_index + 1) % MAX_HISTORY;
        if (history_count < MAX_HISTORY) history_count++;
    }
}

float predictLevel() {
    if (history_count < 2) return (history_count == 1) ? history_level[0] : 0.0;
    double sumX=0, sumY=0, sumXY=0, sumX2=0;
    for(int i=0; i<history_count; i++) {
        double x = (double)(history_time[i] - history_time[0]);
        sumX += x; sumY += history_level[i]; sumXY += x * history_level[i]; sumX2 += x*x;
    }
    double slope = (history_count * sumXY - sumX * sumY) / (history_count * sumX2 - sumX * sumX);
    double intercept = (sumY - slope * sumX) / history_count;
    return (float)(intercept + slope * ((rtc.now().unixtime() + 300) - history_time[0]));
}

// ---------- MQTT Callback ----------
void callback(char* topic, byte* payload, unsigned int length) {
    String msg;
    for (int i = 0; i < length; i++) msg += (char)payload[i];

    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, msg);
    if (error) {
        Serial.print("❌ JSON Parse Failed: ");
        Serial.println(error.f_str());
        return;
    }

    if (String(topic) == settings_topic) {
        temp_threshold_normal_ft = doc["threshold_normal"] | temp_threshold_normal_ft;
        temp_threshold_attention_ft = doc["threshold_attention"] | temp_threshold_attention_ft;
        temp_threshold_critical_ft = doc["threshold_critical"] | temp_threshold_critical_ft;
        temp_reading_interval_min = doc["reading_interval"] | temp_reading_interval_min;
        
        pending_settings_msg = msg;
        settingsReceived = true;
        newSettingsAvailable = true; 
    } 
    else if (String(topic) == "contacts/list") {
        JsonArray arr = doc.as<JsonArray>();
        temp_contactCount = 0;
        for (JsonObject obj : arr) {
            if (temp_contactCount < 20) {
                temp_contacts[temp_contactCount++] = {obj["phone"].as<String>(), obj["alertLevel"].as<String>()};
            }
        }
        pending_contacts_msg = msg;
        contactsReceived = true;
        newContactsAvailable = true;
    }
    else if (String(topic) == sms_command_topic) {
        String targetPhone = doc["phone"].as<String>();
        String alertMsg = doc["message"].as<String>();
        
        Serial.println("\n📥 Received Manual SMS Command for Single Contact");
        Serial.println("Sending to: " + targetPhone);
        
        // Direct single-send logic
        Serial2.println("AT+CMGF=1");
        delay(500);
        Serial2.print("AT+CMGS=\""); 
        Serial2.print(targetPhone); 
        Serial2.println("\"");
        
        delay(1000);
        Serial2.print(alertMsg);
        delay(100);
        Serial2.write(26); // Ctrl+Z to send
        
        Serial.println("✅ Manual SMS dispatched.");
    }
}

// ---------- Setup ----------
void setup() {
    Serial.begin(115200);
    delay (2000);
    digitalWrite(ULTRASONIC_TRIG, HIGH);
    pinMode(ULTRASONIC_TRIG, OUTPUT); pinMode(ULTRASONIC_ECHO, INPUT);
    pinMode(FLOATER_SAFE, INPUT_PULLUP); pinMode(FLOATER_WARNING, INPUT_PULLUP); pinMode(FLOATER_CRITICAL, INPUT_PULLUP);
    delay(200);
    
    Wire.begin();
    if (!rtc.begin()) Serial.println("RTC Failed!");

    initGSM();
    connectToPriorityNetwork();
    
    Serial.println("\n--- Locating Raspberry Pi (rivermonitoring.local) ---");
    MDNS.begin("esp32-node");
    bool found = false;
    for (int i = 0; i < 10; i++) {
        mqttIP = MDNS.queryHost("rivermonitoring");
        if (mqttIP.toString() != "0.0.0.0") {
            Serial.println("✅ FOUND PI: " + mqttIP.toString());
            found = true; break;
        }
        delay(1000); Serial.print("?");
    }

    if (!found) {
        mqttIP = WiFi.gatewayIP();
        Serial.println("\n⚠️ mDNS failed. Defaulting to Gateway: " + mqttIP.toString());
    }

    client.setServer(mqttIP, mqtt_port);
    client.setCallback(callback);
    client.setBufferSize(1024);

    // --- SETUP-TIME SENSOR SANITY CHECK ---
    Serial.println("\n--- Performing Initial Sensor Sanity Check ---");
    float duration = 0;
    int attempts = 0;
    while (duration == 0 && attempts < 5) {
        digitalWrite(ULTRASONIC_TRIG, HIGH); delayMicroseconds(2);
        digitalWrite(ULTRASONIC_TRIG, LOW);  delayMicroseconds(20);
        digitalWrite(ULTRASONIC_TRIG, HIGH);
        duration = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);
        if (duration == 0) delay(50);
        attempts++;
    }
    
    float dist = (duration * 0.034 / 2) / 2.54; 
    float elev_ft = abs(SENSOR_HEIGHT_INCHES - dist) / 12.0;
    bool isWeird = (dist > 0 && dist < 8.0) || (dist > SENSOR_HEIGHT_INCHES + 10.0) || (elev_ft < 2.0);

    if (duration == 0 || isWeird) {
        consecutive_bad = 2;  // Pre-seed an immediate error state
        consecutive_good = 0;
        ultraStatus = "ERROR";
        Serial.println("⚠️ SETUP SANITY CHECK FAILED: Ultrasonic sensor reporting abnormalities.");
    } else {
        consecutive_good = 2; // Pre-seed an immediate OK state
        consecutive_bad = 0;
        ultraStatus = "OK";
        Serial.println("✅ SETUP SANITY CHECK PASSED: Ultrasonic sensor normal.");
    }

    // --- RE-ESTABLISH CONNECTION IF LOST ---
    if (!client.connected()) {
        Serial.println("Reconnecting to MQTT...");
        client.connect("HuloESP32"); 
    }
    
    // Process background MQTT traffic to keep the connection from dropping again
    client.loop(); 

    // --- IMMEDIATELY PUBLISH BOOT-UP HEALTH STATUS ---
    Serial.println("Connecting to MQTT to broadcast boot-up health...");
    if (client.connected()) {
        client.subscribe(settings_topic);
        client.subscribe("contacts/list");
        client.subscribe(sms_command_topic);
        
        StaticJsonDocument<128> healthDoc;
        healthDoc["online"] = true;
        healthDoc["ultrasonic"] = ultraStatus;
        healthDoc["float"] = "OK"; 
        
        char healthBuf[128];
        serializeJson(healthDoc, healthBuf);
        client.publish(esp_health_topic, healthBuf);
        Serial.println("📤 Initial Health Status pushed to Dashboard.");
    } else {
        Serial.println("⚠️ Still could not connect to MQTT at setup. Will retry in main loop.");
    }
    Serial.println("--- Setup Complete ---\n");
}

// ---------- Loop ----------
void loop() {
    if (!client.connected()) {
        if (client.connect("HuloESP32")) {
            client.subscribe(settings_topic);
            client.subscribe("contacts/list");
            client.subscribe(sms_command_topic);
        } else { delay(5000); return; }
    }
    
    client.loop();
    if (!settingsReceived || !contactsReceived) {
        static unsigned long lastWaitMsg = 0;
        if(millis() - lastWaitMsg > 5000) {
            Serial.println("Waiting for Sync from Dashboard...");
            lastWaitMsg = millis();
        }
        return;
    }

    static unsigned long lastSample = 0;
    static unsigned long lastPublish = 0;
    static unsigned long lastTick = 0;
    static bool forcePublish = true; 
    
    const unsigned long SAMPLE_INTERVAL = 5000; 

    unsigned long publish_interval_ms = reading_interval_min * 2000UL;

    if (millis() - lastTick > 1000 && !forcePublish && lastPublish != 0) {
        long secondsLeft = (publish_interval_ms - (millis() - lastPublish)) / 1000;
        if (secondsLeft > 0 && secondsLeft % 10 == 0) { 
            Serial.print("⏳ Next data publish in: ");
            Serial.print(secondsLeft);
            Serial.println(" seconds... (Probing continuously in background) ");
        }
        lastTick = millis();
    }

    if (millis() - lastSample > SAMPLE_INTERVAL || lastSample == 0) {
        
        if (newSettingsAvailable) {
            if (pending_settings_msg != last_applied_settings_msg) {
                Serial.println("📥 Applied New Message [" + String(settings_topic) + "] Payload: " + pending_settings_msg);
                last_applied_settings_msg = pending_settings_msg;
            }
            threshold_normal_ft = temp_threshold_normal_ft;
            threshold_attention_ft = temp_threshold_attention_ft;
            threshold_critical_ft = temp_threshold_critical_ft;
            reading_interval_min = temp_reading_interval_min;
            publish_interval_ms = reading_interval_min * 2000UL; 
            newSettingsAvailable = false;
        }
        
        if (newContactsAvailable) {
            if (pending_contacts_msg != last_applied_contacts_msg) {
                Serial.println("📥 Applied New Message [contacts/list] Payload: " + pending_contacts_msg);
                last_applied_contacts_msg = pending_contacts_msg;
            }
            for(int i=0; i<temp_contactCount; i++) {
                contacts[i] = temp_contacts[i];
            }
            contactCount = temp_contactCount;
            newContactsAvailable = false;
        }

        float duration = 0;
        int attempts = 0;
        while (duration == 0 && attempts < 3) {
            digitalWrite(ULTRASONIC_TRIG, HIGH);
            delayMicroseconds(2);
            digitalWrite(ULTRASONIC_TRIG, LOW);  delayMicroseconds(20);
            digitalWrite(ULTRASONIC_TRIG, HIGH);
            duration = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);
            if (duration == 0) {
                delay(50);
            }
            attempts++;
        }
        
        // --- 1. CALCULATE DISTANCE FIRST ---
        distcm = (duration * 0.034 / 2);
        float dist = distcm / 2.54; 
        float elev_ft = abs(SENSOR_HEIGHT_INCHES - dist) / 12.0;
        //probe distance to water
        // --- 2. EVALUATE PROBE HEALTH ---
        bool isWeird = (dist > 0 && dist < 8.0) || (dist > SENSOR_HEIGHT_INCHES + 10.0) || (elev_ft < 2.0);

        // --- 3. TWO-WAY HYSTERESIS (3 Bad to Error, 3 Good to Recover) ---
        if (duration == 0 || isWeird) {
            consecutive_good = 0;           
            consecutive_bad++;              
            if (consecutive_bad >= 2) {
                ultraStatus = "ERROR";      
            }
        } else {
            consecutive_bad = 0;            
            consecutive_good++;             
            if (consecutive_good >= 2) {
                ultraStatus = "OK";         
            }
        }
        
        // --- 4. PUBLISH HEALTH ---
        StaticJsonDocument<128> healthDoc;
        healthDoc["online"] = true;
        healthDoc["ultrasonic"] = ultraStatus;
        healthDoc["float"] = "OK"; 
        
        char healthBuf[128];
        serializeJson(healthDoc, healthBuf);
        client.publish(esp_health_topic, healthBuf);

        // --- VALIDATION --- 
        bool s = !digitalRead(FLOATER_SAFE);
        bool w = !digitalRead(FLOATER_WARNING);
        bool c = !digitalRead(FLOATER_CRITICAL);

        bool valid_range = (elev_ft >= 2.0 && elev_ft < threshold_normal_ft);
        bool float_match_threshold = (s == (elev_ft >= threshold_normal_ft)) &&
                        (w == (elev_ft >= threshold_attention_ft)) &&
                        (c == (elev_ft >= threshold_critical_ft));
        
        bool validated = (ultraStatus == "OK") && (valid_range || float_match_threshold);

        String cleanRange = (elev_ft >= threshold_critical_ft) ? "CRITICAL" :
                            (elev_ft >= threshold_attention_ft) ? "WARNING" : "SAFE";

        String range = (elev_ft >= threshold_critical_ft) ? "🔴 CRITICAL" :
                       (elev_ft >= threshold_attention_ft) ? "🟠 WARNING" : "🟢 SAFE";
        
        if (validated == true) {
            if (forcePublish || millis() - lastPublish > publish_interval_ms || lastPublish == 0) {
                
                DateTime now = rtc.now();
                char dateBuf[11]; 
                char timeBuf[9];  
                sprintf(dateBuf, "%04d-%02d-%02d", now.year(), now.month(), now.day());
                sprintf(timeBuf, "%02d:%02d:%02d", now.hour(), now.minute(), now.second());
                
                addToHistory(elev_ft);
                float rounded_elev = round(elev_ft * 100.0) / 100.0;
                
                // --- CLAMP PREDICTED LEVEL BETWEEN 1.5 AND 12.0 ---
                float raw_pred = predictLevel();
                if (raw_pred < 1.5) raw_pred = 1.5;
                if (raw_pred > 12.0) raw_pred = 12.0;
                float rounded_pred = round(raw_pred * 100.0) / 100.0;

                JsonDocument doc;
                doc["elevation"] = rounded_elev;
                doc["distance"] = rounded_elev;
                doc["range"] = range;
                doc["predicted"] = rounded_pred;
                doc["date"] = dateBuf;
                doc["time"] = timeBuf; 
                
                char buffer[256];
                serializeJson(doc, buffer);
                
                Serial.print("📡 Sending Sensor Reading: ");
                Serial.println(buffer);
                client.publish(mqtt_topic, buffer);
                Serial.println(distcm);
                String emoji = "";
                if (cleanRange != lastAlertRange && cleanRange != "SAFE") {
                    if (range == "CRITICAL")        { emoji = "🔴";}
                    else if (range == "WARNING")    { emoji = "🟠";}
                    String alertMsg = 
                        "===Hulo River Level Alert===\n" + emoji + range + "!\nLevel: " + String(elev_ft, 2) + "ft.";
                    sendBulkSMS(alertMsg, cleanRange);
                    lastAlertRange = cleanRange;
                } else {
                    Serial.println("range unchanged, no message sent.");
                }
                
                lastPublish = millis();
                forcePublish = false; 
                Serial.println("✅ Data published. Waiting for next interval...");
            } 
        }
        else {
            Serial.println("❌ Validation Error: Reading suppressed.");
            Serial.println("dist Streak (Bad/Good): " + String(consecutive_bad) + "/" + String(consecutive_good) + " | Status: " + ultraStatus +
             " | elev_ft: " + String(elev_ft) + " | distcm: "+distcm+" | Floaters: s = " + s + " w = " + w + " c = " + c);
            
            forcePublish = true; 
            Serial.println("⚠️ Flagged for immediate publish upon next valid reading.");
        }
        
        lastSample = millis();
    }
}