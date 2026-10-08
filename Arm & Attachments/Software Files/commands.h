// File entirely to hold command enumeration, for ease of updating
#ifndef COMMANDS_H
#define COMMANDS_H

// Command hex ids
enum COMMANDS {
  STOP = 0x00, // stops wheels
  FWD = 0x01, // drive forward
  REV = 0x02, // drive backwards
  LEFT = 0x03, // turn left
  RIGHT = 0x04, // turn right
  //HALT = 0xff, // deprecated
  FRONT = 0x05, // seems unused, probably related to drums
  BACK = 0x06, // seems unused, probably related to drums
  RAISE = 0X07, // seems unused, probably related to drums
  LOWER = 0X08, // seems unused, probably related to drums

  // 2026 Team's Additions
  OPEN_EFFECTOR = 0x09, // start opening end effector
  CLOSE_EFFECTOR = 0x0A, // start closing end effector
  STOP_EFFECTOR = 0x0B, // forcibly stops the opening/closing of end effector
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
  ARM_STOP_ALL = 0x18 // stops effector, base, shoulder, & elbow
};

#endif
