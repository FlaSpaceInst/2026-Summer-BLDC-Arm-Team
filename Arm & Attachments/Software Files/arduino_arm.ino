#include <SimpleFOC.h>
#include "controlfoc.h"
#include "commands.h"

// ================= ARM SPEED CONFIG ==================

// effectorSpd: speed (RPM) of opening/closing end effector
#define EFFECTOR_SPD 40
// effectorEase: speed (RPM) of easing the opening/closing of the end effector
#define EFFECTOR_EASE 20
//TODO: more effector config definitions

// armSpd: speed (RPM) of the arm shoulder & elbow
#define ARM_SPD 20

// =====================================================

// switch if any motors are rotating the wrong way
#define INV_EFFECTOR false
#define INV_SHOULDER false
#define INV_ELBOW false

// motor and driver definitions
// the first 3 numbers of the driver definitions are the PWM pins those motors should be connected to
// the fourth is NOT_SET because we aren't using enable pins for the BLDCs
BLDCMotor motor_effector(POLE_PAIRS);
BLDCDriver3PWM driver_effector(10, 9, 8, NOT_SET);
BLDCMotor motor_shoulder(POLE_PAIRS);
BLDCDriver3PWM driver_shoulder(7, 6, 5, NOT_SET);
BLDCMotor motor_elbow(POLE_PAIRS);
BLDCDriver3PWM driver_elbow(4, 3, 2, NOT_SET);

// global checker for stopping
int stop = 0;

byte last_command = STOP;

long last_command_time = 0;   // ms since last command
long command_timeout = 1000;  // ms to wait for next command before stopping

long time = millis();
long timeout = 0;
long time1 = 0;

void setup() {
  // use USB on serial 115200
  // I think this actually just activates the serial with a bitrate of 115200? - Lucas
  Serial.begin(115200);
  
  /*// set up the LED for ability to see if recieving commands
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);*/

  // arm shoulder/eblow initial
  //TODO

  // end effector initial
  //TODO
}

void loop() {

  time1 = millis();

  //TODO: rearrange these calls as neccessary
  update_motors();

  read_serial();

  checkEffectorEasing();

  // call stop function if stopping
  if (stop == 1) {
    Stop();
  }
  
  // call stop function if we get stuck in a loop and it wont slow down after 2500 miliseconds
  if (timeout == 750) {
    stop = 1;
    Stop();
  }
}

// updates the motors
void update_motors() {
  //TODO: whatever is needed here
}

// checks for commands being sent over the Serial port to the arduino/Ramps board
void read_serial() {
  if (Serial.available()) {
    
    last_command = Serial.read();

    switch (last_command) {
      case STOP:
        stop = 1;
        Stop();
        break;
      //TODO: continue updating from here
      case OPEN_EFFECTOR:
        endEffector.set_direction(DIR_OPEN);
        timeEffectorStart = time1;
        break;

      case CLOSE_EFFECTOR:
        endEffector.set_direction(!DIR_OPEN);
        timeEffectorStart = time1;
        break;

      case STOP_EFFECTOR:
        timeEffectorStart = time1 - EFFECTOR_TIME_FULL - EFFECTOR_TIME_EASE;
        break;

      case ARM_FWD_ELBOW:
        armElbow.set_direction(true);
        armElbow.set_speed(ARM_SPD);
        break;
      
      case ARM_REV_ELBOW:
        armElbow.set_direction(false);
        armElbow.set_speed(ARM_SPD);
        break;
      
      case ARM_STOP_ELBOW:
        armElbow.set_speed(0);
        break;
      
      case ARM_FWD_SHOULDER:
        armShoulder.set_direction(true);
        armShoulder.set_speed(ARM_SPD);
        break;
      
      case ARM_REV_SHOULDER:
        armShoulder.set_direction(false);
        armShoulder.set_speed(ARM_SPD);
        break;
      
      case ARM_STOP_SHOULDER:
        armShoulder.set_speed(0);
        break;

      case ARM_FWD_BOTH:
        armElbow.set_direction(true);
        armElbow.set_speed(ARM_SPD);
        armShoulder.set_direction(true);
        armShoulder.set_speed(ARM_SPD);
        break;
      
      case ARM_REV_BOTH:
        armElbow.set_direction(false);
        armElbow.set_speed(ARM_SPD);
        armShoulder.set_direction(false);
        armShoulder.set_speed(ARM_SPD);
        break;
      
      case ARM_STOP_BOTH:
        armElbow.set_speed(0);
        armShoulder.set_speed(0);
        break;

      case ARM_STOP_ALL:
        //armBase.set_speed(0);
        armShoulder.set_speed(0);
        armElbow.set_speed(0);
        timeEffectorStart = time1 - EFFECTOR_TIME_FULL - EFFECTOR_TIME_EASE;
        break;

      // All of these are handled fully by the other arduino
      case FWD:
      case REV:
      case LEFT:
      case RIGHT:
      case ARM_ROTATE_CW:
      case ARM_ROTATE_CCW:
      case ARM_STOP_ROTATE:
        break;
      
      default:
        //digitalWrite(LED_BUILTIN, LOW);
        stop = 1;
        Stop();
        break;
    }
  }
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

// The stop function to be called to slowly stop the motors
void Stop() {
  armBase.set_speed(0);
  armShoulder.set_speed(0);
  armElbow.set_speed(0);
}
