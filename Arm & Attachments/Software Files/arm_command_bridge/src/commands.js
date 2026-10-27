'use strict';

// Individual, event-driven movement commands. There is no heartbeat protocol.
const commandCodes = Object.freeze({
  shoulder_joint_action: { POSITIVE: 0x0f, NEGATIVE: 0x10, STOP: 0x11 },
  forearm_joint_action: { POSITIVE: 0x12, NEGATIVE: 0x13, STOP: 0x14 },
  end_effector_action: { POSITIVE: 0x09, NEGATIVE: 0x0a, STOP: 0x0b },
  plate_joint_action: { POSITIVE: 'ARM_CW\n', NEGATIVE: 'ARM_CCW\n', STOP: 'ARM_STOP\n' }
});

const portForJoint = Object.freeze({
  shoulder_joint_action: 'arm',
  forearm_joint_action: 'arm',
  end_effector_action: 'hand',
  plate_joint_action: 'wheels'
});

class CommandValidationError extends Error {}

function commandsFromRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new CommandValidationError('Expected a JSON command object.');
  }

  const fields = Object.keys(body);
  if (fields.length === 0) {
    throw new CommandValidationError('Missing joint command.');
  }

  if (fields.some((field) => !Object.hasOwn(commandCodes, field))) {
    throw new CommandValidationError('Unknown or unsupported arm command.');
  }

  // The original arm UI sends all four STOP actions for emergency STOP.
  if (fields.length > 1) {
    if (fields.length !== 4 || fields.some((field) => body[field] !== 'STOP')) {
      throw new CommandValidationError('Only one joint may move per request.');
    }
    return [{ type: 'allStop' }];
  }

  const joint = fields[0];
  const action = body[joint];
  if (!Object.hasOwn(commandCodes[joint], action)) {
    throw new CommandValidationError('Invalid joint action.');
  }

  return [{ type: 'joint', joint, action, port: portForJoint[joint], command: commandCodes[joint][action] }];
}

module.exports = { commandCodes, portForJoint, CommandValidationError, commandsFromRequest };
