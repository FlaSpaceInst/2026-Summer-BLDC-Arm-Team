'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/functionality/control-modes.js'), 'utf8');
const dataUrl = 'data:text/javascript,' + encodeURIComponent(source);
let helpers;
async function loadHelpers() {
  if (!helpers) {
    helpers = await import(dataUrl);
  }
  return helpers;
}

test('Arm button toggles drums and arm without removing wheel controls', async () => {
  const { getNextControlMode } = await loadHelpers();
  const arm = getNextControlMode('arm', 'drum', 'drum');
  assert.deepEqual(arm, {controlMode:'arm', previousControlMode:'drum'});
  const drums = getNextControlMode('arm', arm.controlMode, arm.previousControlMode);
  assert.equal(drums.controlMode, 'drum');
});

test('Camera toggles back to previous right-hand panel', async () => {
  const { getNextControlMode } = await loadHelpers();
  const camera = getNextControlMode('camera', 'arm', 'drum');
  assert.deepEqual(camera, {controlMode:'camera',previousControlMode:'arm'});
  assert.equal(getNextControlMode('camera', camera.controlMode, camera.previousControlMode).controlMode, 'arm');
});

test('Arm controls use the same ROS host as rover driving', async () => {
  const {getRosControlHost} = await loadHelpers();
  assert.equal(getRosControlHost('192.168.10.3:5000'), '192.168.10.3:5000');
  assert.equal(getRosControlHost('http://192.168.10.3:5000/'), '192.168.10.3:5000');
  assert.equal(getRosControlHost(''), '');
});

test('Wheel controls persist across drum arm and camera modes', () => {
  const rover = fs.readFileSync(path.join(__dirname, '../src/components/app/ControllerScreen.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');
  const armPanel = fs.readFileSync(path.join(__dirname, '../src/components/app/ArmControlPanel.js'), 'utf8');
  assert.match(rover, /Wheel buttons[\s\S]*?Keep the original rover drum panel/);
  assert.match(rover, /onPress=\{\(\) => this\.pressWheel\(WheelOperation\.FORWARD\)\}/);
  assert.doesNotMatch(rover, /onPressOut=\{\(\) => this\.stopWheels\(\)\}/);
  assert.match(rover, /onPress=\{\(\) => this\.stopWheels\(true\)\}/);
  assert.match(rover, /<ArmControlPanel/);
  assert.match(rover, /this\.renderCameraPanel\(\)/);
  assert.match(app, /name="Paver Arm Controller Screen"[\s\S]*?component=\{ControllerScreen\}/);
  assert.match(armPanel, /this\.sendCommand\(part, Operation\.STOP\)/);
  assert.doesNotMatch(rover + armPanel, /setInterval\([^)]*heartbeat|\/heartbeat/i);
});
