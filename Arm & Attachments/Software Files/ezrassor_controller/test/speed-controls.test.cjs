'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function loadService(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
    .replace(/^import .*;?\r?\n/gm, '')
    .replace('export default class EZRASSOR', 'class EZRASSOR');
  const writes = [];
  const Robot = { WHEELS: Symbol('wheels'), ALL: Symbol('all'), SHOULDER: Symbol('shoulder'), FOREARM: Symbol('forearm'), ENDEFFECTOR: Symbol('hand'), PLATE: Symbol('base') };
  const WheelOperation = {FORWARD:'FORWARD', BACKWARD:'BACKWARD', LEFT:'LEFT', RIGHT:'RIGHT', STOP:'STOP', LINEAR_X_FORWARD:'1.0', LINEAR_X_BACKWARD:'-1.0', ANGULAR_Z_LEFT:'1.0', ANGULAR_Z_RIGHT:'-1.0'};
  const Operation = {STOP:'STOP'};
  const HTTP = { doPost(host, message, extension) { writes.push({ ...JSON.parse(message), _route: extension }); return Promise.resolve({ok:true}); } };
  const context = { Robot, WheelOperation, Operation, HTTP, console, Promise };
  vm.runInNewContext(source + '\nthis.Service = EZRASSOR;', context);
  return {service: new context.Service('127.0.0.1:5000'), Robot, WheelOperation, Operation, writes};
}

test('wheel speed presets use signed Twist magnitudes', async () => {
  const {service, Robot, WheelOperation, writes} = loadService('src/api/ezrassor-service.js');
  await service.executeRobotCommand(Robot.WHEELS, WheelOperation.FORWARD, 3);
  await service.executeRobotCommand(Robot.WHEELS, WheelOperation.BACKWARD, 2);
  await service.executeRobotCommand(Robot.WHEELS, WheelOperation.RIGHT, 3);
  await service.executeRobotCommand(Robot.WHEELS, WheelOperation.LEFT, 1);
  assert.deepEqual(writes.map((w) => [w.wheel_action.linear_x, w.wheel_action.angular_z]), [
    [3,0], [-2,0], [0,-3], [0,1]
  ]);
});
test('wheel STOP remains a zero Twist at every speed', async () => {
  const {service, Robot, WheelOperation, writes} = loadService('src/api/ezrassor-service.js');
  await service.executeRobotCommand(Robot.WHEELS, WheelOperation.STOP, 3);
  assert.deepEqual(writes[0].wheel_action, { linear_x:0, angular_z:0 });
});
test('invalid wheel speed rejects locally before sending', () => {
  const {service, Robot, WheelOperation, writes} = loadService('src/api/ezrassor-service.js');
  assert.throws(() => service.executeRobotCommand(Robot.WHEELS, WheelOperation.FORWARD, 4));
  assert.equal(writes.length, 0);
});
test('shoulder and gripper speed travel with movement, not STOP', async () => {
  const {service, Robot, Operation, writes} = loadService('src/api/ezrassor-service-paver-arm.js');
  await service.executeRobotCommand(Robot.SHOULDER, 'POSITIVE', 1);
  await service.executeRobotCommand(Robot.SHOULDER, Operation.STOP, 3);
  await service.executeRobotCommand(Robot.ENDEFFECTOR, 'NEGATIVE', 3);
  assert.deepEqual(writes, [
    {shoulder_joint_speed:1, shoulder_joint_action:'POSITIVE', _route:'/'},
    {shoulder_joint_action:'STOP', _route:'/'},
    {end_effector_speed:3, end_effector_action:'NEGATIVE', _route:'/'}
  ]);
});
test('speed-only arm updates preserve gripper movement timeout', async () => {
  const {service, Robot, writes} = loadService('src/api/ezrassor-service-paver-arm.js');
  await service.executeRobotCommand(Robot.ENDEFFECTOR, 'POSITIVE', 1);
  await service.setSpeed(Robot.ENDEFFECTOR, 3);
  assert.deepEqual(writes[0], {end_effector_speed:1, end_effector_action:'POSITIVE', _route:'/'});
  assert.deepEqual(writes[1], {end_effector_speed:3, _route:'/'});
});
test('rover-wide STOP uses the implemented ROS /stop route', async () => {
  const {service, Robot, Operation, writes} = loadService('src/api/ezrassor-service.js');
  await service.executeRobotCommand(Robot.ALL, Operation.STOP, 3);
  assert.deepEqual(writes, [{_route:'/stop'}]);
});
test('UI uses original embedded three-dot speed lights, not separate preset buttons', () => {
  const wheel = fs.readFileSync(path.join(root,'src/components/app/ControllerScreen.js'),'utf8');
  const arm = fs.readFileSync(path.join(root,'src/components/app/ArmControlPanel.js'),'utf8');
  assert.match(wheel, /getWheelIndicatorLevels/);
  assert.match(wheel, /label="Left wheel speed"/);
  assert.match(wheel, /label="Right wheel speed"/);
  assert.match(arm, /indicatorLevel/);
  assert.match(arm, /label=\{label \+ ' speed'\}/);
  assert.doesNotMatch(wheel, /renderWheelSpeed\(\)/);
  assert.doesNotMatch(arm, /renderArmSpeed\(\)/);
  assert.doesNotMatch(wheel, /selectWheelSpeed\(/);
  assert.doesNotMatch(arm, /selectArmSpeed\(/);
  assert.doesNotMatch(arm, /armBridgeIp|:3000/);
});
