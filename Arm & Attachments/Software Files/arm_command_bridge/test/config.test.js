'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { readSerialConfiguration } = require('../src/config');

test('arm and hand require different ports, wheels are optional', () => {
  const config = readSerialConfiguration({ ARM_SERIAL_PORT: '/dev/ttyACM0', HAND_SERIAL_PORT: '/dev/ttyACM1' });
  assert.equal(config.armPath, '/dev/ttyACM0');
  assert.equal(config.handPath, '/dev/ttyACM1');
  assert.equal(config.wheelsPath, '');
  assert.equal(config.baudRate, 115200);
  assert.equal(config.httpPort, 3000);
});

test('wheels can use a third distinct device when ownership is exclusive', () => {
  const config = readSerialConfiguration({ ARM_SERIAL_PORT: 'COM4', HAND_SERIAL_PORT: 'COM5', WHEELS_SERIAL_PORT: 'COM6' });
  assert.equal(config.wheelsPath, 'COM6');
});

test('never open the same serial device for multiple Arduinos', () => {
  assert.throws(() => readSerialConfiguration({ ARM_SERIAL_PORT: 'COM4', HAND_SERIAL_PORT: 'COM4' }), /different serial/);
  assert.throws(() => readSerialConfiguration({ ARM_SERIAL_PORT: 'com4', HAND_SERIAL_PORT: 'COM4' }), /different serial/);
  assert.throws(() => readSerialConfiguration({ ARM_SERIAL_PORT: 'COM4', HAND_SERIAL_PORT: 'COM5', WHEELS_SERIAL_PORT: 'COM5' }), /different serial/);
});

test('missing required boards are rejected', () => {
  assert.throws(() => readSerialConfiguration({ ARM_SERIAL_PORT: 'COM4' }), /required/);
  assert.throws(() => readSerialConfiguration({ HAND_SERIAL_PORT: 'COM5' }), /required/);
  assert.throws(() => readSerialConfiguration({ SERIAL_PORT: 'COM4' }), /required/);
});

test('invalid HTTP and serial settings are rejected', () => {
  const defaults = { ARM_SERIAL_PORT: 'COM4', HAND_SERIAL_PORT: 'COM5' };
  assert.throws(() => readSerialConfiguration({ ...defaults, HTTP_PORT: 'not-a-port' }), /HTTP_PORT/);
  assert.throws(() => readSerialConfiguration({ ...defaults, HTTP_PORT: '70000' }), /HTTP_PORT/);
  assert.throws(() => readSerialConfiguration({ ...defaults, SERIAL_BAUD_RATE: '0' }), /SERIAL_BAUD_RATE/);
});
