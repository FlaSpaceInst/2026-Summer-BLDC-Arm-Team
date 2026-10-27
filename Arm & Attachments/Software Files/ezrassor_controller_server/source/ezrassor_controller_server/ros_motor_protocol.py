"""Shared RE-RASSOR command protocol for the three ROS-controlled Arduinos.

This module intentionally has no ROS or serial dependencies. It can be tested
on a Windows development machine before any physical Arduino is connected.
The Arduino wire protocol is intentionally unchanged.
"""

ARM_TOPIC = '/ezrassor/paver_arm_json'
DRIVER_STATUS_TOPIC = '/ezrassor/driver_status'

JOINT_BYTES = {
    'shoulder_joint_action': {
        'POSITIVE': 0x0F,
        'NEGATIVE': 0x10,
        'STOP': 0x11,
    },
    'forearm_joint_action': {
        'POSITIVE': 0x12,
        'NEGATIVE': 0x13,
        'STOP': 0x14,
    },
    'end_effector_action': {
        'POSITIVE': 0x09,
        'NEGATIVE': 0x0A,
        'STOP': 0x0B,
    },
    'plate_joint_action': {
        'POSITIVE': 0x0C,
        'NEGATIVE': 0x0D,
        'STOP': 0x0E,
    },
}

ARM_FIELD_ORDER = (
    'shoulder_joint_action',
    'forearm_joint_action',
    'end_effector_action',
    'plate_joint_action',
)

WHEEL_BINARY = {
    'STOP': 0x00,
    'FWD': 0x01,
    'REV': 0x02,
    'LEFT': 0x03,
    'RIGHT': 0x04,
}


def splitArmPayload(payload):
    """Validate arm fields first; return (arm actions, unrelated request data).

    Prevent partial actuation when a request contains a valid movement and an
    invalid gripper action in the same JSON object.
    """
    if not isinstance(payload, dict):
        raise ValueError('Request body must be a JSON object')

    armActions = {}
    otherActions = {}
    for field, action in payload.items():
        if field in JOINT_BYTES:
            if not isinstance(action, str) or action not in JOINT_BYTES[field]:
                raise ValueError(f'Invalid {field}: {action!r}')
            armActions[field] = action
        elif field.endswith('_speed') and field[:-6] + '_action' in JOINT_BYTES:
            validateSpeed(action)
            armActions[field] = action
        else:
            otherActions[field] = action

    return armActions, otherActions


def decodeArmPayload(payload, enableBase=False):
    """Return ordered (serial target, byte, joint name) tuples.

    The base joint is disabled unless verified and explicitly enabled.
    STOP is accepted for disabled base because it cannot start movement.
    """
    armActions, otherActions = splitArmPayload(payload)
    if otherActions:
        raise ValueError(f'Unknown joint fields: {list(otherActions)}')

    commands = []
    for field in ARM_FIELD_ORDER:
        if field not in armActions:
            continue
        action = armActions[field]
        if field == 'plate_joint_action':
            if not enableBase:
                if action == 'STOP':
                    continue
                raise ValueError('Base rotation is disabled until wheel firmware is verified')
            target = 'wheels'
        elif field == 'end_effector_action':
            target = 'hand'
        else:
            target = 'arm'
        speedField = field[:-7] + '_speed'
        if action != 'STOP' and speedField in armActions:
            commands.append((target, SPEED_COMMANDS[field][armActions[speedField] - 1], speedField))
        commands.append((target, JOINT_BYTES[field][action], field))

    # Standalone speed changes are also supported, even while idle.
    for field in ARM_FIELD_ORDER:
        speedField = field[:-7] + '_speed'
        if speedField not in armActions or field in armActions:
            continue
        if field == 'plate_joint_action' and not enableBase:
            raise ValueError('Base speed is disabled until base rotation is enabled')
        target = 'arm'
        if field == 'end_effector_action':
            target = 'hand'
        elif field == 'plate_joint_action':
            target = 'wheels'
        commands.append((target, SPEED_COMMANDS[field][armActions[speedField] - 1], speedField))
    return commands


def wheelDirection(linearX, angularZ):
    """Translate legacy Twist driving request to the existing wheel commands."""
    if linearX == 0 and angularZ == 0:
        return 'STOP'
    if linearX > 0:
        return 'FWD'
    if linearX < 0:
        return 'REV'
    if angularZ > 0:
        return 'LEFT'
    return 'RIGHT'


def encodeWheel(direction):
    """Encode the standard one-byte Wheels Arduino command.

    The Arduino serial stream is binary on all three boards. Text commands
    exist only as commented-out Arduino Serial Monitor debugging helpers.
    """
    if direction not in WHEEL_BINARY:
        raise ValueError(f'Unknown wheel direction: {direction}')
    return bytes([WHEEL_BINARY[direction]])


# Binary speed configuration. 1=slow, 2=medium, 3=fast. Each value
# configures the corresponding motor without starting it.
SPEED_COMMANDS = {
    'wheels': (0x19, 0x1A, 0x1B),
    'shoulder_joint_action': (0x1C, 0x1D, 0x1E),
    'forearm_joint_action': (0x1F, 0x20, 0x21),
    'end_effector_action': (0x22, 0x23, 0x24),
    'plate_joint_action': (0x25, 0x26, 0x27),
}


def validateSpeed(speed):
    if type(speed) is not int or speed not in (1, 2, 3):
        raise ValueError('Speed must be an integer preset (1, 2, or 3)')
    return speed


def encodeSpeed(motor, speed):
    speed = validateSpeed(speed)
    if motor not in SPEED_COMMANDS:
        raise ValueError(f'Unknown motor: {motor}')
    return bytes([SPEED_COMMANDS[motor][speed - 1]])


def wheelSpeedFromTwist(linearX, angularZ):
    if linearX == 0 and angularZ == 0:
        return None
    if linearX != 0 and angularZ != 0:
        raise ValueError('Simultaneous linear and angular wheel commands are unsupported')
    value = abs(linearX)
    if value == 0:
        value = abs(angularZ)
    if not float(value).is_integer() or value < 1 or value > 3:
        raise ValueError('Wheel Twist magnitude must be 1, 2, or 3')
    return int(value)
