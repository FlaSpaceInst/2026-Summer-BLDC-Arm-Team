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

#endif // CONTROLFOC_H
