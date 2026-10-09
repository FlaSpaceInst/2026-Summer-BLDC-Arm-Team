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

// target velocities (RPM)
float v_target_effector = 0.0;
float v_target_shoulder = 0.0;
float v_target_elbow = 0.0;

// current velocities (RPM)
float v_curr_effector = 0.0;
float v_curr_shoulder = 0.0;
float v_curr_elbow = 0.0;

// global checker for stopping
int stop = 0;

byte last_command = STOP;

long last_command_time = 0;   // ms since last command
long command_timeout = 1000;  // ms to wait for next command before stopping

long time = millis();
long timeout = 0;
long time1 = millis();
float accel_change = 0.0;

void setup() {
  // use USB on serial 115200
  // I think this actually just activates the serial with a bitrate of 115200? - Lucas
  Serial.begin(115200);
  
  /*// set up the LED for ability to see if recieving commands
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);*/

  // end effector initial
  driver_effector.voltage_power_supply = SUPPLY_VOLTAGE;
  driver_effector.voltage_limit = DRIVER_VOLTAGE_LIMIT;
  driver_effector.pwm_frequency = PWM_FREQUENCY;
  driver_effector.init();
  
  motor_effector.linkDriver(&driver_effector);
  motor_effector.controller = MotionControlType::velocity_openloop;
  motor_effector.voltage_limit = SUPPLY_VOLTAGE;
  motor_effector.init();
  motor_effector.enable();

  // arm shoulder initial
  driver_shoulder.voltage_power_supply = SUPPLY_VOLTAGE;
  driver_shoulder.voltage_limit = DRIVER_VOLTAGE_LIMIT;
  driver_shoulder.pwm_frequency = PWM_FREQUENCY;
  driver_shoulder.init();
  
  motor_shoulder.linkDriver(&driver_shoulder);
  motor_shoulder.controller = MotionControlType::velocity_openloop;
  motor_shoulder.voltage_limit = SUPPLY_VOLTAGE;
  motor_shoulder.init();
  motor_shoulder.enable();

  // arm elbow initial
  driver_elbow.voltage_power_supply = SUPPLY_VOLTAGE;
  driver_elbow.voltage_limit = DRIVER_VOLTAGE_LIMIT;
  driver_elbow.pwm_frequency = PWM_FREQUENCY;
  driver_elbow.init();
  
  motor_elbow.linkDriver(&driver_elbow);
  motor_elbow.controller = MotionControlType::velocity_openloop;
  motor_elbow.voltage_limit = SUPPLY_VOLTAGE;
  motor_elbow.init();
  motor_elbow.enable();
}

void loop() {

  // FOC loop
  for(int i = 0; i < LOOP_DUTY_CYCLE; i++) {
    time1 = millis();
    accel_change = min((time1-time) * ACCEL_RATE, MAX_ACCEL);
    
    // Check serial commands every some number of loops
    if (i % LOOP_INPUT_CYCLE = 0) {
      read_serial();
    }

    // Update motors
    update_motors();

    time = time1;
  }

  // Check easing
  checkEffectorEasing();
  // If shoulder/elbow easing is added it should be here

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
  // change speeds
  // change end effector speed
  if (v_target_effector<v_curr_effector) {
    v_curr_effector = max(v_target_effector, v_curr_effector - accel_change);
  }
  else if (v_target_effector>v_curr_effector) {
    v_curr_effector = min(v_target_effector, v_curr_effector + accel_change);
  }
  // change shoulder speed
  if (v_target_shoulder<v_curr_shoulder) {
    v_curr_shoulder = max(v_target_shoulder, v_curr_shoulder - accel_change);
  }
  else if (v_target_shoulder>v_curr_shoulder) {
    v_curr_shoulder = min(v_target_shoulder, v_curr_shoulder + accel_change);
  }
  // change elbow speed
  if (v_target_elbow<v_curr_elbow) {
    v_curr_elbow = max(v_target_elbow, v_curr_elbow - accel_change);
  }
  else if (v_target_elbow>v_curr_elbow) {
    v_curr_elbow = min(v_target_elbow, v_curr_elbow + accel_change);
  }
  
  // move motors
  motor_effector.loopFOC();
  motor_effector.move(v_curr_effector);
  motor_shoulder.loopFOC();
  motor_shoulder.move(v_curr_shoulder);
  motor_elbow.loopFOC();
  motor_elbow.move(v_curr_elbow);
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

// The stop function to be called to stop the motors
void Stop() {
  v_target_effector = 0.0;
  v_target_shoulder = 0.0;
  v_target_elbow = 0.0;
}
