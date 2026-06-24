#include "DRV8825.h"
// Autonomous Movement Version - Moves in a Square or Circle Pattern
// For RAMPS 1.4

// ============ MICROSTEPPING CONFIGURATION ============
#define MICROSTEP_MODE 32
#define STEPS_PER_REV (200 * MICROSTEP_MODE)
// =====================================================

// ============ SPEED & MOVEMENT CONFIG ============
#define MOVE_SPEED 60          // RPM for movement
#define TURN_SPEED 40          // RPM for turning (slower for accuracy)

// ============ PATTERN CONFIGURATION ============
// Set to 1 for SQUARE pattern, 0 for CIRCLE pattern
#define PATTERN_SQUARE 1

// Square pattern timing (in milliseconds)
#define FORWARD_TIME 15000      // Time to move forward (adjust for side length)
#define TURN_TIME 5000         // Time to turn 90 degrees (adjust for your rover)

// Circle pattern - differential speeds for curved path
#define CIRCLE_INNER_SPEED 30  // Inner wheel speed (slower)
#define CIRCLE_OUTER_SPEED 90  // Outer wheel speed (faster)
// =====================================================

// Motor pins for RAMPS 1.4
#define X_STEP_PIN 54
#define X_DIR_PIN 55
#define X_ENABLE_PIN 38

#define Y_STEP_PIN 60
#define Y_DIR_PIN 61
#define Y_ENABLE_PIN 56

#define Z_STEP_PIN 46
#define Z_DIR_PIN 48
#define Z_ENABLE_PIN 62

#define E0_STEP_PIN 26
#define E0_DIR_PIN 28
#define E0_ENABLE_PIN 24

#define E1_STEP_PIN 36
#define E1_DIR_PIN 34
#define E1_ENABLE_PIN 30

/* Wheel positions:
    E1 = Front Left
    E0 = Back Left
    Y = Front Right
    X = Back Right
*/

DRV8825 backRight(X_STEP_PIN, X_DIR_PIN, X_ENABLE_PIN, STEPS_PER_REV);
DRV8825 frontRight(Y_STEP_PIN, Y_DIR_PIN, Y_ENABLE_PIN, STEPS_PER_REV);
DRV8825 frontLeft(E1_STEP_PIN, E1_DIR_PIN, E1_ENABLE_PIN, STEPS_PER_REV);
DRV8825 backLeft(E0_STEP_PIN, E0_DIR_PIN, E0_ENABLE_PIN, STEPS_PER_REV);

// State machine for square pattern
enum SquareState {
  MOVE_FORWARD,
  TURN_RIGHT,
  STOPPED
};

SquareState currentState = MOVE_FORWARD;
unsigned long stateStartTime = 0;
int sideCount = 0;  // Count completed sides of the square

void setup() {
  Serial.begin(115200);
  Serial.println("Autonomous Movement Starting...");
  
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // Initialize all motors
  frontRight.set_enabled(true);
  frontRight.set_direction(false);
  frontRight.set_speed(0);

  backRight.set_enabled(true);
  backRight.set_direction(false);
  backRight.set_speed(0);

  frontLeft.set_enabled(true);
  frontLeft.set_direction(false);
  frontLeft.set_speed(0);

  backLeft.set_enabled(true);
  backLeft.set_direction(false);
  backLeft.set_speed(0);

  // Wait 2 seconds before starting movement
  delay(2000);
  Serial.println("Starting autonomous movement!");
  
  stateStartTime = millis();
  
#if PATTERN_SQUARE
  Serial.println("Pattern: SQUARE");
  startForward();
#else
  Serial.println("Pattern: CIRCLE");
  startCircle();
#endif
}

void loop() {
  // Update all motors (required for stepping)
  update_motors();

#if PATTERN_SQUARE
  // Square pattern state machine
  runSquarePattern();
#else
  // Circle pattern runs continuously - nothing extra needed
  // Motors are already set to differential speeds in setup
#endif
}

// ============ MOTOR UPDATE ============
void update_motors() {
  backRight.update();
  frontRight.update();
  backLeft.update();
  frontLeft.update();
}

