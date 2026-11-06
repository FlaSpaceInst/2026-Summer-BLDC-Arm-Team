const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const components = path.resolve(__dirname, '../src/components/app');
function readComponent(fileName) {
  return fs.readFileSync(path.join(components, fileName), 'utf8');
}

test('Connect page uses a separate bounded browser layout without legacy positioning', () => {
  const code = readComponent('IPConnect.js');
  const start = code.indexOf('renderWebConnect() {');
  const end = code.indexOf('\n  render() {', start);
  assert.ok(start >= 0 && end > start);
  const webCode = code.slice(start, end);
  assert.match(webCode, /maxWidth: 650/);
  assert.match(webCode, /flexDirection: actionDirection/);
  assert.doesNotMatch(webCode, /ControllerStyle\.screenLayout/);
  assert.doesNotMatch(webCode, /ControllerStyle\.connectionBody/);
  assert.doesNotMatch(webCode, /position: 'absolute'/);
  assert.match(code, /Platform\.OS === 'web'[\s\S]*?return this\.renderWebConnect\(\)/);
});

test('Arm controls have bounded columns and restore side-by-side wide layout', () => {
  const code = readComponent('ControllerScreenPaverArm.js');
  assert.match(code, /screenWidth: Dimensions\.get\('window'\)\.width/);
  assert.match(code, /maxWidth: 610/);
  assert.match(code, /maxWidth: 650/);
  assert.match(code, /this\.getBodyDirection\(\)/);
  assert.doesNotMatch(code, /minHeight: 900/);
  assert.doesNotMatch(code, /maxWidth: 1500, alignSelf: 'center' \},\s*webLayout\.isStacked/);
});

test('Web and native dialog implementations are platform-specific', () => {
  const browser = readComponent('ControllerModal.web.js');
  const native = readComponent('ControllerModal.native.js');
  assert.match(browser, /Modal, Pressable, ScrollView, View/);
  assert.match(browser, /visible=\{props\.isVisible\}/);
  assert.doesNotMatch(browser, /react-native-modal/);
  assert.match(native, /react-native-modal/);
  for (const fileName of ['ControllerScreen.js', 'ControllerScreenPaverArm.js', 'VideoController.js']) {
    assert.match(readComponent(fileName), /import Modal from '\.\/ControllerModal';/);
  }
});

test('Camera mode uses the combined controller and keeps offline mode safe', () => {
  const rover = readComponent('ControllerScreen.js');
  const app = fs.readFileSync(path.resolve(__dirname, '../App.js'), 'utf8');
  assert.match(rover, /if \(this\.state\.offlineMode\) \{\s*return;/);
  assert.match(rover, /if \(roverIp && !this\.state\.offlineMode\)/);
  assert.match(rover, /this\.switchControlMode\('camera'\)/);
  assert.match(rover, /this\.renderCameraPanel\(\)/);
  assert.match(app, /name="Video Controller Screen"[\s\S]*?component=\{ControllerScreen\}/);
  assert.doesNotMatch(app, /import VideoController/);
});
