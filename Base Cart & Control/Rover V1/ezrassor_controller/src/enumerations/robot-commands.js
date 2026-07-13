const Robot = Object.freeze({
    WHEELS: Symbol('wheel_action'),
    LINEAR_X: Symbol('linear_x'),
    ANGULAR_Z: Symbol('angular_z'),
    FRONTDRUM: Symbol('front_drum_action'),
    BACKDRUM: Symbol('back_drum_action'),
    FRONTARM: Symbol('front_arm_action'),
    BACKARM: Symbol('back_arm_action'),
    AUTONOMY: Symbol('routine_action'),
    ALL: Symbol('all')
});

const ShoulderOperation = Object.freeze({
    LOWER: 'LOWER',
    STOP: 'STOP',
    RAISE: 'RAISE'
});

const DrumOperation = Object.freeze({
    DUMP: 'DUMP',
    STOP: 'STOP',
    DIG: 'DIG'
});

const WheelOperation = Object.freeze({
    LEFT: 'LEFT', //1.0
    RIGHT: 'RIGHT', //-1
    FORWARD: 'FORWARD', //1
    BACKWARD: 'BACKWARD', //-1.0
    ANGULAR_Z_LEFT: '1.0',
    ANGULAR_Z_RIGHT: '-1.0',
    LINEAR_X_FORWARD: '1.0',
    LINEAR_X_BACKWARD: '-1.0',
    STOP: 'STOP'
});

const Operation = Object.freeze({
    STOPWHEELS: 'stop',
    DRIVEFORWARD: 'forward',
    DRIVEBACKWARD: 'backward',
    TURNLEFT: 'left',
    TURNRIGHT: 'right',
    UP: 1,
    DOWN: -1,
    ROTATEOUTWARD: 1,
    ROTATEINWARD: -1,
    STOP: 0,

    // Autonomous Functions
    DRIVE: 1,
    DIG: 2,
    DUMP: 4,
    SELFRIGHT: 8,
    FULLAUTONOMY: 16
});

export {
    Robot, ShoulderOperation, DrumOperation, WheelOperation, Operation
}