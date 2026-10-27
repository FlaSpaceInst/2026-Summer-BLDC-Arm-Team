"""Validate and split paver-arm HTTP commands from existing rover commands.

This module has no ROS/Flask dependencies so the full command contract can be
unit-tested without the Raspberry Pi.
"""

import json


ARM_FIELDS = {
    'plate_joint_action',
    'shoulder_joint_action',
    'forearm_joint_action',
    'end_effector_action',
}

VALID_ARM_ACTIONS = {'POSITIVE', 'NEGATIVE', 'STOP'}
SPEED_FIELDS = {field[:-7] + '_speed': field for field in ARM_FIELDS}


def splitArmRequest(payload):
    if not isinstance(payload, dict):
        raise ValueError('Request body must be a JSON object')
    armActions = {}
    roverActions = {}
    for field, action in payload.items():
        if field in ARM_FIELDS:
            if not isinstance(action, str) or action not in VALID_ARM_ACTIONS:
                raise ValueError(f'Invalid {field}: {action!r}')
            armActions[field] = action
        elif field in SPEED_FIELDS:
            if type(action) is not int or action not in (1, 2, 3):
                raise ValueError(f'Invalid {field}: expected speed preset 1, 2, or 3')
            armActions[field] = action
        else:
            roverActions[field] = action
    return armActions, roverActions


def encodeArmRequest(armActions):
    armData, unrelatedData = splitArmRequest(armActions)
    if unrelatedData:
        raise ValueError('Unexpected non-arm fields in ROS arm request')
    return json.dumps(armData)


def stopArmActions():
    return {
        'plate_joint_action': 'STOP',
        'shoulder_joint_action': 'STOP',
        'forearm_joint_action': 'STOP',
        'end_effector_action': 'STOP',
    }


def formatDriverHealth(driverStatus, ageSeconds):
    """Report connected boards only while their ROS status is recent."""
    health = {
        'success': True,
        'ready': False,
        'armOpen': False,
        'handOpen': False,
        'wheelsOpen': False,
        'baseEnabled': False,
        'protocol': 'press-stop',
        'serialProtocol': 'binary',
    }
    if not isinstance(driverStatus, dict) or ageSeconds is None:
        return health
    if ageSeconds < 0 or ageSeconds > 2.0:
        return health
    for key in ('armOpen', 'handOpen', 'wheelsOpen', 'baseEnabled'):
        health[key] = driverStatus.get(key) is True
    health['ready'] = health['armOpen'] and health['handOpen']
    return health


def checkArmReadiness(armActions, health):
    """Reject movement when ROS has no fresh proof of its serial owner.

    STOP remains publishable even during a reported disconnection. A ROS
    status alone does not prove that a physical motor stopped or moved.
    """
    if not isinstance(health, dict):
        return False, 'ROS driver status unavailable'
    for field, action in armActions.items():
        if action == 'STOP':
            continue
        if field in SPEED_FIELDS:
            field = SPEED_FIELDS[field]
        if field in ('shoulder_joint_action', 'forearm_joint_action'):
            if health.get('armOpen') is not True:
                return False, 'Arm Arduino is unavailable'
        elif field == 'end_effector_action':
            if health.get('handOpen') is not True:
                return False, 'Hand Arduino is unavailable'
        elif field == 'plate_joint_action':
            if health.get('baseEnabled') is not True or health.get('wheelsOpen') is not True:
                return False, 'Base rotation is disabled or wheel Arduino unavailable'
    return True, None
