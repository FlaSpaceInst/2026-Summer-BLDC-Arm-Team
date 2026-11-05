// Source-level regressions for crash fixes. Actual rendering must be tested in Expo.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}
test('fade component uses style array, not invalid indexed CSS properties', () => {
  const source = read('src/components/app/FadeInView.js');
  assert.match(source, /style=\{\[this\.props\.style,/);
  assert.doesNotMatch(source, /\.\.\.this\.props\.style/);
});
test('video style imports Platform for web', () => {
  assert.match(read('src/styles/video.js'), /import \{ StyleSheet, Platform \} from 'react-native'/);
});
test('native and web camera components are separate', () => {
  assert.match(read('src/components/app/CameraFeed.web.js'), /iframe/);
  assert.match(read('src/components/app/CameraFeed.native.js'), /react-native-webview/);
});
test('original NASA/paver imagery remain and no heartbeat is present', () => {
  const source = read('src/components/app/ControllerScreenPaverArm.js');
  assert.match(source, /PaverArmShoulder\.png/);
  assert.match(source, /NASA/);
  assert.match(read('src/components/app/ArmControlPanel.js'), /CHECK ROS/);
  assert.match(source, /Gripper/);
  assert.doesNotMatch(source, /heartbeat|setInterval/i);
});
