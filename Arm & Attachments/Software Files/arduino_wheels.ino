#include "DRV8825.h"
// For RAMPS 1.4
/*

43-1 reduction 
big wheel = 
little wheel = 15 1/2
*/

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
// maxSpeed: Base RPM value. Actual speeds are 1x, 2x, 3x this value
//   - With 1/32 microstepping: try 30-60 RPM
//   - With 1/4 microstepping: can go much higher (100-200+ RPM)
#define MAX_SPEED 60

// accelInterval: Milliseconds between acceleration steps (lower = faster accel)
//   - 750 = slow/smooth acceleration (original)
//   - 200-300 = moderate acceleration
//   - 50-100 = quick acceleration
#define ACCEL_INTERVAL 750

// accelIncrement: Starting RPM increase per step
#define ACCEL_INCREMENT 5

// accelMax: Maximum RPM increase per step (caps the doubling)
#define ACCEL_MAX 20
// =====================================================

#define X_STEP_PIN 54
#define X_DIR_PIN 55
#define X_ENABLE_PIN 38

#define Y_STEP_PIN 60
#define Y_DIR_PIN 61
#define Y_ENABLE_PIN 56

#define Z_STEP_PIN 46
#define Z_DIR_PIN 48
#define Z_ENABLE_PIN 62

// extruder 1
#define E0_STEP_PIN 26
#define E0_DIR_PIN 28
#define E0_ENABLE_PIN 24

// extruder 2
#define E1_STEP_PIN 36
#define E1_DIR_PIN 34
#define E1_ENABLE_PIN 30



/* wheel based on arduino pin position
    E1 = Front Left
    E0 = Back Left
    Y = Front Right
    X = Back Right
*/

DRV8825 backRight(X_STEP_PIN, X_DIR_PIN, X_ENABLE_PIN, STEPS_PER_REV);
DRV8825 frontRight(Y_STEP_PIN, Y_DIR_PIN, Y_ENABLE_PIN, STEPS_PER_REV);
DRV8825 frontLeft(E1_STEP_PIN, E1_DIR_PIN, E1_ENABLE_PIN, STEPS_PER_REV);
DRV8825 backLeft(E0_STEP_PIN, E0_DIR_PIN, E0_ENABLE_PIN, STEPS_PER_REV);

// Free driver: Z
DRV8825 FreeDriver(Z_STEP_PIN, Z_DIR_PIN, Z_ENABLE_PIN, STEPS_PER_REV);


enum COMMANDS {
  STOP = 0x00,
  FWD = 0x01,
  REV = 0x02,
  LEFT = 0x03,
  RIGHT = 0x04,
  HALT = 0xff,
  FRONT = 0x05,
  BACK = 0x06,
  RAISE = 0X07,
  LOWER = 0X08,

  // 2026 Team's Additions
  OPEN_EFFECTOR = 0x09,
  CLOSE_EFFECTOR = 0x0A
};

byte last_command = STOP;

long last_command_time = 0;   // ms since last command
long command_timeout = 1000;  // ms to wait for next command before stopping

// maxSpeed uses the define from top of file
long maxSpeed = MAX_SPEED;

// The speed of the motors per side
long idle_left_speed = 1;
long idle_right_speed = 1;

long time = millis();
long timeout = 0;
long time1 = 0;

// direction that indicates what side is going where
bool rs = false;  // right side
bool ls = false;  // left side

// global checkers for starting or stopping
int on = 0;
int stop = 0;

// variable to control slow stop/accelerate (uses define from top)
int slowSpeed = ACCEL_INCREMENT;

// indicates whether we go slow, medium, fast, or not moving with +/- for direction
int leftSpeed = 0;
int rightSpeed = 0;



