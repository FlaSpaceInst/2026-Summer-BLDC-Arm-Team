#include "DRV8825.h"
#include "commands.h"

// ============ MICROSTEPPING CONFIGURATION ============
// Change this value to match your physical jumper configuration:
//   32 = 1/32 microstepping (all 3 jumpers installed) - smoother, slower, less torque
//   16 = 1/16 microstepping (MS1 + MS2 jumpers)
//    8 = 1/8  microstepping (MS1 + MS3 jumpers)
//    4 = 1/4  microstepping (only MS2 jumper) - choppier, faster, MORE TORQUE
//    2 = 1/2  microstepping (only MS1 jumper)
//    1 = full step (no jumpers)
#define MICROSTEP_MODE 32
#define STEPS_PER_REV (200 * MICROSTEP_MODE)  // 200 = standard 1.8° stepper
// =====================================================

// ============ SPEED & ACCELERATION CONFIG ============
// armSpd: speed (RPM) of the arm shoulder & elbow
#define ARM_SPD 20 
// baseSpd: speed (RPM) of the arm base
#define BASE_SPD 20

// =====================================================

// Switch if either motor is rotating the wrong way
#define DIR_SHOULDER true
#define DIR_ELBOW true
#define DIR_BASE false

// extruder 1 (arm shoulder)
#define E0_STEP_PIN 26
#define E0_DIR_PIN 28
#define E0_ENABLE_PIN 24

// extruder 2 (arm elbow)
#define Y_STEP_PIN 60
#define Y_DIR_PIN 61
#define Y_ENABLE_PIN 56

// Z driver (arm base)
#define Z_STEP_PIN 46
#define Z_DIR_PIN 48
#define Z_ENABLE_PIN 62

// arm shoulder: E0
DRV8825 armShoulder(E0_STEP_PIN, E0_DIR_PIN, E0_ENABLE_PIN, STEPS_PER_REV);

// arm elbow: E1
DRV8825 armElbow(Y_STEP_PIN, Y_DIR_PIN, Y_ENABLE_PIN, STEPS_PER_REV);

// arm base: Z
DRV8825 armBase(Z_STEP_PIN, Z_DIR_PIN, Z_ENABLE_PIN, STEPS_PER_REV);

// global checker for halted
int halt = 0;

byte last_command = STOP;
long shoulderSpeedRpm = ARM_SPD;
long forearmSpeedRpm = ARM_SPD;
long baseSpeedRpm = BASE_SPD;
bool shoulderMoving = false;
bool forearmMoving = false;
bool baseMoving = false;

void setShoulderSpeedLevel(int level) {
  shoulderSpeedRpm = max(1L, (long)(ARM_SPD * level / 3));
  if (shoulderMoving) {
    armShoulder.set_speed(shoulderSpeedRpm);
  }
}

void setForearmSpeedLevel(int level) {
  forearmSpeedRpm = max(1L, (long)(ARM_SPD * level / 3));
  if (forearmMoving) {
    armElbow.set_speed(forearmSpeedRpm);
  }
}

void setBaseSpeedLevel(int level) {
  baseSpeedRpm = max(1L, (long)(BASE_SPD * level / 3));
  if (baseMoving) {
    armBase.set_speed(baseSpeedRpm);
  }
}

void setup() {

  // use USB on serial 115200
  // I think this actually just activates the serial with a bitrate of 115200? - Lucas
  Serial.begin(115200);


  // set up the LED for ability to see if recieving commands
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // arm shoulder/elbow initial
  armShoulder.set_enabled(true);
  armShoulder.set_direction(false);
  armShoulder.set_speed(0);

  armElbow.set_enabled(true);
  armElbow.set_direction(false);
  armElbow.set_speed(0);

  armBase.set_enabled(true);
  armBase.set_direction(false);
  armBase.set_speed(0);
}

void loop() {
  if (halt==0) {
    read_serial();
  }

  update_motors();
}

// updates the motors
void update_motors() {
  armShoulder.update();
  armElbow.update();
  armBase.update();
}

