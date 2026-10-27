const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const layoutFile = path.join(root, 'src/functionality/web-layout.js');
const sandbox = {};
const source = fs.readFileSync(layoutFile, 'utf8').replace(/^export /gm, '');
vm.runInNewContext(source + '\nthis.getWebLayout = getWebLayout;', sandbox);
const getWebLayout = sandbox.getWebLayout;

const sizes = [
  { width: 360, height: 640, compact: true, stacked: true, phone: true },
  { width: 768, height: 800, compact: false, stacked: true, phone: false },
  { width: 1024, height: 768, compact: false, stacked: true, phone: false },
  { width: 1440, height: 900, compact: false, stacked: false, phone: false }
];

for (const size of sizes) {
  test(`web viewport ${size.width}x${size.height} uses correct layout`, () => {
    const layout = getWebLayout(size.width, size.height, 'web');
    assert.equal(layout.isWeb, true);
    assert.equal(layout.isCompact, size.compact);
    assert.equal(layout.isStacked, size.stacked);
    assert.equal(layout.isPhone, size.phone);
    assert.equal(layout.viewportMinHeight, size.height);
    assert.ok(layout.titleHeight > 0);
    assert.ok(layout.ipFontSize >= 19);
    assert.ok(layout.cameraFeedHeight > 0);
  });
}

test('narrow web screens stack connect actions and permit scrolling', () => {
  const layout = getWebLayout(390, 560, 'web');
  assert.equal(layout.isPhone, true);
  assert.equal(layout.isShort, true);
  assert.equal(layout.buttonDirection, 'column');
  assert.equal(layout.primaryButtonWidth, '100%');
  assert.equal(layout.secondaryButtonWidth, '100%');
  assert.equal(layout.cameraScreenHeight, 780);
});

test('native breakpoints do not force web-only layouts', () => {
  for (const platform of ['ios', 'android']) {
    const layout = getWebLayout(390, 560, platform);
    assert.equal(layout.isWeb, false);
    assert.equal(layout.isStacked, false);
    assert.equal(layout.isCompact, false);
    assert.equal(layout.viewportMinHeight, undefined);
  }
});

test('all individual page components retain responsive or bounded layouts', () => {
  const components = [
    'Splash.js', 'IPConnect.js', 'ConnectionHelp.js', 'ConnectionStatus.js',
    'LoadingScreen.js', 'ControllerScreen.js', 'ControllerScreenPaverArm.js',
    'VideoController.js', 'InformationController.js'
  ];
  for (const name of components) {
    const content = fs.readFileSync(path.join(root, 'src/components/app', name), 'utf8');
    assert.ok(content.includes('ScrollView') || content.includes('useWindowDimensions'), `${name} missing responsive container`);
  }
});

test('the browser controller keeps manual commands, without heartbeat', () => {
  const files = [
    'ControllerScreen.js', 'ControllerScreenPaverArm.js', 'VideoController.js'
  ];
  for (const name of files) {
    const content = fs.readFileSync(path.join(root, 'src/components/app', name), 'utf8');
    assert.equal(content.includes("setInterval(() => this.sendHeartbeat"), false);
  }
});