void setup() {

  // use USB on serial 115200
  Serial.begin(115200);


  // set up the LED for ability to see if recieving commands
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // wheels right/left initial
  frontRight.set_enabled(true);
  frontRight.set_direction(false);
  frontRight.set_speed(0);

  backRight.set_enabled(true);
  backRight.set_direction(false);
  backRight.set_speed(0);

  // shoulders front/back initial
  frontLeft.set_enabled(true);
  frontLeft.set_direction(false);
  frontLeft.set_speed(0);

  backLeft.set_enabled(true);
  backLeft.set_direction(false);
  backLeft.set_speed(0);
}

long last_frequency_check_time = 0;
long counter = 0;


void loop() {

  time1 = millis();
  update_motors();


  read_serial();


  // Controlls the slow start for the stepper motor checks if a certain amount of miliseconds have passed and if we want to speed up
  if (time1 - time >= ACCEL_INTERVAL && on == 1) {
    Speedup(ls, rs);
  }
  // controlls the soft stop for the stepper motor checks if a certain amount of have passed and if we want to stop
  if (time1 - time >= ACCEL_INTERVAL && stop == 1) {
    Stop();
  }
  // call stop function if we get stuck in a loop and it wont slow down after 2500 miliseconds
  if (timeout == 750) {
    stop = 1;
    on = 0;
    Stop();
  }
}
// updates the motors
void update_motors() {

  backRight.update();
  frontRight.update();
  backLeft.update();
  frontLeft.update();

  // 2026 Team's Additions
  FreeDriver.update();
}
// getting hung up and sending stop when we dont want to stop
// checks for commands being sent over the Serial port to the arduino/Ramps board
void read_serial() {
  if (Serial.available()) {
    
    last_command = Serial.read();
    
    // The below comments are for debugging, comment the line above and decomment the below to debug [ctrl + /]

    // String command = Serial.readStringUntil('\n');
    // if (command == "FWD")
    //   last_command = FWD;
    // if (command == "REV")
    //   last_command = REV;
    // if (command == "RIGHT")
    //   last_command = RIGHT;
    // if (command == "LEFT")
    //   last_command = LEFT;
    // if (command == "STOP")
    //   last_command = STOP;

    switch (last_command) {
      case STOP:
        stop = 1;
        on = 0;
        Stop();
        FreeDriver.set_enabled(false);
        break;

      case FWD:
        if (leftSpeed >= 3 && rightSpeed >= 3)  // if we are already at max going forward do nothing
          break;
        if (leftSpeed < 3)
          leftSpeed++;
        if (rightSpeed < 3)
          rightSpeed++;
        on = 1;
        stop = 0;

        if (leftSpeed < 0)
          ls = false;
        else
          ls = true;
        if (rightSpeed < 0)
          rs = true;
        else
          rs = false;
        slowSpeed = ACCEL_INCREMENT;
        Speedup(ls, rs);

        break;
      case REV:
        if (leftSpeed <= -3 && rightSpeed <= -3)  // if we are already at max going reverse do nothing
          break;
        if (leftSpeed > -3)
          leftSpeed--;
        if (rightSpeed > -3)
          rightSpeed--;
        on = 1;
        stop = 0;

        if (leftSpeed < 0)
          ls = false;
        else
          ls = true;
        if (rightSpeed < 0)
          rs = true;
        else
          rs = false;
        slowSpeed = ACCEL_INCREMENT;
        Speedup(ls, rs);


        break;

      case RIGHT:
        if (leftSpeed >= 3 && rightSpeed <= -3)  // if we are already at max going right do nothing
          break;
        if (leftSpeed < 3)
          leftSpeed++;
        if (rightSpeed > -3)
          rightSpeed--;
        on = 1;
        stop = 0;

        if (leftSpeed < 0)
          ls = false;
        else
          ls = true;
        if (rightSpeed < 0)
          rs = true;
        else
          rs = false;
        slowSpeed = ACCEL_INCREMENT;
        Speedup(ls, rs);

        break;

      case LEFT:
        if (rightSpeed >= 3 && leftSpeed <= -3)  // if we are already at max going left do nothing
          break;
        if (rightSpeed < 3)
          rightSpeed++;
        if (leftSpeed > -3)
          leftSpeed--;
        on = 1;
        stop = 0;

        // passes in as left side , right side
        if (leftSpeed < 0)
          ls = false;
        else
          ls = true;
        if (rightSpeed < 0)
          rs = true;
        else
          rs = false;
        slowSpeed = ACCEL_INCREMENT;
        Speedup(ls, rs);


        break;
      // 2026 Team's Addition
      case OPEN_EFFECTOR:
        FreeDriver.set_enabled(true);
        FreeDriver.set_direction(true);
        FreeDriver.set_speed(40);
        break;

      case CLOSE_EFFECTOR:
        FreeDriver.set_enabled(true);
        FreeDriver.set_direction(false);
        FreeDriver.set_speed(40);
        break;

      default:
        digitalWrite(LED_BUILTIN, LOW);
        stop = 1;
        on = 0;
        Stop();
        break;
    }
  }
}


