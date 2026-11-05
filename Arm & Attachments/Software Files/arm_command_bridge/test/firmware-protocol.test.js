'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { commandCodes } = require('../src/commands');

const softwareRoot = path.resolve(__dirname, '../..');

function firmwareCommand(board, name) {
  const header = fs.readFileSync(path.join(softwareRoot, board, 'src/commands.h'), 'utf8');
  const expression = new RegExp('\\b' + name + '\\s*=\\s*0x([0-9a-fA-F]+)\\b');
  const match = header.match(expression);
  assert.ok(match, name + ' is missing from ' + board + '/src/commands.h');
  return Number.parseInt(match[1], 16);
}

test('shoulder and forearm bytes match arm Arduino firmware', () => {
  const expected = [
    ['shoulder_joint_action', 'POSITIVE', 'ARM_FWD_SHOULDER'],
    ['shoulder_joint_action', 'NEGATIVE', 'ARM_REV_SHOULDER'],
    ['shoulder_joint_action', 'STOP', 'ARM_STOP_SHOULDER'],
    ['forearm_joint_action', 'POSITIVE', 'ARM_FWD_ELBOW'],
    ['forearm_joint_action', 'NEGATIVE', 'ARM_REV_ELBOW'],
    ['forearm_joint_action', 'STOP', 'ARM_STOP_ELBOW']
  ];
  for (const [joint, action, name] of expected) {
    assert.equal(commandCodes[joint][action], firmwareCommand('arduino_arm', name));
  }
  assert.equal(firmwareCommand('arduino_arm', 'ARM_STOP_ALL'), 0x18);
});

test('gripper bytes match hand Arduino firmware', () => {
  for (const [action, name] of [
    ['POSITIVE', 'OPEN_EFFECTOR'],
    ['NEGATIVE', 'CLOSE_EFFECTOR'],
    ['STOP', 'STOP_EFFECTOR']
  ]) {
    assert.equal(commandCodes.end_effector_action[action], firmwareCommand('arduino_hand', name));
  }
});

test('wheels Arduino recognizes the text protocol used for base rotation', () => {
  const source = fs.readFileSync(path.join(softwareRoot, 'arduino_wheels/arduino_wheels.ino'), 'utf8');
  for (const instruction of ['ARM_CW', 'ARM_CCW', 'ARM_STOP']) {
    assert.ok(source.includes('command == "' + instruction + '"'));
  }
  assert.equal(commandCodes.plate_joint_action.POSITIVE, 'ARM_CW\n');
  assert.equal(commandCodes.plate_joint_action.NEGATIVE, 'ARM_CCW\n');
  assert.equal(commandCodes.plate_joint_action.STOP, 'ARM_STOP\n');
});
