'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/app/ControllerScreen.js'), 'utf8');

function createHarness() {
  const editableStart = source.indexOf('  isEditableKeyboardTarget(target) {');
  const end = source.indexOf('  renderCameraPanel()', editableStart);
  assert.ok(editableStart >= 0 && end > editableStart);
  const classSource = 'class Harness {\n' + source.slice(editableStart, end) + '\n}\nthis.Harness = Harness;';
  const context = {};
  vm.runInNewContext(classSource, context);
  const harness = new context.Harness();
  harness.estopCount = 0;
  harness.emergencyStopAllControls = () => {
    harness.estopCount += 1;
  };
  return harness;
}

test('spacebar triggers the controller emergency stop once', () => {
  const harness = createHarness();
  let prevented = false;
  harness.handleEmergencyStopKey({
    code: 'Space', key: ' ', repeat: false, target: { tagName: 'DIV' },
    preventDefault() { prevented = true; }
  });
  assert.equal(harness.estopCount, 1);
  assert.equal(prevented, true);
});

test('spacebar does not trigger while typing or on key repeat', () => {
  const harness = createHarness();
  const inputEvent = {
    code: 'Space', key: ' ', repeat: false, target: { tagName: 'INPUT' },
    preventDefault() {}
  };
  harness.handleEmergencyStopKey(inputEvent);
  harness.handleEmergencyStopKey({
    code: 'Space', key: ' ', repeat: true, target: { tagName: 'DIV' },
    preventDefault() {}
  });
  assert.equal(harness.estopCount, 0);
});

test('non-space keys do not trigger emergency stop', () => {
  const harness = createHarness();
  harness.handleEmergencyStopKey({
    code: 'KeyA', key: 'a', repeat: false, target: { tagName: 'DIV' },
    preventDefault() {}
  });
  assert.equal(harness.estopCount, 0);
});