// Speed up function used to speed up the stepper motors from 0 to a set variable, takes in tmp as the starting variable for the speed up
void Speedup(bool left, bool right) {

  int targetSpeedL, targetSpeedR;

  // Define speed values for different modes
  const int slowSpeedValue = maxSpeed;        // Define what "slow" speed means
  const int mediumSpeedValue = maxSpeed * 2;  // Define what "medium" speed means
  const int fastSpeedValue = maxSpeed * 3;    // "Fast" is the maximum speed

  // Determine target speeds based on mode (leftSpeed and rightSpeed)
  switch (abs(leftSpeed)) {
    case 1: targetSpeedL = slowSpeedValue; break;    // Slow mode
    case 2: targetSpeedL = mediumSpeedValue; break;  // Medium mode
    case 3: targetSpeedL = fastSpeedValue; break;    // Fast mode
    default: targetSpeedL = 0; break;                // Stop or no speed
  }

  switch (abs(rightSpeed)) {
    case 1: targetSpeedR = slowSpeedValue; break;    // Slow mode
    case 2: targetSpeedR = mediumSpeedValue; break;  // Medium mode
    case 3: targetSpeedR = fastSpeedValue; break;    // Fast mode
    default: targetSpeedR = 0; break;                // Stop or no speed
  }

  // If we are moving in the opposite direction make the target negative
  if (leftSpeed < 0)
    targetSpeedL *= -1;
  if (rightSpeed < 0)
    targetSpeedR *= -1;

  // Gradually adjust left side speed
  if (idle_left_speed < targetSpeedL) {
    idle_left_speed += slowSpeed;  // Increase speed gradually
    if (idle_left_speed > targetSpeedL)
      idle_left_speed = targetSpeedL;  // Clamp to target speed
  } else if (idle_left_speed > targetSpeedL) {
    idle_left_speed -= slowSpeed;  // Decrease speed gradually
    if (idle_left_speed < targetSpeedL)
      idle_left_speed = targetSpeedL;  // Clamp to target speed
  }

  // Gradually adjust right side speed
  if (idle_right_speed < targetSpeedR) {
    idle_right_speed += slowSpeed;  // Increase speed gradually
    if (idle_right_speed > targetSpeedR)
      idle_right_speed = targetSpeedR;  // Clamp to target speed
  } else if (idle_right_speed > targetSpeedR) {
    idle_right_speed -= slowSpeed;  // Decrease speed gradually
    if (idle_right_speed < targetSpeedR)
      idle_right_speed = targetSpeedR;  // Clamp to target speed
  }

  // Check if both sides have reached their target speeds
  bool leftReached = (idle_left_speed == targetSpeedL);
  bool rightReached = (idle_right_speed == targetSpeedR);

  time = millis();

  if((idle_left_speed >= 0) == left) {
    frontLeft.set_direction(left);
    backLeft.set_direction(left);
  }
  else {
    frontLeft.set_direction(!left);
    backLeft.set_direction(!left);
  }

  if((idle_right_speed <= 0) == right) {
    backRight.set_direction(right);
    frontRight.set_direction(right);
  }
  else {
    backRight.set_direction(!right);
    frontRight.set_direction(!right);
  }


  /* 
      In the below code we need to know if we are moving in the negative direction but not set the speed to a negative value.
      Instead we multiply by -1 anytime we set a negative value. This way we are slowly changing directions and not immediately shifting over to the opposite direction. 
    */

  if ((leftReached) && (rightReached)) {
    // Both sides have reached their target speeds; set the final speed and return

    if (idle_left_speed < 0) {
      frontLeft.set_speed(-1 * targetSpeedL);
      backLeft.set_speed(-1 * targetSpeedL);
    } else {
      frontLeft.set_speed(targetSpeedL);
      backLeft.set_speed(targetSpeedL);
    }

    if (idle_right_speed < 0) {
      backRight.set_speed(-1 * targetSpeedR);
      frontRight.set_speed(-1 * targetSpeedR);
    } else {
      backRight.set_speed(targetSpeedR);
      frontRight.set_speed(targetSpeedR);
    }

    Serial.print("max reached targetL: ");
    Serial.print(targetSpeedL);
    Serial.print("   targetR: ");
    Serial.println(targetSpeedR);
    on = 0;

    slowSpeed = ACCEL_INCREMENT;  // Reset the slowSpeed for future use
    return;
  }

  // Set motor speeds
  //Serial.print("Going ils:%d    irs:%d",idle_left_speed,idle_right_speed);

  if (idle_left_speed < 0) {
    frontLeft.set_speed(-1 * idle_left_speed);
    backLeft.set_speed(-1 * idle_left_speed);
  } else {
    frontLeft.set_speed(idle_left_speed);
    backLeft.set_speed(idle_left_speed);
  }

  if (idle_right_speed < 0) {
    backRight.set_speed(-1 * idle_right_speed);
    frontRight.set_speed(-1 * idle_right_speed);
  } else {
    backRight.set_speed(idle_right_speed);
    frontRight.set_speed(idle_right_speed);
  }

  Serial.print("idleL: ");
  Serial.print(idle_left_speed);
  Serial.print("  --> ");
  Serial.println(targetSpeedL);
  Serial.print("idleR: ");
  Serial.print(idle_right_speed);
  Serial.print("  --> ");
  Serial.println(targetSpeedR);
  Serial.print("slow speed: ");
  Serial.println(slowSpeed);
  Serial.println("----------------");

  // Adjust slowSpeed for smoother acceleration
  slowSpeed = min(slowSpeed * 2, ACCEL_MAX);  // Controls the rate at which we speed up or slow down
}


