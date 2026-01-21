#include <ArduinoJson.h>

// pins
#define ULTRASONIC_TRIG     13
#define ULTRASONIC_ECHO     14

#define FLOATER_SAFE        25
#define FLOATER_WARNING     26
#define FLOATER_CRITICAL    27

//distances for different ranges
#define RANGE_DRY_MIN     100
#define RANGE_SAFE_MIN    50
#define RANGE_WARNING_MIN 25

//operation interval
#define readInterval        10000000 //profile interval placeholder. to be converted to actual later (5 mins i think??? so somthing like 300000000)
                                      //^this is in microseconds because of deep sleep wake timer
//ultrasonic essentials
float readUltrasonic();
void handleUltrasonic();
void printDistance(float distance);

bool ultrasonicActive = false;
bool ultrasonicVerified = false;

unsigned long lastUltrasonicAttempt = 0;
const unsigned long ultrasonicRetryInterval = 200;  // fifth of a second

//floater essentials
enum WaterRange {
  RANGE_DRY,
  RANGE_SAFE,
  RANGE_WARNING,
  RANGE_CRITICAL
};

WaterRange readFloaterRange();
void handleFloater();
void printRange(WaterRange r);

WaterRange currentFloaterRange = RANGE_DRY;

//json essentials
void printJson(float currentDistance);

void setup() {
  Serial.begin(9600);
  pinMode(ULTRASONIC_TRIG,    OUTPUT);
  pinMode(ULTRASONIC_ECHO,    INPUT);

  pinMode(FLOATER_SAFE,       INPUT);
  pinMode(FLOATER_WARNING,    INPUT);
  pinMode(FLOATER_CRITICAL,   INPUT);

  esp_sleep_enable_timer_wakeup(readInterval); //wake up esp32 from deep sleep
}

void loop() {
  unsigned long now = millis();
  handleUltrasonicFirst(now);
  if (ultrasonicVerified == true) {
    Serial.flush();
    esp_deep_sleep_start();
  }
}

//ultrasonic functions
void handleUltrasonicFirst(unsigned long now) {
  if (!ultrasonicActive) {
    ultrasonicActive = true;
    ultrasonicVerified = false;
  }

  if (ultrasonicVerified) return;
  if (now - lastUltrasonicAttempt < ultrasonicRetryInterval) return;

  lastUltrasonicAttempt = now;
  float currentDistance = readUltrasonic();
  printDistance(currentDistance);
  WaterRange currentRange = readFloaterRange();
  printRange(currentRange);

  if (currentDistance < 0) {
    Serial.println("Invalid distance reading. Retrying...");
    return;
  }

  if (!verifyDistance(currentDistance, currentRange)) {
    Serial.println("Distance does not reside within detected range. Retrying...");
    return;
  }

  ultrasonicActive = false;
  ultrasonicVerified = true;

  Serial.println("Correct reading range.");

  printJson(currentDistance, currentRange);
}

float readUltrasonic() {                      //current ultrasonic sensor is active low
  digitalWrite(ULTRASONIC_TRIG, HIGH);
  delayMicroseconds(2);
  digitalWrite(ULTRASONIC_TRIG, LOW);
  delayMicroseconds(10);
  digitalWrite(ULTRASONIC_TRIG, HIGH);

  long duration = pulseIn(ULTRASONIC_ECHO, HIGH, 30000);
  
  if (duration == 0) return -1;
  return duration * 0.034 / 2;
}

void printDistance(float distance) {
  Serial.print("Distance - ");
  Serial.println(distance);
}

//floater functions
WaterRange readFloaterRange() {
  if (digitalRead(FLOATER_CRITICAL))  return RANGE_CRITICAL;
  if (digitalRead(FLOATER_WARNING))   return RANGE_WARNING;
  if (digitalRead(FLOATER_SAFE))      return RANGE_SAFE;
  return RANGE_DRY;
}

bool verifyDistance(float currentDistance, WaterRange currentRange) {
  if (currentDistance < 0) return false;

  switch (currentRange) {
    case RANGE_DRY:
      return currentDistance >= RANGE_DRY_MIN;

    case RANGE_SAFE:
      return currentDistance >= RANGE_SAFE_MIN && currentDistance < RANGE_DRY_MIN;

    case RANGE_WARNING:
      return currentDistance >= RANGE_WARNING_MIN && currentDistance < RANGE_SAFE_MIN;

    case RANGE_CRITICAL:
      return currentDistance < RANGE_WARNING_MIN;
  }
  return false;
}

void printRange(WaterRange r) {
  if (r == RANGE_DRY)           Serial.println("Range detected is > 100 cm (DRY)");
  else if (r == RANGE_SAFE)     Serial.println("Range detected is 50–100 cm (SAFE)");
  else if (r == RANGE_WARNING)  Serial.println("Range detected is 25–50 cm (WARNING)");
  else if (r == RANGE_CRITICAL) Serial.println("Range detected is < 25 cm (CRITICAL)");
}

//json functions
void printJson(float currentDistance, WaterRange currentRange) {
  JsonDocument jDoc;
  jDoc["distance"] = currentDistance;
  jDoc["range"] = currentRange;
  
  serializeJsonPretty(jDoc, Serial);
  Serial.println();
}