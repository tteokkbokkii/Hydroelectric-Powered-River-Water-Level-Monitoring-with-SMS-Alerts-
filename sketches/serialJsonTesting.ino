#include <ArduinoJson.h>

void setup() {
  Serial.begin(9600);
}

void loop() {
  int distance = 25;
  String range = "WARNING";
  
  if (Serial.read() == 'a') {
    JsonDocument jDoc;
    jDoc["distance"] = distance;
    jDoc["range"] = range;

    serializeJsonPretty(jDoc, Serial);
    Serial.println();
  }
}
