'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.join(__dirname, '..');
const screenSource = fs.readFileSync(path.join(projectRoot, 'src/components/app/ConnectionStatus.js'), 'utf8');
const styleSource = fs.readFileSync(path.join(projectRoot, 'src/styles/controller.js'), 'utf8');

function loadStyles() {
  const strippedSource = styleSource
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/export default ControllerStyle;/, 'globalThis.testStyle = ControllerStyle;');

  const context = {
    Platform: {
      select(choices) {
        if (choices.web) {
          return choices.web;
        }
        return {};
      }
    },
    StyleSheet: {
      create(styles) {
        return styles;
      }
    },
    normalize(value) {
      return value;
    }
  };

  vm.runInNewContext(strippedSource, context, { filename: 'controller.js' });
  return context.testStyle;
}

const styles = loadStyles();

test('both rover success and failure render from the same status component', () => {
  assert.match(screenSource, /SUCCESSFULLY CONNECTED TO ROVER/);
  assert.match(screenSource, /CONNECTION TO ROVER FAILED/);
  assert.match(screenSource, /currentScreen\.text/);
  assert.match(screenSource, /currentScreen\.img/);
});

test('connection status screen scrolls instead of clipping on short windows', () => {
  assert.match(screenSource, /<ScrollView/);
  assert.equal(styles.statusScreenContent.flexGrow, 1);
  assert.equal(styles.statusScreenBody.flexGrow, 1);
  assert.ok(styles.statusScreenScroll.flex === 1);
  assert.ok(styles.statusScreenCardShort.minHeight < styles.statusScreenCard.minHeight);
});

test('status card uses bounded dimensions rather than percentage heights', () => {
  assert.equal(styles.statusScreenCard.width, '100%');
  assert.ok(styles.statusScreenCard.maxWidth <= 680);
  assert.equal(styles.statusScreenCard.height, undefined);
  assert.ok(styles.statusScreenCard.minHeight >= 200);
  assert.ok(Number.isInteger(styles.statusScreenIcon.height));
  assert.ok(styles.statusScreenAction.minHeight >= 48);
});

test('desktop resize changes responsive styles and keeps help available', () => {
  assert.match(screenSource, /Dimensions\.addEventListener\('change'/);
  assert.match(screenSource, /viewportWidth < 720/);
  assert.match(screenSource, /viewportHeight < 560/);
  assert.match(screenSource, /statusScreenMessageCompact/);
  assert.match(screenSource, /statusScreenCardShort/);
  assert.match(screenSource, /Connection Help Screen/);
});

test('status actions remain correct with no heartbeat or reset protocol', () => {
  assert.match(screenSource, /redirect: 'Controller Screen'/);
  assert.match(screenSource, /redirect: 'IPConnect Screen'/);
  assert.match(screenSource, /buttonTxt: 'RETRY'/);
  assert.doesNotMatch(screenSource, /heartbeat|setInterval|\/reset/i);
});

test('screen uses NASA font and original colors', () => {
  assert.equal(styles.statusScreenTitleText.fontFamily, 'NASA');
  assert.equal(styles.statusScreenMessage.fontFamily, 'NASA');
  assert.equal(styles.statusScreenActionText.fontFamily, 'NASA');
  assert.equal(styles.statusScreenScroll.backgroundColor, '#2E3030');
  assert.equal(styles.statusScreenTitle.backgroundColor, '#4a4d4e');
});
