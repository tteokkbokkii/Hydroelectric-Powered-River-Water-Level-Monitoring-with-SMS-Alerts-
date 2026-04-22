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
#define FLOATER_SAFE        25
#define FLOATER_WARNING     26
#define FLOATER_CRITICAL    27
#define MODEM_TX            17
#define MODEM_RX            16
#define MODEM_PWRKEY        4


// --- Hardware Constants ---
#define SENSOR_HEIGHT_INCHES 255.0
#define FLOATER_CRITICAL_IN  32.252
#define FLOATER_WARNING_IN   82.252
#define FLOATER_SAFE_IN      134.22


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


float threshold_normal_ft = 6.5, threshold_attention_ft = 8.0, threshold_critical_ft = 9.5;
int reading_interval_min = 5;
bool settingsReceived = false, contactsReceived = false, gsmReady = false;
String lastAlertRange = "";


struct Contact { String phone; String alertLevel; };
Contact contacts[20];
int contactCount = 0;


// Linear Regression History
#define MAX_HISTORY 30
long history_time[MAX_HISTORY];
float history_level[MAX_HISTORY];
int history_count = 0, history_index = 0;


// ---------- WiFi Priority Logic ----------
void connectToPriorityNetwork() {
    struct Network { const char* ssid; const char* pass; };
   
    Network list[] = {
        {"River-Monitor", "thesis2026"},
        {"bruv", "12345qtq"},
        {"hellnahv", "secretnoclue"}
    };


    Serial.println("\n--- WiFi Connection Phase ---");
    for (int i = 0; i < 3; i++) {
        // --- ADD THESE TWO LINES HERE ---
        WiFi.disconnect();
        delay(100);
        // --------------------------------
       
        Serial.printf("Attempting [%d/3]: %s\n", i+1, list[i].ssid);
        WiFi.begin(list[i].ssid, list[i].pass);


        int retry = 0;
        while (WiFi.status() != WL_CONNECTED && retry < 20) {
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


    Serial.println("No priority networks found. Starting Setup Portal.");
    WiFiManager wm;
    if(!wm.startConfigPortal("Hulo-Sensor-Setup", "hulo2026")) {
        delay(3000); ESP.restart();
    }
}


// ---------- GSM Functions ----------
bool waitForResponse(String expected, int timeout = 5000) {
    unsigned long start = millis();
    String res;
    while (millis() - start < timeout) {
        while (Serial2.available()) {
            char c = Serial2.read();
            res += c;
            if (res.endsWith(expected)) return true;
        }
    }
    return false;
}


bool sendSMS(String number, String text) {
    if (!gsmReady) return false;
    Serial2.println("AT+CMGF=1");
    waitForResponse("OK");
    Serial2.print("AT+CMGS=\""); Serial2.print(number); Serial2.println("\"");
    if (!waitForResponse(">")) return false;
    Serial2.print(text); Serial2.write(26);
    return waitForResponse("+CMGS:", 10000);
}


void initGSM() {
    Serial2.begin(115200, SERIAL_8N1, MODEM_RX, MODEM_TX);
    pinMode(MODEM_PWRKEY, OUTPUT);
    digitalWrite(MODEM_PWRKEY, LOW); delay(1200); digitalWrite(MODEM_PWRKEY, HIGH);
    delay(5000);
    Serial2.println("AT");
    if (waitForResponse("OK", 2000)) {
        gsmReady = true;
        Serial.println("GSM Modem Ready.");
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
    String msg; for (int i=0; i<length; i++) msg += (char)payload[i];
    JsonDocument doc; deserializeJson(doc, msg);
    if (String(topic) == settings_topic) {
        threshold_normal_ft = doc["threshold_normal"] | threshold_normal_ft;
        threshold_attention_ft = doc["threshold_attention"] | threshold_attention_ft;
        threshold_critical_ft = doc["threshold_critical"] | threshold_critical_ft;
        reading_interval_min = doc["reading_interval"] | reading_interval_min;
        settingsReceived = true;
    } else if (String(topic) == "contacts/list") {
        JsonArray arr = doc.as<JsonArray>(); contactCount = 0;
        for (JsonObject obj : arr) {
            if (contactCount < 20) {
                contacts[contactCount++] = {obj["phone"].as<String>(), obj["alertLevel"].as<String>()};
            }
        }
        contactsReceived = true;
    }
}


// ---------- Setup ----------
void setup() {
    Serial.begin(115200);
    pinMode(ULTRASONIC_TRIG, OUTPUT); pinMode(ULTRASONIC_ECHO, INPUT);
    pinMode(FLOATER_SAFE, INPUT_PULLUP); pinMode(FLOATER_WARNING, INPUT_PULLUP); pinMode(FLOATER_CRITICAL, INPUT_PULLUP);
   
    Wire.begin();
    if (!rtc.begin()) Serial.println("RTC Failed!");
    initGSM();


    // 1. Connect WiFi
    connectToPriorityNetwork();


    // 2. Locate Raspberry Pi (mDNS rivermonitoring.local)
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
            Serial.println("Waiting for Sync from Dashboard..."); lastWaitMsg = millis();
        }
        return;
    }


    static unsigned long lastReading = 0;
    if (millis() - lastReading > (reading_interval_min * 60000) || lastReading == 0) {
        digitalWrite(ULTRASONIC_TRIG, LOW); delayMicroseconds(2);
        digitalWrite(ULTRASONIC_TRIG, HIGH); delayMicroseconds(10);
        digitalWrite(ULTRASONIC_TRIG, LOW);
       
        float duration = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);
        float dist = (duration * 0.034 / 2) / 2.54;


        bool s = digitalRead(FLOATER_SAFE) == LOW;
        bool w = digitalRead(FLOATER_WARNING) == LOW;
        bool c = digitalRead(FLOATER_CRITICAL) == LOW;


        bool validated = (s == (dist <= FLOATER_SAFE_IN)) &&
                         (w == (dist <= FLOATER_WARNING_IN)) &&
                         (c == (dist <= FLOATER_CRITICAL_IN));


        if (validated) {
            float elev_ft = (SENSOR_HEIGHT_INCHES - dist) / 12.0;
            addToHistory(elev_ft);
           
            String range = (elev_ft >= threshold_critical_ft) ? "CRITICAL" :
                           (elev_ft >= threshold_attention_ft) ? "WARNING" : "SAFE";


            JsonDocument doc;
            doc["elevation"] = elev_ft;
            doc["range"] = range;
            doc["predicted"] = predictLevel();
           
            char buffer[256]; serializeJson(doc, buffer);
            client.publish(mqtt_topic, buffer);
           
            if (range != lastAlertRange && range != "SAFE") {
                for (int i=0; i<contactCount; i++) {
                   sendSMS(contacts[i].phone, "Hulo Alert: " + range + "! Level: " + String(elev_ft) + "ft.");
                }
                lastAlertRange = range;
            }
        } else {
            Serial.println("❌ Validation Error: Ultrasonic and Floaters mismatch.");
        }
        lastReading = millis();
    }
}
