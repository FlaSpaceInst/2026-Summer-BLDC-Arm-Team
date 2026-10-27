// Tests the original arm service directly, replacing only its ESM import lines.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function createService() {
  const sourceFile = path.join(__dirname, '../src/api/ezrassor-service-paver-arm.js');
  const source = fs.readFileSync(sourceFile, 'utf8')
    .replace(/^import .*;?\r?\n/gm, '')
    .replace('export default class EZRASSOR', 'class EZRASSOR');
  const Robot = Object.freeze({
    PLATE: Symbol('plate'), SHOULDER: Symbol('shoulder'),
    FOREARM: Symbol('forearm'), ENDEFFECTOR: Symbol('hand'),
    ALL: Symbol('all'), AUTONOMY: Symbol('autonomy')
  });
  const Operation = Object.freeze({ STOP:'STOP',POSITIVE:'POSITIVE',NEGATIVE:'NEGATIVE' });
  const writes = [];
  const HTTP = {
    doPost(host, body, extension) {
      writes.push({ host, body:JSON.parse(body), extension });
      return Promise.resolve({ok:true});
    }
  };
  const context = { Robot, Operation, HTTP, console, Promise };
  vm.runInNewContext(source + '\nthis.Service = EZRASSOR;', context, {filename:sourceFile});
  return { service:new context.Service('127.0.0.1:5000'), Robot, Operation, writes };
}

test('original shoulder button commands send only press and release, no periodic heartbeat', async () => {
  const {service, Robot, Operation, writes} = createService();
  await service.executeRobotCommand(Robot.SHOULDER, Operation.POSITIVE);
  await service.executeRobotCommand(Robot.SHOULDER, Operation.STOP);
  assert.deepEqual(writes.map((w) => w.body), [
    {shoulder_joint_speed:2, shoulder_joint_action:'POSITIVE'},
    {shoulder_joint_action:'STOP'}
  ]);
});
test('quick direction reversal preserves all three network messages in order', async () => {
  const {service, Robot, Operation, writes} = createService();
  await Promise.all([
    service.executeRobotCommand(Robot.SHOULDER, Operation.POSITIVE),
    service.executeRobotCommand(Robot.SHOULDER, Operation.STOP),
    service.executeRobotCommand(Robot.SHOULDER, Operation.NEGATIVE)
  ]);
  assert.deepEqual(writes.map((w) => w.body.shoulder_joint_action), ['POSITIVE','STOP','NEGATIVE']);
});
test('gripper positive and stop use expected JSON field', async () => {
  const {service, Robot, Operation, writes} = createService();
  await service.executeRobotCommand(Robot.ENDEFFECTOR, Operation.POSITIVE);
  await service.executeRobotCommand(Robot.ENDEFFECTOR, Operation.STOP);
  assert.deepEqual(writes.map((w) => w.body.end_effector_action), ['POSITIVE','STOP']);
});
test('all-stop includes all four joint stop fields', async () => {
  const {service, Robot, Operation, writes} = createService();
  await service.executeRobotCommand(Robot.ALL, Operation.STOP);
  assert.deepEqual(writes[0].body, {
    plate_joint_action:'STOP',shoulder_joint_action:'STOP',
    forearm_joint_action:'STOP',end_effector_action:'STOP'
  });
});
test('unsupported autonomy is rejected locally', async () => {
  const {service, Robot, writes} = createService();
  await assert.rejects(service.executeRobotCommand(Robot.AUTONOMY, 'PICKUP'));
  assert.equal(writes.length, 0);
});

test('queued commands retain the ROS host selected when issued', async () => {
  const {service, Robot, Operation, writes} = createService();
  const pending = service.executeRobotCommand(Robot.SHOULDER, Operation.POSITIVE);
  service.host = '192.168.10.99:5000';
  await pending;
  assert.equal(writes[0].host, '127.0.0.1:5000');
});
