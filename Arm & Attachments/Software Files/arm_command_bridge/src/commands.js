'use strict';

class CommandValidationError extends Error 
{
  constructor(message) 
  {
    super(message);
    this.name = 'CommandValidationError';
  }
}

const COMMANDS = 
{
  STOP: 0x00,
  OPEN_EFFECTOR: 0x09,
  CLOSE_EFFECTOR: 0x0A,
  STOP_EFFECTOR: 0x0B,
  ARM_FWD_SHOULDER: 0x0F,
  ARM_REV_SHOULDER: 0x10,
  ARM_STOP_SHOULDER: 0x11,
  ARM_FWD_ELBOW: 0x12,
  ARM_REV_ELBOW: 0x13,
  ARM_STOP_ELBOW: 0x14,
  ARM_STOP_ALL: 0x18
};

function commandsFromRequest(body) 
{
  if (!body || typeof body !== 'object' || Array.isArray(body)) 
  {
    throw new CommandValidationError('Request body must be a JSON object.');
  }

  const commands = [];
  const actionFields = [
    'shoulder_joint_action',
    'forearm_joint_action',
    'end_effector_action'
  ];

  const supportedFields = [
    ...actionFields,
    'plate_joint_action'
  ];

  const unknownFields = Object.keys(body).filter((key) => !supportedFields.includes(key));

  if (unknownFields.length > 0) 
  {
    throw new CommandValidationError(`Unsupported field(s): ${unknownFields.join(', ')}`);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'plate_joint_action')) 
  {
    throw new CommandValidationError('plate_joint_action must be handled by the base/rotation controller.');
  }

  for (const field of actionFields) 
  {
    if (!Object.prototype.hasOwnProperty.call(body, field)) {continue;}

    const action = body[field];

    if (action === 'STOP') 
    {
      if (field === 'shoulder_joint_action') 
      {
        commands.push(COMMANDS.ARM_STOP_SHOULDER);
      } 
      else if (field === 'forearm_joint_action') 
      {
        commands.push(COMMANDS.ARM_STOP_ELBOW);
      } 
      else 
      {
        commands.push(COMMANDS.STOP_EFFECTOR);
      }

      continue;
    }

    if (field === 'shoulder_joint_action') 
    {
      if (action === 'POSITIVE') 
      {
        commands.push(COMMANDS.ARM_FWD_SHOULDER);
      } 
      else if (action === 'NEGATIVE') 
      {
        commands.push(COMMANDS.ARM_REV_SHOULDER);
      } 
      else
      {
        throw new CommandValidationError(`Invalid shoulder action: ${action}`);
      }
    } 
    else if (field === 'forearm_joint_action') 
    {
      if (action === 'POSITIVE') 
      {
        commands.push(COMMANDS.ARM_FWD_ELBOW);
      } 
      else if (action === 'NEGATIVE') 
      {
        commands.push(COMMANDS.ARM_REV_ELBOW);
      } 
      else 
      {
        throw new CommandValidationError(`Invalid forearm action: ${action}`);
      }
    } 
    else if (field === 'end_effector_action') 
    {
      if (action === 'POSITIVE') 
      {
        commands.push(COMMANDS.OPEN_EFFECTOR);
      } 
      else if (action === 'NEGATIVE') 
      {
        commands.push(COMMANDS.CLOSE_EFFECTOR);
      } 
      else 
      {
        throw new CommandValidationError(`Invalid end effector action: ${action}`);
      }
    }
  }

  if (commands.length === 0) 
  {
    throw new CommandValidationError('No supported arm commands were provided.');
  }

  return commands;
}

module.exports = {
  CommandValidationError,
  commandsFromRequest
};
