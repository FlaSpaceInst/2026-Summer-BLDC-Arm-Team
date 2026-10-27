// Ensure web never mounts the native-only Lottie animation library.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appDirectory = path.resolve(__dirname, '../src/components/app');

function readFile(name) {
  return fs.readFileSync(path.join(appDirectory, name), 'utf8');
}

test('splash, connect, and loading screens use the platform-specific animation', () => {
  for (const name of ['Splash.js', 'IPConnect.js', 'LoadingScreen.js']) {
    const source = readFile(name);
    assert.match(source, /import LoadingAnimation from ['"]\.\/LoadingAnimation['"]/);
    assert.match(source, /<LoadingAnimation\b/);
    assert.doesNotMatch(source, /(?:from|require\()\s*['"]lottie-react-native['"]/);
  }
});

test('web implementation uses React Native Web primitives and supports play/reset', () => {
  const source = readFile('LoadingAnimation.web.js');
  assert.match(source, /ActivityIndicator/);
  assert.match(source, /React\.forwardRef/);
  assert.match(source, /React\.useImperativeHandle/);
  assert.match(source, /play\(\)/);
  assert.match(source, /reset\(\)/);
  assert.doesNotMatch(source, /lottie-react-native/);
});

test('native implementation retains existing Lottie animation', () => {
  assert.match(readFile('LoadingAnimation.native.js'), /from ['"]lottie-react-native['"]/);
});

test('splash logo uses Image resizeMode prop rather than deprecated style field', () => {
  assert.match(readFile('Splash.js'), /resizeMode="contain"/);
  const styles = fs.readFileSync(path.resolve(appDirectory, '../../styles/controller.js'), 'utf8');
  const splashSection = styles.split('splashFsiLogo:')[1].split('splashLoading:')[0];
  assert.doesNotMatch(splashSection, /resizeMode:/);
});
