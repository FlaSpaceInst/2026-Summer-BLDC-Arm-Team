'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = (fileName) => fs.readFileSync(path.join(root, fileName), 'utf8');
const dots = source('src/components/app/SpeedDots.js');
const style = source('src/styles/controller.js');
const wheels = source('src/components/app/ControllerScreen.js');
const arm = source('src/components/app/ArmControlPanel.js');

function createWheelIndicatorHarness() {
  const begin = wheels.indexOf('  getWheelIndicatorLevels() {');
  const end = wheels.indexOf('  stopWheels(force = false) {', begin);
  assert.ok(begin >= 0 && end > begin, 'wheel mapping must precede stopWheels');
  const WheelOperation = {
    FORWARD: 'FORWARD', BACKWARD: 'BACKWARD', LEFT: 'LEFT', RIGHT: 'RIGHT'
  };
  const context = { WheelOperation };
  vm.runInNewContext('class Harness {\n' + wheels.slice(begin, end) + '\n}\nthis.Harness = Harness;', context);
  const instance = new context.Harness();
  instance.state = { wheelSpeed: 0 };
  instance.wheelMoving = false;
  instance.wheelOperation = null;
  return { instance, WheelOperation };
}

test('original EXE circle styles and side placement are reproduced exactly', () => {
  assert.match(style, /circle:\s*\{\s*width: 5,\s*height: 5,\s*borderRadius: 5,\s*backgroundColor: '#5b5b5b',\s*margin: 5/);
  assert.match(style, /positiveCircle:\s*\{\s*backgroundColor: '#70fc00'/);
  assert.match(style, /negativeCircle:\s*\{\s*backgroundColor: '#ff3636'/);
  assert.match(style, /circleOverlayVerticalLeft:\s*\{[^}]*right: 0/);
  assert.match(style, /circleOverlayVerticalRight:\s*\{[^}]*left: 0/);
  assert.match(dots, /const indicatorLevels = \[3, 2, 1\]/);
  assert.match(style, /flexDirection: 'column'/);
});

test('dots fill bottom-to-top for forward and top-to-bottom for reverse', () => {
  assert.match(dots, /signedLevel >= indicatorLevel/);
  assert.match(dots, /signedLevel <= -\(4 - indicatorLevel\)/);
  assert.match(dots, /ControllerStyle\.positiveCircle/);
  assert.match(dots, /ControllerStyle\.negativeCircle/);
  assert.match(dots, /Math\.max\(-3, Math\.min\(3/);
  assert.match(dots, /pointerEvents="none"/);
});

test('wheel indicators are embedded inside left and right turn buttons nearest STOP', () => {
  assert.match(wheels, /chevron-left[^\n]*\n\s*<SpeedDots\s*\n\s*level=\{this\.getWheelIndicatorLevels\(\)\.left\}\s*\n\s*side="right"/);
  assert.match(wheels, /chevron-right[^\n]*\n\s*<SpeedDots\s*\n\s*level=\{this\.getWheelIndicatorLevels\(\)\.right\}\s*\n\s*side="left"/);
  assert.doesNotMatch(wheels, /renderWheelSpeed\(\)/);
  assert.match(wheels, /this\.setState\(\{ wheelSpeed: 0 \}\)/);
});

test('left and right wheel dots reflect signed direction when turning', () => {
  const { instance, WheelOperation } = createWheelIndicatorHarness();
  instance.wheelMoving = true;
  instance.state.wheelSpeed = 2;
  const expected = new Map([
    [WheelOperation.FORWARD, [2, 2]],
    [WheelOperation.BACKWARD, [-2, -2]],
    [WheelOperation.LEFT, [-2, 2]],
    [WheelOperation.RIGHT, [2, -2]]
  ]);
  for (const [operation, values] of expected) {
    instance.wheelOperation = operation;
    const actual = instance.getWheelIndicatorLevels();
    assert.deepEqual([actual.left, actual.right], values);
  }
  instance.wheelMoving = false;
  const stopped = instance.getWheelIndicatorLevels();
  assert.equal(stopped.left, 0);
  assert.equal(stopped.right, 0);
});

test('each arm direction button contains the embedded original indicator', () => {
  assert.match(arm, /<FontAwesome name=\{icon\} size=\{24\} color="#fff" \/>\s*<SpeedDots/);
  assert.match(arm, /indicatorSide = 'right'/);
  assert.match(arm, /if \(operation === Operation\.NEGATIVE\) \{\s*indicatorSide = 'left'/);
  assert.match(arm, /indicatorLevel = -indicatorLevel/);
  assert.match(arm, /this\.activePart === part && this\.activeOperation === operation/);
  assert.match(arm, /armSpeed: 0/);
  assert.doesNotMatch(arm, /renderArmSpeed\(\)/);
});
