#include <SimpleFOC.h>
#include "controlfoc.h"
#include "commands.h"

// ================= ARM SPEED CONFIG ==================

// effectorSpd: speed (RPM) of opening/closing end effector
#define EFFECTOR_SPD 40.0
// effectorEase: speed (RPM) of easing the opening/closing of the end effector
#define EFFECTOR_EASE 20.0
// effectorTimeFull: time (ms) the effector spends moving after starting to move
#define EFFECTOR_TIME_FULL 1000
// effectorTimeEase: time (ms) the effector spends at eased speed after starting to ease
#define EFFECTOR_TIME_EASE 250

// armSpd: speed (RPM) of the arm shoulder & elbow
#define ARM_SPD 20.0

// =====================================================

// switch between -1 and 1 if motors are rotating the wrong way
#define DIR_EFFECTOR 1
#define DIR_SHOULDER 1
#define DIR_ELBOW 1

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

//long last_command_time = 0;   // ms since last command
//long command_timeout = 1000;  // ms to wait for next command before stopping

long time = millis();
//long timeout = 0;
long time1 = millis();
float accel_change = 0.0;

long effector_stop_time = time1;

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
  motor_effector.controller = MotionControlType::velocity_openloop; // Note: considering MotionControlType::angle_openloop as alternative for end effector specifically
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
  
  /*// call stop function if we get stuck in a loop and it wont slow down after 2500 miliseconds
  if (timeout == 750) {
    stop = 1;
    Stop();
  }*/
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
  motor_effector.move(DIR_EFFECTOR * v_curr_effector);
  motor_shoulder.loopFOC();
  motor_shoulder.move(DIR_SHOULDER * v_curr_shoulder);
  motor_elbow.loopFOC();
  motor_elbow.move(DIR_ELBOW * v_curr_elbow);
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
      
      case OPEN_EFFECTOR:
        effector_stop_time = time1+EFFECTOR_TIME_FULL;
        v_target_effector = EFFECTOR_SPD;
        break;

      case CLOSE_EFFECTOR:
        effector_stop_time = time1+EFFECTOR_TIME_FULL;
        v_target_effector = -EFFECTOR_SPD;
        break;

      case STOP_EFFECTOR:
        v_target_effector = 0.0;
        break;
      
      case ARM_FWD_ELBOW:
        v_target_elbow = ARM_SPD;
        break;
      
      case ARM_REV_ELBOW:
        v_target_elbow = -ARM_SPD;
        break;
      
      case ARM_STOP_ELBOW:
        v_target_elbow = 0.0;
        break;
      
      case ARM_FWD_SHOULDER:
        v_target_shoulder = ARM_SPD;
        break;
      
      case ARM_REV_SHOULDER:
        v_target_shoulder = -ARM_SPD;
        break;
      
      case ARM_STOP_SHOULDER:
        v_target_shoulder = 0.0;
        break;

      case ARM_FWD_BOTH:
        v_target_elbow = ARM_SPD;
        v_target_shoulder = ARM_SPD;
        break;
      
      case ARM_REV_BOTH:
        v_target_elbow = -ARM_SPD;
        v_target_shoulder = -ARM_SPD;
        break;
      
      case ARM_STOP_BOTH:
        v_target_elbow = 0.0;
        v_target_shoulder = 0.0;
        break;

      case ARM_STOP_ALL:
        //armBase.set_speed(0);
        v_target_elbow = 0.0;
        v_target_shoulder = 0.0;
        v_target_effector = 0.0;
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
  if (v_target_effector!=0.0) {
    if (time1>effector_stop_time) {
      v_target_effector = 0.0;
    }
    else if (time1>effector_stop_time-EFFECTOR_TIME_EASE) {
      v_target_effector = velSign(v_target_effector) * EFFECTOR_EASE;
    }
  }
}

// Gets the sign of a velocity float (used in easing)
int velSign (float velInput) {
  if (velInput>0.0) {
    return 1;
  }
  if (velInput<0.0) {
    return -1;
  }
  return 0;
}

// The stop function to be called to stop the motors
void Stop() {
  v_target_effector = 0.0;
  v_target_shoulder = 0.0;
  v_target_elbow = 0.0;
}
