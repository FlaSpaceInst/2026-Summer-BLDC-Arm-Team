// File entirely to hold command enumeration, for ease of updating
#ifndef FULL_2026_COMMANDS_H
#define FULL_2026_COMMANDS_H

// Command hex ids
enum COMMANDS {
  HALT = 0xff, // permanently halts all rover movement
  STOP = 0x00, // slows the rover to a complete stop
  FWD = 0x01, // drive forward
  REV = 0x02, // drive backwards
  LEFT = 0x03, // turn left
  RIGHT = 0x04, // turn right
  FRONT = 0x05, // seems unused, probably related to drums
  BACK = 0x06, // seems unused, probably related to drums
  RAISE = 0X07, // seems unused, probably related to drums
  LOWER = 0X08, // seems unused, probably related to drums

  // 2026 Team's Additions
  ARM_OPEN_EFFECTOR = 0x09, // start opening end effector
  ARM_CLOSE_EFFECTOR = 0x0A, // start closing end effector
  ARM_STOP_EFFECTOR = 0x0B, // forcibly stops the opening/closing of end effector
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
  ARM_STOP_ALL = 0x18, // stops effector, base, shoulder, & elbow
  
  // Speed presets. Values only configure motor speed
  WHEEL_SPEED_SLOW = 0x19,
  WHEEL_SPEED_MEDIUM = 0x1A,
  WHEEL_SPEED_FAST = 0x1B,
  SHOULDER_SPEED_SLOW = 0x1C,
  SHOULDER_SPEED_MEDIUM = 0x1D,
  SHOULDER_SPEED_FAST = 0x1E,
  FOREARM_SPEED_SLOW = 0x1F,
  FOREARM_SPEED_MEDIUM = 0x20,
  FOREARM_SPEED_FAST = 0x21,
  GRIPPER_SPEED_SLOW = 0x22,
  GRIPPER_SPEED_MEDIUM = 0x23,
  GRIPPER_SPEED_FAST = 0x24,
  BASE_SPEED_SLOW = 0x25,
  BASE_SPEED_MEDIUM = 0x26,
  BASE_SPEED_FAST = 0x27
};

#endif