// checks for commands being sent over the Serial port to the arduino/Ramps board
void read_serial() {
  if (Serial.available()) {
    
    last_command = Serial.read();

    switch (last_command) {
      case SHOULDER_SPEED_SLOW:
        setShoulderSpeedLevel(1);
        break;
      case SHOULDER_SPEED_MEDIUM:
        setShoulderSpeedLevel(2);
        break;
      case SHOULDER_SPEED_FAST:
        setShoulderSpeedLevel(3);
        break;
      case FOREARM_SPEED_SLOW:
        setForearmSpeedLevel(1);
        break;
      case FOREARM_SPEED_MEDIUM:
        setForearmSpeedLevel(2);
        break;
      case FOREARM_SPEED_FAST:
        setForearmSpeedLevel(3);
        break;
      case BASE_SPEED_SLOW:
        setBaseSpeedLevel(1);
        break;
      case BASE_SPEED_MEDIUM:
        setBaseSpeedLevel(2);
        break;
      case BASE_SPEED_FAST:
        setBaseSpeedLevel(3);
        break;
      case STOP:
        shoulderMoving = false;
        forearmMoving = false;
        baseMoving = false;
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        armBase.set_speed(0);
        break;
      
      case ARM_FWD_ELBOW:
        forearmMoving = true;
        armElbow.set_direction(DIR_ELBOW);
        armElbow.set_speed(forearmSpeedRpm);
        break;
      
      case ARM_REV_ELBOW:
        forearmMoving = true;
        armElbow.set_direction(!DIR_ELBOW);
        armElbow.set_speed(forearmSpeedRpm);
        break;
      
      case ARM_STOP_ELBOW:
        forearmMoving = false;
        armElbow.set_speed(0);
        break;

      case ARM_FWD_SHOULDER:
        shoulderMoving = true;
        armShoulder.set_direction(DIR_SHOULDER);
        armShoulder.set_speed(shoulderSpeedRpm);
        break;

      case ARM_REV_SHOULDER:
        shoulderMoving = true;
        armShoulder.set_direction(!DIR_SHOULDER);
        armShoulder.set_speed(shoulderSpeedRpm);
        break;

      case ARM_STOP_SHOULDER:
        shoulderMoving = false;
        armShoulder.set_speed(0);
        break;

      case ARM_FWD_BOTH:
        shoulderMoving = true;
        forearmMoving = true;
        armShoulder.set_direction(DIR_SHOULDER);
        armShoulder.set_speed(shoulderSpeedRpm);
        armElbow.set_direction(DIR_ELBOW);
        armElbow.set_speed(forearmSpeedRpm);
        break;

      case ARM_REV_BOTH:
        shoulderMoving = true;
        forearmMoving = true;
        armShoulder.set_direction(!DIR_SHOULDER);
        armShoulder.set_speed(shoulderSpeedRpm);
        armElbow.set_direction(!DIR_ELBOW);
        armElbow.set_speed(forearmSpeedRpm);
        break;

      case ARM_STOP_BOTH:
        shoulderMoving = false;
        forearmMoving = false;
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        break;

      case ARM_ROTATE_CW:
        baseMoving = true;
        armBase.set_direction(DIR_BASE);
        armBase.set_speed(baseSpeedRpm);
        break;

      case ARM_ROTATE_CCW:
        baseMoving = true;
        armBase.set_direction(!DIR_BASE);
        armBase.set_speed(baseSpeedRpm);
        break;

      case ARM_STOP_ROTATE:
        baseMoving = false;
        armBase.set_speed(0);
        break;

      case ARM_STOP_ALL:
        shoulderMoving = false;
        forearmMoving = false;
        baseMoving = false;
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        armBase.set_speed(0);
        break;

      case HALT:
        shoulderMoving = false;
        forearmMoving = false;
        baseMoving = false;
        halt = 1;
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        armBase.set_speed(0);
        break;

      // All of these are handled fully by other arduinos
      case FWD:
      case REV:
      case LEFT:
      case RIGHT:
      case ARM_OPEN_EFFECTOR:
      case ARM_CLOSE_EFFECTOR:
      case ARM_STOP_EFFECTOR:
        break;

      default:
        shoulderMoving = false;
        forearmMoving = false;
        baseMoving = false;
        digitalWrite(LED_BUILTIN, LOW);
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        armBase.set_speed(0);
        break;
    }
  }
}
