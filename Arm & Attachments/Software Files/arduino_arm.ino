#include "DRV8825.h"
// For RAMPS 1.4

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

// ================= ARM SPEED CONFIG ==================

// effectorSpd: speed (RPM) of opening/closing end effector
#define EFFECTOR_SPD 40
// effectorEase: speed (RPM) of easing the opening/closing of the end effector
#define EFFECTOR_EASE 20
// effectorTimeFull: time (ms) for effector to move at full speed when opening/closing
#define EFFECTOR_TIME_FULL 750
// effectorTimeEase: time (ms) for effector to move at eased speed when opening/closing
#define EFFECTOR_TIME_EASE 250

// armSpd: speed (RPM) of the arm shoulder & elbow
#define ARM_SPD 20

// =====================================================

// arm shoulder
#define X_STEP_PIN 54
#define X_DIR_PIN 55
#define X_ENABLE_PIN 38

// arm elbow
#define Y_STEP_PIN 60
#define Y_DIR_PIN 61
#define Y_ENABLE_PIN 56

// end effector
#define Z_STEP_PIN 46
#define Z_DIR_PIN 48
#define Z_ENABLE_PIN 62

// arm shoulder: X
DRV8825 armShoulder(X_STEP_PIN, X_DIR_PIN, X_ENABLE_PIN, STEPS_PER_REV);

// arm elbow: Y
DRV8825 armElbow(Y_STEP_PIN, Y_DIR_PIN, Y_ENABLE_PIN, STEPS_PER_REV);

// end effector: Z
DRV8825 endEffector(Z_STEP_PIN, Z_DIR_PIN, Z_ENABLE_PIN, STEPS_PER_REV);

// global checkers for starting or stopping
int on = 0;
int stop = 0;

// Command signal hex ids
enum COMMANDS {
  STOP = 0x00, // stops wheels
  FWD = 0x01, // drive forward
  REV = 0x02, // drive backwards
  LEFT = 0x03, // turn left
  RIGHT = 0x04, // turn right
  HALT = 0xff, // seems unused
  FRONT = 0x05, // seems unused
  BACK = 0x06, // seems unused
  RAISE = 0X07, // seems unused
  LOWER = 0X08, // seems unused

  // 2026 Team's Additions
  OPEN_EFFECTOR = 0x09, // start opening end effector
  CLOSE_EFFECTOR = 0x0A, // start closing end effector
  STOP_EFFECTOR = 0x0B, // forcibly stops the opening/closing of end effector
  ARM_ROTATE_CW = 0x0C, // rotates base clockwise
  ARM_ROTATE_CCW = 0x0D, // rotates base counterclockwise
  ARM_STOP_ROTATE = 0x0E, // stops base rotation
  ARM_FWD_SHOULDER = 0x0F, // rotates shoulder forwards
  ARM_REV_SHOULDER = 0x10, // rotates shoulder backwards
  ARM_STOP_SHOULDER = 0x11, // stops shoulder rotation
  ARM_FWD_ELBOW = 0x12, // rotates elbow forwards
  ARM_REV_ELBOW = 0x13, // rotates elbow backwards
  ARM_STOP_ELBOW = 0x14, // stops elbow rotation
  ARM_FWD_BOTH = 0x15, // rotates shoulder & elbow forwards
  ARM_REV_BOTH = 0x16, // rotates shoulder & elbow backwards
  ARM_STOP_BOTH = 0x17, // stops shoulder & elbow rotation
  ARM_STOP_ALL = 0x18 // stops effector, base, shoulder, & elbow
};

byte last_command = STOP;

long last_command_time = 0;   // ms since last command
long command_timeout = 1000;  // ms to wait for next command before stopping

long time = millis();
long timeout = 0;
long time1 = 0;

// Set to current time to activate the end effector, or current time minus EFFECTOR_TIME_FULL and EFFECTOR_TIME_EASE to force stop
long timeEffectorStart = time - EFFECTOR_TIME_FULL - EFFECTOR_TIME_EASE;

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

  // end effector initial
  endEffector.set_enabled(true);
  endEffector.set_direction(false);
  endEffector.set_speed(0);
}

// Adjust effector speed based on time since start of movement
void checkEffectorEasing() {
  if (endEffector.get_enabled()) {
    if (time1 - timeEffectorStart < EFFECTOR_TIME_FULL) {
      endEffector.set_speed(EFFECTOR_SPD);
    } else if (time1 - timeEffectorStart < EFFECTOR_TIME_FULL + EFFECTOR_TIME_EASE) {
      endEffector.set_speed(EFFECTOR_EASE);
    } else {
      endEffector.set_speed(0);
    }
  }
}