// The stop function to be called to slowly stop the motors
void Stop() {
  if (abs(idle_left_speed) <= ACCEL_INCREMENT && abs(idle_right_speed) <= ACCEL_INCREMENT) {
    idle_left_speed = 1;
    idle_right_speed = 1;
    slowSpeed = ACCEL_INCREMENT;
    stop = 0;
    leftSpeed = 0;
    rightSpeed = 0;
    backRight.set_speed(0);
    frontRight.set_speed(0);
    backLeft.set_speed(0);
    frontLeft.set_speed(0);

    Serial.println("--STOPPED--");
    return;
  }
  time = millis();
  Serial.println("Cutting speed in half...");

  idle_left_speed = idle_left_speed / 2;
  idle_right_speed = idle_right_speed / 2;

  if (idle_left_speed < 0) {
    frontLeft.set_speed(-1 * idle_left_speed);
    backLeft.set_speed(-1 * idle_left_speed);
  } else {
    frontLeft.set_speed(idle_left_speed);
    backLeft.set_speed(idle_left_speed);
  }

  if (idle_right_speed < 0) {
    backRight.set_speed(-1 * idle_right_speed);
    frontRight.set_speed(-1 * idle_right_speed);
  } else {
    backRight.set_speed(idle_right_speed);
    frontRight.set_speed(idle_right_speed);
  }
}
