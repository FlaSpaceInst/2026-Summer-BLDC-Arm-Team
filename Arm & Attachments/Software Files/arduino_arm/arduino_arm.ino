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
