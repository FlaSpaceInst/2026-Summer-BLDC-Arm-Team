const Robot = Object.freeze({
    PLATE: Symbol('plate_joint_action'),
    SHOULDER: Symbol('shoulder_joint_action'),
    FOREARM: Symbol('forearm_joint_action'),
    WRIST: Symbol('wrist_joint_action'),
    AUTONOMY: Symbol('autonomy'),
    ALL: Symbol('all')
});

const Operation = Object.freeze({

    // Paver Arm Operations

    // Stop all
    STOP: 'STOP',
    
    // Joint Movements
    POSITIVE: "POSITIVE",
    NEGATIVE: "NEGATIVE",

    // Paver Arm Autonomy
    // PICKUP: "Pickup_First_Paver_Prep",
    PICKUP: "PICKUP",
    PLACE: "PLACE",
    HOME: "HOME",

    // Paver Arm COmputer Vision Autonomy
    FULLAUTONOMY: 'AUTOMATIC',

});

export {
    Robot, Operation
}