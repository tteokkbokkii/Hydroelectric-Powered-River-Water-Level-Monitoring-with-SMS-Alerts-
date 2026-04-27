#define ULTRASONIC_TRIG     13
#define ULTRASONIC_ECHO     14
#define ULTRASONIC_INTERVAL 1000UL

float readUltrasonic();
void handleUltrasonic(unsigned long now);
void printDistance(float distance);

unsigned long lastReadTime = 0;

void setup() {
  Serial.begin(9600);
  pinMode(ULTRASONIC_TRIG, OUTPUT);
  pinMode(ULTRASONIC_ECHO, INPUT);
}

void loop() {
  unsigned long now = millis();
  handleUltrasonic(now);
}

void handleUltrasonic(unsigned long now) {
  if (now - lastReadTime >= ULTRASONIC_INTERVAL) {
    lastReadTime = now;
    float currentDistance = readUltrasonic();
    printDistance(currentDistance);
  }
}

float readUltrasonic() {
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