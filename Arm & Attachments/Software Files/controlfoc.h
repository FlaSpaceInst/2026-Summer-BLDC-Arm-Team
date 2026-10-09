// controlfoc.h
// Hardware constants, tuning parameters, and utility prototypes for the SimpleFOC control layer.
// This is the active control header; see control.h for the legacy manual-stepping layer.
#ifndef CONTROLFOC_H
#define CONTROLFOC_H

#define POLE_PAIRS 7
#define PWM_FREQUENCY 20000          // Hz
#define SUPPLY_VOLTAGE 12.0          // volts
#define DRIVER_VOLTAGE_LIMIT 8.0       // volts
#define LOOP_DUTY_CYCLE 1000         // FOC loop iterations per main loop pass (controls CPU split between FOC and I/O)
#define LOOP_INPUT_CYCLE 10          // FOC loop iterations per serial read
#define ACCEL_RATE 0.1               // RPM per ms acceleration/deceleration rate
#define MAX_ACCEL 0.5                // max RPM change per FOC loop

// function prototypes
float radstoRPM(float rads);
float RPMtoRads(float rpm);
int clamp(int input, int min, int max);

#endif // CONTROLFOC_H
