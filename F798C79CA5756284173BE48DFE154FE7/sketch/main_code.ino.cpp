#include <Arduino.h>
#line 1 "C:\\Users\\user\\Documents\\AADESKTOP\\4y1s School shit\\thesis\\esp32\\main_code\\main_code.ino"
#include <Wire.h>
#include <RTClib.h>
#define floatergreen 27
#define floaterorange 18
#define floaterred 19
#define ledgreen 23
#define ledorange 25
#define ledred 26
#define trigPin 12
#define echoPin 35
unsigned long lastMeasureTime = 0;
const unsigned long operationInterval = 1000;                       //sets how often it should do operations in milliseconds
unsigned long duration;
int distance[5];
RTC_DS3231 rtc;
#line 16 "C:\\Users\\user\\Documents\\AADESKTOP\\4y1s School shit\\thesis\\esp32\\main_code\\main_code.ino"
void setup();
#line 34 "C:\\Users\\user\\Documents\\AADESKTOP\\4y1s School shit\\thesis\\esp32\\main_code\\main_code.ino"
void loop();
#line 16 "C:\\Users\\user\\Documents\\AADESKTOP\\4y1s School shit\\thesis\\esp32\\main_code\\main_code.ino"
void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  Wire.begin();
  rtc.begin();
  /*rtc.adjust(DateTime(F(__DATE__), F(__TIME__))); 
  DateTime now = rtc.now();                                   //uncomment when changes to rtc time is needed
  DateTime newTime = now + TimeSpan(2);  // add x seconds
  rtc.adjust(newTime);*/
  pinMode(floatergreen, INPUT);
  pinMode(floaterorange, INPUT);
  pinMode(floaterred, INPUT);
  pinMode(ledgreen, OUTPUT);
  pinMode(ledorange, OUTPUT);
  pinMode(ledred, OUTPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}
void loop() {
  for (int i = 0; i < 5; i++) { 
    digitalWrite(trigPin, LOW);                                     //start of ultrasonic sensor operation
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);                                     //end of ultrasonic sensor operation
    duration = pulseIn(echoPin, HIGH, 30000);
    distance[i] = duration * 0.034 / 2;   // Read distance in cm

    DateTime now = rtc.now();
    Serial.print(now.year());
    Serial.print('/');
    Serial.print(now.month());
    Serial.print('/');
    Serial.print(now.day());
    Serial.print(" ");
    Serial.print(now.hour());
    Serial.print(':');
    Serial.print(now.minute());
    Serial.print(':');
    Serial.print(now.second());
    Serial.print(" - ");
    Serial.print("Distance  ");
    Serial.print(i + 1);
    Serial.print(": ");
    Serial.print(distance[i]);
    Serial.println(" cm");
    delay(1000);
  }

  int maxCount = 0;
  int modeValue = distance[0];

  for (int i = 0; i < 5; i++) {
    int count = 1;

    for (int j = i + 1; j < 5; j++) {
      if (distance[i] == distance[j]) {
        count++;
      }
    }

    if (count > maxCount) {
      maxCount = count;
      modeValue = distance[i];
    }
  }
  
  Serial.println("-----------------------");
  Serial.print("Most occurring distance: ");
  Serial.print(modeValue);
  Serial.print(" cm (");
  Serial.print(maxCount);
  Serial.println(" times)");
  Serial.println("-----------------------");
  
  /*Floater Switches*/
  if (digitalRead(floatergreen)==HIGH){
    Serial.println("safe");
    digitalWrite (ledgreen, HIGH);
    if (digitalRead(floaterorange)==HIGH){
      Serial.println("warning");
      digitalWrite (ledorange, HIGH);
      if(digitalRead(floaterred)==HIGH){
        Serial.println("dangerous");
        digitalWrite(ledred, HIGH);
      }
      else {
        Serial.println("3 low");
        digitalWrite (ledred, LOW);
      }
    }
    else {
    Serial.println("2 low");
    digitalWrite (ledorange, LOW);
    digitalWrite (ledred, LOW);
    }
  }
  else {
    Serial.println("1 low");
    digitalWrite (ledgreen, LOW);
    digitalWrite (ledorange, LOW);
    digitalWrite (ledred, LOW);
  }
  delay (500);
  /**/
}

