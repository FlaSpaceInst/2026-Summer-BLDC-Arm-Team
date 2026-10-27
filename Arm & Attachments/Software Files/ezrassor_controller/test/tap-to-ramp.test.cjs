'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const appRoot = path.resolve(__dirname, '..');
const helperFile = path.join(appRoot, 'src/functionality/tap-speed.js');
const wheelFile = path.join(appRoot, 'src/components/app/ControllerScreen.js');
const helperUrl = 'data:text/javascript,' + encodeURIComponent(fs.readFileSync(helperFile, 'utf8'));

async function createWheelHarness(queuedState = false) {
  const { nextTapSpeed } = await import(helperUrl);
  const source = fs.readFileSync(wheelFile, 'utf8');
  const pressStart = source.indexOf('  pressWheel(operation) {');
  const pressEnd = source.indexOf('  getWheelIndicatorLevels() {', pressStart);
  const stopStart = source.indexOf('  stopWheels(force = false) {');
  const stopEnd = source.indexOf('  stopAllControls() {', stopStart);
  assert.ok(pressStart >= 0 && pressEnd > pressStart && stopStart >= 0 && stopEnd > stopStart);
  const classSource = 'class WheelHarness {\n' +
    source.slice(pressStart, pressEnd) + source.slice(stopStart, stopEnd) +
    '\n}\nthis.WheelHarness = WheelHarness;';
  const WheelOperation = {
    FORWARD: 'FORWARD', BACKWARD: 'BACKWARD', LEFT: 'LEFT', RIGHT: 'RIGHT', STOP: 'STOP'
  };
  const Robot = { WHEELS: 'WHEELS' };
  const context = { nextTapSpeed, WheelOperation, Robot };
  vm.runInNewContext(classSource, context);
  const wheel = new context.WheelHarness();
  const messages = [];
  wheel.state = { offlineMode: false, wheelSpeed: 0 };
  wheel.wheelLevel = 0;
  wheel.wheelMoving = false;
  wheel.wheelOperation = null;
  wheel.sendOperation = (part, operation, speed) => messages.push({ part, operation, speed });
  wheel.setState = (patch) => {
    if (!queuedState) {
      Object.assign(wheel.state, patch);
    }
  };
  return { wheel, messages, WheelOperation };
}

test('same wheel direction taps ramp 1, 2, 3, cap at 3', async () => {
  const { wheel, messages, WheelOperation } = await createWheelHarness();
  for (let index = 0; index < 4; index += 1) {
    wheel.pressWheel(WheelOperation.FORWARD);
  }
  assert.deepEqual(messages.map(message => [message.operation, message.speed]), [
    ['FORWARD', 1], ['FORWARD', 2], ['FORWARD', 3], ['FORWARD', 3]
  ]);
  assert.equal(wheel.wheelLevel, 3);
  assert.equal(wheel.state.wheelSpeed, 3);
});

test('wheel center STOP resets tap level and next start uses Level 1', async () => {
  const { wheel, messages, WheelOperation } = await createWheelHarness();
  wheel.pressWheel(WheelOperation.LEFT);
  wheel.pressWheel(WheelOperation.LEFT);
  wheel.stopWheels(true);
  assert.equal(wheel.wheelMoving, false);
  assert.equal(wheel.wheelLevel, 0);
  assert.equal(wheel.state.wheelSpeed, 0);
  wheel.pressWheel(WheelOperation.LEFT);
  assert.deepEqual(messages.map(message => [message.operation, message.speed]), [
    ['LEFT', 1], ['LEFT', 2], ['STOP', undefined], ['LEFT', 1]
  ]);
});

test('changing wheel direction sends STOP then restarts at Level 1', async () => {
  const { wheel, messages, WheelOperation } = await createWheelHarness();
  wheel.pressWheel(WheelOperation.FORWARD);
  wheel.pressWheel(WheelOperation.FORWARD);
  wheel.pressWheel(WheelOperation.BACKWARD);
  assert.deepEqual(messages.map(message => [message.operation, message.speed]), [
    ['FORWARD', 1], ['FORWARD', 2], ['STOP', undefined], ['BACKWARD', 1]
  ]);
});

test('tap level increments without waiting for React state to commit', async () => {
  const { wheel, messages, WheelOperation } = await createWheelHarness(true);
  wheel.pressWheel(WheelOperation.RIGHT);
  wheel.pressWheel(WheelOperation.RIGHT);
  wheel.pressWheel(WheelOperation.RIGHT);
  assert.deepEqual(messages.map(message => message.speed), [1, 2, 3]);
});

test('offline preview never sends wheel commands', async () => {
  const { wheel, messages, WheelOperation } = await createWheelHarness();
  wheel.state.offlineMode = true;
  wheel.pressWheel(WheelOperation.FORWARD);
  assert.equal(messages.length, 0);
  assert.equal(wheel.wheelLevel, 0);
});

test('tap-to-ramp pure helper treats a changed direction as Level 1', async () => {
  const { nextTapSpeed } = await import(helperUrl);
  assert.equal(nextTapSpeed(null, 'POSITIVE', 0), 1);
  assert.equal(nextTapSpeed('POSITIVE', 'POSITIVE', 1), 2);
  assert.equal(nextTapSpeed('POSITIVE', 'POSITIVE', 2), 3);
  assert.equal(nextTapSpeed('POSITIVE', 'POSITIVE', 3), 3);
  assert.equal(nextTapSpeed('POSITIVE', 'NEGATIVE', 3), 1);
  assert.equal(nextTapSpeed(null, 'POSITIVE', 3), 1);
});
