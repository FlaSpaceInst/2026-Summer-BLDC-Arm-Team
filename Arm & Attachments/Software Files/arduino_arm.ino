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
