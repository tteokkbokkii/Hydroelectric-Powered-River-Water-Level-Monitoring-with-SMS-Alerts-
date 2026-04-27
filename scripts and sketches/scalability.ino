#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// --- Your Original Pins ---
const int trigPin = 4;
const int echoPin = 19;

// --- Network Configs ---
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "192.168.x.x"; // Your Raspberry Pi IP

// --- SCALABILITY SETTING ---
// Change "hulo" to "hsr" or "station3" for additional sensors
const char* mqtt_topic = "sensor/hulo/reading"; 

WiFiClient espClient;
PubSubClient client(espClient);

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Use a unique ID based on the topic name for stability
    if (client.connect("RiverNode_Main")) {
      Serial.println("connected");
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      delay(5000);
    }
  }
}

void setup() {
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  Serial.begin(115200);

  setup_wifi();
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  // --- Your Core Logic ---
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000);
  float distanceCm = duration * 0.034 / 2;

  if (duration == 0) {
    Serial.println("No signal");
  } else {
    // Convert cm to feet for the Scalability Dashboard
    float distanceFt = distanceCm / 30.48;

    // Create JSON Payload for the Wildcard Bridge
    StaticJsonDocument<200> doc;
    doc["distance"] = round(distanceFt * 100.0) / 100.0;
    doc["range"] = (distanceFt > 9.5) ? "CRITICAL" : "NORMAL";

    char buffer[256];
    serializeJson(doc, buffer);

    // Publish to the scalability bridge
    client.publish(mqtt_topic, buffer);
    Serial.print("Sent to topic [");
    Serial.print(mqtt_topic);
    Serial.print("]: ");
    Serial.println(buffer);
  }

  delay(2000); // 2-second interval
}