// ============ MOVEMENT FUNCTIONS ============

// Move forward - left wheels forward (true), right wheels forward (false)
void startForward() {
  Serial.println("Moving FORWARD");
  digitalWrite(LED_BUILTIN, HIGH);
  
  // Left side - direction true = forward
  frontLeft.set_direction(true);
  backLeft.set_direction(true);
  frontLeft.set_speed(MOVE_SPEED);
  backLeft.set_speed(MOVE_SPEED);
  
  // Right side - direction false = forward
  frontRight.set_direction(false);
  backRight.set_direction(false);
  frontRight.set_speed(MOVE_SPEED);
  backRight.set_speed(MOVE_SPEED);
}

// Turn right in place - left wheels forward, right wheels backward
void startTurnRight() {
  Serial.println("Turning RIGHT");
  digitalWrite(LED_BUILTIN, LOW);
  
  // Left side - forward
  frontLeft.set_direction(true);
  backLeft.set_direction(true);
  frontLeft.set_speed(TURN_SPEED);
  backLeft.set_speed(TURN_SPEED);
  
  // Right side - backward (opposite direction)
  frontRight.set_direction(true);
  backRight.set_direction(true);
  frontRight.set_speed(TURN_SPEED);
  backRight.set_speed(TURN_SPEED);
}

// Turn left in place - right wheels forward, left wheels backward
void startTurnLeft() {
  Serial.println("Turning LEFT");
  digitalWrite(LED_BUILTIN, LOW);
  
  // Left side - backward
  frontLeft.set_direction(false);
  backLeft.set_direction(false);
  frontLeft.set_speed(TURN_SPEED);
  backLeft.set_speed(TURN_SPEED);
  
  // Right side - forward
  frontRight.set_direction(false);
  backRight.set_direction(false);
  frontRight.set_speed(TURN_SPEED);
  backRight.set_speed(TURN_SPEED);
}

// Stop all motors
void stopMotors() {
  Serial.println("STOPPED");
  frontLeft.set_speed(0);
  backLeft.set_speed(0);
  frontRight.set_speed(0);
  backRight.set_speed(0);
}

// Circle pattern - drive in a continuous circle using differential steering
void startCircle() {
  Serial.println("Moving in CIRCLE");
  digitalWrite(LED_BUILTIN, HIGH);
  
  // Left side goes faster (outer wheel)
  frontLeft.set_direction(true);
  backLeft.set_direction(true);
  frontLeft.set_speed(CIRCLE_OUTER_SPEED);
  backLeft.set_speed(CIRCLE_OUTER_SPEED);
  
  // Right side goes slower (inner wheel)
  frontRight.set_direction(false);
  backRight.set_direction(false);
  frontRight.set_speed(CIRCLE_INNER_SPEED);
  backRight.set_speed(CIRCLE_INNER_SPEED);
}

// ============ SQUARE PATTERN STATE MACHINE ============
void runSquarePattern() {
  unsigned long currentTime = millis();
  unsigned long elapsedTime = currentTime - stateStartTime;
  
  switch (currentState) {
    case MOVE_FORWARD:
      if (elapsedTime >= FORWARD_TIME) {
        // Done moving forward, start turning
        currentState = TURN_RIGHT;
        stateStartTime = currentTime;
        startTurnRight();
      }
      break;
      
    case TURN_RIGHT:
      if (elapsedTime >= TURN_TIME) {
        // Done turning, increment side count
        sideCount++;
        Serial.print("Completed side ");
        Serial.println(sideCount);
        
        // Start moving forward again (continuous square)
        currentState = MOVE_FORWARD;
        stateStartTime = currentTime;
        startForward();
        
        // Optional: Stop after completing one full square (4 sides)
        // Uncomment the following to stop after one square:
        /*
        if (sideCount >= 4) {
          currentState = STOPPED;
          stopMotors();
          Serial.println("Square complete!");
        }
        */
      }
      break;
      
    case STOPPED:
      // Do nothing - motors are stopped
      break;
  }
}
