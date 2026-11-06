'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { commandsFromRequest, CommandValidationError } = require('../src/commands');

const cases = [
  ['shoulder_joint_action', 'arm', 0x0f, 0x10, 0x11],
  ['forearm_joint_action', 'arm', 0x12, 0x13, 0x14],
  ['end_effector_action', 'hand', 0x09, 0x0a, 0x0b],
  ['plate_joint_action', 'wheels', 'ARM_CW\n', 'ARM_CCW\n', 'ARM_STOP\n']
];
for (const [joint, port, positive, negative, stop] of cases) {
  for (const [action, expected] of [['POSITIVE',positive], ['NEGATIVE',negative], ['STOP',stop]]) {
    test(joint + ' ' + action, () => {
      assert.deepEqual(commandsFromRequest({ [joint]: action }), [{ type: 'joint', joint, action, port, command: expected }]);
    });
  }
}
test('global STOP', () => {
  const body = Object.fromEntries(cases.map(([joint]) => [joint, 'STOP']));
  assert.deepEqual(commandsFromRequest(body), [{ type: 'allStop' }]);
});
for (const body of [null, [], {}, { invalid: 'POSITIVE' }, { shoulder_joint_action: 'FAST' }, { shoulder_joint_action:'POSITIVE',forearm_joint_action:'NEGATIVE' }, { partial_autonomy: 'PICKUP' }]) {
  test('invalid command ' + JSON.stringify(body), () => {
    assert.throws(() => commandsFromRequest(body), CommandValidationError);
  });
}
