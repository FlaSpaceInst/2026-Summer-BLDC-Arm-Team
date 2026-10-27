'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const componentDirectory = path.join(__dirname, '../src/components/app');

for (const fileName of ['ControllerScreen.js', 'ArmControlPanel.js']) {
  test(`${fileName} does not overwrite React's isMounted method`, () => {
    const source = fs.readFileSync(path.join(componentDirectory, fileName), 'utf8');
    assert.doesNotMatch(source, /this\.isMounted\b/);
    assert.match(source, /this\.componentMounted = false;/);
    assert.match(source, /this\.componentMounted = true;/);
    assert.match(source, /componentWillUnmount\(\)\s*\{\s*this\.componentMounted = false;/);
  });
}

test('ControllerScreen checks the mounted flag after asynchronous startup', () => {
  const source = fs.readFileSync(path.join(componentDirectory, 'ControllerScreen.js'), 'utf8');
  assert.match(source, /async componentDidMount\(\)\s*\{\s*this\.componentMounted = true;/);
  assert.match(source, /await this\.getIpFromStorage\(\);\s*if \(!this\.componentMounted\)\s*\{\s*return;/);
});
