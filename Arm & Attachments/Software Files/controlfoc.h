// controlfoc.h
// Hardware constants, tuning parameters, and utility prototypes for the SimpleFOC control layer.
// This is the active control header; see control.h for the legacy manual-stepping layer.
#ifndef CONTROLFOC_H
#define CONTROLFOC_H

#define NUM_BANKS 2   // number of independent motor banks (Bank 0: motors 0&1, Bank 1: motors 2&3)
#define POLE_PAIRS 7
#define PWM_FREQUENCY 20000          // Hz
#define SUPPLY_VOLTAGE 12.0          // volts
#define NUM_SPEEDS 3                 // speed levels in each direction (e.g. 1–3 forward, 1–3 reverse)
#define RPM_MULT 200                 // RPM per speed level; level 3 = 600 RPM
#define LOOP_DUTY_CYCLE 1000         // FOC loop iterations per main loop pass (controls CPU split between FOC and I/O)

// function prototypes
float radstoRPM(float rads);
float RPMtoRads(float rpm);
int clamp(int input, int min, int max);

// Serial command bytes received from the Raspberry Pi
enum COMMANDS {
  ROVER_STOP  = 0x00,  // all stop
  ROVER_FWD   = 0x01,  // increment speed forward
  ROVER_REV   = 0x02,  // increment speed reverse
  ROVER_LEFT  = 0x03,  // left bank back, right bank forward (pivot left)
  ROVER_RIGHT = 0x04,  // left bank forward, right bank back (pivot right)
  //ROVER_HALT = 0xff,  // deprecated
  ROVER_FRONT = 0x05,
  ROVER_BACK  = 0x06,
  ROVER_RAISE = 0X07,
  ROVER_LOWER = 0X08
};

#endif // CONTROLFOC_H