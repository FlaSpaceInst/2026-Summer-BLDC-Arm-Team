#include "src/DRV8825.h"
#include "src/commands.h"

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

// =====================================================

// Switch if either motor is rotating the wrong way
#define DIR_SHOULDER true
#define DIR_ELBOW true

// extruder 1 (arm shoulder)
#define E0_STEP_PIN 26
#define E0_DIR_PIN 28
#define E0_ENABLE_PIN 24

// extruder 2 (arm elbow)
#define E1_STEP_PIN 36
#define E1_DIR_PIN 34
#define E1_ENABLE_PIN 30

// arm shoulder: E0
DRV8825 armShoulder(E0_STEP_PIN, E0_DIR_PIN, E0_ENABLE_PIN, STEPS_PER_REV);

// arm elbow: E1
DRV8825 armElbow(E1_STEP_PIN, E1_DIR_PIN, E1_ENABLE_PIN, STEPS_PER_REV);

// global checker for halted
int halt = 0;

byte last_command = STOP;

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
}

// checks for commands being sent over the Serial port to the arduino/Ramps board
void read_serial() {
  if (Serial.available()) {
    
    last_command = Serial.read();

    switch (last_command) {
      case STOP:
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        break;
      
      case ARM_FWD_ELBOW:
        armElbow.set_direction(DIR_ELBOW);
        armElbow.set_speed(ARM_SPD);
        break;
      
      case ARM_REV_ELBOW:
        armElbow.set_direction(!DIR_ELBOW);
        armElbow.set_speed(ARM_SPD);
        break;
      
      case ARM_STOP_ELBOW:
        armElbow.set_speed(0);
        break;

      case ARM_FWD_SHOULDER:
        armShoulder.set_direction(DIR_SHOULDER);
        armShoulder.set_speed(ARM_SPD);
        break;

      case ARM_REV_SHOULDER:
        armShoulder.set_direction(!DIR_SHOULDER);
        armShoulder.set_speed(ARM_SPD);
        break;

      case ARM_STOP_SHOULDER:
        armShoulder.set_speed(0);
        break;

      case ARM_FWD_BOTH:
        armShoulder.set_direction(DIR_SHOULDER);
        armShoulder.set_speed(ARM_SPD);
        armElbow.set_direction(DIR_ELBOW);
        armElbow.set_speed(ARM_SPD);
        break;

      case ARM_REV_BOTH:
        armShoulder.set_direction(!DIR_SHOULDER);
        armShoulder.set_speed(ARM_SPD);
        armElbow.set_direction(!DIR_ELBOW);
        armElbow.set_speed(ARM_SPD);
        break;

      case ARM_STOP_BOTH:
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        break;

      case ARM_STOP_ALL:
        //armBase.set_speed(0);
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        // Also stops effector
        break;

      case HALT:
        halt = 1;
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        break;

      // All of these are handled fully by other arduinos
      case FWD:
      case REV:
      case LEFT:
      case RIGHT:
      case ARM_OPEN_EFFECTOR:
      case ARM_CLOSE_EFFECTOR:
      case ARM_STOP_EFFECTOR:
      case ARM_ROTATE_CW:
      case ARM_ROTATE_CCW:
      case ARM_STOP_ROTATE:
        break;

      default:
        digitalWrite(LED_BUILTIN, LOW);
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        break;
    }
  }
}
