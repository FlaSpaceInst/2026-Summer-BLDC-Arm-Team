'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('../src/app');

async function setup(t) {
  const writes = [];
  const makePort = (name) => ({
    isOpen: true,
    write(data, callback) {
      let value = data;
      if (Buffer.isBuffer(data)) {
        value = data[0];
      }
      writes.push({ name, value });
      callback(null);
    }
  });
  const server = createApp({ arm: makePort('arm'), hand: makePort('hand') });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  }));

  const file = path.join(__dirname, '../../ezrassor_controller/src/api/ezrassor-service-paver-arm.js');
  const source = fs.readFileSync(file, 'utf8')
    .replace(/^import .*;?\r?\n/gm, '')
    .replace('export default class EZRASSOR', 'class EZRASSOR');
  const Robot = Object.freeze({
    SHOULDER: 1, FOREARM: 2, ENDEFFECTOR: 3, PLATE: 4, ALL: 5, AUTONOMY: 6
  });
  const Operation = Object.freeze({ POSITIVE: 'POSITIVE', NEGATIVE: 'NEGATIVE', STOP: 'STOP' });
  const HTTP = {
    async doPost(host, body, extension) {
      const response = await fetch('http://' + host + extension, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body
      });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response;
    }
  };
  const context = { Robot, Operation, HTTP, console, Promise };
  vm.runInNewContext(source + '\nthis.Service = EZRASSOR;', context, { filename: file });
  const address = '127.0.0.1:' + server.address().port;
  return { service: new context.Service(address), Robot, Operation, writes };
}

test('original UI service routes shoulder and forearm exclusively to arm Arduino', async (t) => {
  const fixture = await setup(t);
  await fixture.service.executeRobotCommand(fixture.Robot.SHOULDER, fixture.Operation.POSITIVE);
  await fixture.service.executeRobotCommand(fixture.Robot.SHOULDER, fixture.Operation.STOP);
  await fixture.service.executeRobotCommand(fixture.Robot.FOREARM, fixture.Operation.NEGATIVE);
  await fixture.service.executeRobotCommand(fixture.Robot.FOREARM, fixture.Operation.STOP);
  assert.deepEqual(fixture.writes, [
    { name: 'arm', value: 0x0f },
    { name: 'arm', value: 0x11 },
    { name: 'arm', value: 0x13 },
    { name: 'arm', value: 0x14 }
  ]);
});

test('original UI service routes gripper to hand Arduino and STOP to both', async (t) => {
  const fixture = await setup(t);
  await fixture.service.executeRobotCommand(fixture.Robot.ENDEFFECTOR, fixture.Operation.POSITIVE);
  await fixture.service.executeRobotCommand(fixture.Robot.ENDEFFECTOR, fixture.Operation.STOP);
  await fixture.service.executeRobotCommand(fixture.Robot.ALL, fixture.Operation.STOP);
  assert.deepEqual(fixture.writes, [
    { name: 'hand', value: 0x09 },
    { name: 'hand', value: 0x0b },
    { name: 'arm', value: 0x18 },
    { name: 'hand', value: 0x0b }
  ]);
});

test('original UI service sends one press command with no recurring heartbeat', async (t) => {
  const fixture = await setup(t);
  await fixture.service.executeRobotCommand(fixture.Robot.SHOULDER, fixture.Operation.POSITIVE);
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.writes[0].name, 'arm');
});
