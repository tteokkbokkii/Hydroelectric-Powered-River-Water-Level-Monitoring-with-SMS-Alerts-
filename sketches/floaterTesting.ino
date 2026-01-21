#define FLOATER_SAFE      25
#define FLOATER_WARNING   26
#define FLOATER_CRITICAL  27
#define readInterval      500UL

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
unsigned long lastReadTime = 0;

void setup() {
  Serial.begin(9600);
  pinMode(FLOATER_SAFE,     INPUT);
  pinMode(FLOATER_WARNING,  INPUT);
  pinMode(FLOATER_CRITICAL, INPUT);
}

void loop() {
  unsigned long now = millis();
  if (now - lastReadTime >= readInterval) {
    lastReadTime = now;
    handleFloater();
  }
}

void handleFloater() {
  Serial.print("Range of water level ");
  currentFloaterRange = readFloaterRange();
  printRange(currentFloaterRange);
  
}

WaterRange readFloaterRange() {
  if (digitalRead(FLOATER_CRITICAL))  return RANGE_CRITICAL;
  if (digitalRead(FLOATER_WARNING))   return RANGE_WARNING;
  if (digitalRead(FLOATER_SAFE))      return RANGE_SAFE;
  return RANGE_DRY;
}

void printRange(WaterRange r) {
  if (r == RANGE_DRY)           Serial.println(">= 100 cm (DRY)");
  else if (r == RANGE_SAFE)     Serial.println("50–100 cm");
  else if (r == RANGE_WARNING)  Serial.println("25–50 cm");
  else if (r == RANGE_CRITICAL) Serial.println("< 25 cm");
}