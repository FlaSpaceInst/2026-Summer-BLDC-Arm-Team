'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/app/ArmControlPanel.js'), 'utf8');

function getRosControlHost(roverIp) {
  if (typeof roverIp !== 'string') {
    return '';
  }
  let address = roverIp.trim().replace(/^https?:\/\//, '').split('/')[0];
  if (!address) {
    return '';
  }
  if (!address.includes(':')) {
    address += ':5000';
  }
  return address;
}

function createPanel(options = {}) {
  const fetchCalls = [];
  const commands = [];
  const props = {
    roverIp: options.roverIp === undefined ? '192.168.10.3:5000' : options.roverIp,
    offlineMode: options.offlineMode === true
  };
  class Component {
    constructor(componentProps) {
      this.props = componentProps;
      this.state = {};
    }
    setState(patch, callback) {
      this.state = { ...this.state, ...patch };
      if (callback) {
        callback();
      }
    }
  }
  class EZARM {
    constructor(host) {
      this.host = host;
    }
    executeRobotCommand(part, operation, speed) {
      commands.push({ host: this.host, part, operation, speed });
      return Promise.resolve();
    }
    setSpeed(part, speed) {
      commands.push({ host: this.host, part, operation: 'SPEED_ONLY', speed });
      return Promise.resolve();
    }
    allStop() {
      commands.push({ host: this.host, part: 'all', operation: 'STOP' });
      return Promise.resolve();
    }
  }
  const roverFetch = (url, settings) => {
    fetchCalls.push({ url, settings });
    if (options.fetchImpl) {
      return options.fetchImpl(url, settings);
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ ready: true, armOpen: true, handOpen: true, wheelsOpen: true, baseEnabled: false, serialProtocol: 'binary' })
    });
  };
  const start = source.indexOf('export default class ArmControlPanel');
  const end = source.indexOf('  renderJoint(', start);
  assert.ok(start >= 0 && end > start);
  const classSource = source.slice(start, end)
    .replace('export default class ArmControlPanel', 'class ArmControlPanel') + '\n}\nthis.ArmControlPanel = ArmControlPanel;';
  const context = {
    React: { Component }, EZARM, roverFetch, AbortController, setTimeout, clearTimeout,
    Robot: { PLATE: 'plate', ALL: 'all', ENDEFFECTOR: 'hand', SHOULDER: 'shoulder', FOREARM: 'forearm' },
    Operation: { STOP: 'STOP', POSITIVE: 'POSITIVE', NEGATIVE: 'NEGATIVE' },
    nextTapSpeed: (current, next, level) => current === next && level >= 1 ? Math.min(level + 1, 3) : 1,
    getRosControlHost
  };
  vm.runInNewContext(classSource, context, { filename: 'ArmControlPanel.js' });
  return { panel: new context.ArmControlPanel(props), fetchCalls, commands };
}
async function flush() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('Arm Mode automatically checks the ROS 2 host on port 5000', async () => {
  const { panel, fetchCalls } = createPanel();
  panel.componentDidMount();
  await flush();
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'http://192.168.10.3:5000/health');
  assert.equal(panel.state.rosReady, true);
  assert.match(panel.state.statusMessage, /ROS 2: ARM \+ HAND CONNECTED/);
  assert.equal(panel.armService.host, '192.168.10.3:5000');
  panel.componentWillUnmount();
});

test('offline preview never checks ROS or enables motors', async () => {
  const { panel, fetchCalls } = createPanel({ offlineMode: true });
  panel.componentDidMount();
  await flush();
  assert.equal(fetchCalls.length, 0);
  assert.equal(panel.state.rosReady, false);
  panel.componentWillUnmount();
});

test('missing rover address fails closed', async () => {
  const { panel, fetchCalls } = createPanel({ roverIp: '' });
  panel.componentDidMount();
  await flush();
  assert.equal(fetchCalls.length, 0);
  assert.equal(panel.state.rosReady, false);
  assert.match(panel.state.statusMessage, /CONNECT TO THE ROVER/);
  panel.componentWillUnmount();
});

test('health must have both boards connected and ready', async () => {
  const { panel } = createPanel({ fetchImpl: async () => ({
    ok: true,
    json: async () => ({ serialProtocol: 'binary', ready: false, armOpen: true, handOpen: false })
  }) });
  panel.componentDidMount();
  await flush();
  assert.equal(panel.state.rosReady, false);
  assert.match(panel.state.statusMessage, /ROS UNAVAILABLE/);
  panel.componentWillUnmount();
});

test('the old Node bridge health shape is rejected', async () => {
  const { panel } = createPanel({ fetchImpl: async () => ({
    ok: true,
    json: async () => ({ armOpen: true, handOpen: true, ready: true, protocol: 'press-stop' })
  }) });
  panel.componentDidMount();
  await flush();
  assert.equal(panel.state.rosReady, false);
  assert.match(panel.state.statusMessage, /binary serial driver/);
  panel.componentWillUnmount();
});

test('base remains disabled until ROS wheel status explicitly enables it', async () => {
  const { panel } = createPanel();
  panel.componentDidMount();
  await flush();
  assert.equal(panel.state.rosReady, true);
  assert.equal(panel.state.baseAvailable, false);
  panel.componentWillUnmount();
});

test('arm taps use ROS and STOP resets speed', async () => {
  const { panel, commands } = createPanel();
  panel.componentDidMount();
  await flush();
  panel.pressMotion('shoulder', 'POSITIVE', 'Shoulder Up');
  assert.equal(panel.state.armSpeed, 1);
  panel.stopMotion();
  assert.equal(panel.state.armSpeed, 0);
  await flush();
  assert.deepEqual(commands.map(command => [command.host, command.operation]), [
    ['192.168.10.3:5000', 'POSITIVE'],
    ['192.168.10.3:5000', 'STOP']
  ]);
  panel.componentWillUnmount();
});

test('changing rover IP switches the ROS host and ignores stale health', async () => {
  let resolveOld;
  const { panel, fetchCalls } = createPanel({ fetchImpl: (url) => {
    if (url.includes('192.168.10.3')) {
      return new Promise(resolve => { resolveOld = resolve; });
    }
    return Promise.resolve({ ok:true, json: async () => ({serialProtocol:'binary', ready:true, armOpen:true, handOpen:true}) });
  } });
  panel.componentDidMount();
  const oldProps = panel.props;
  panel.props = { ...oldProps, roverIp:'192.168.10.20:5000' };
  panel.componentDidUpdate(oldProps);
  await flush();
  assert.equal(panel.state.rosReady, true);
  assert.equal(panel.armService.host, '192.168.10.20:5000');
  resolveOld({ ok:true, json: async () => ({serialProtocol:'binary', ready:true, armOpen:true, handOpen:true}) });
  await flush();
  assert.equal(panel.armService.host, '192.168.10.20:5000');
  assert.equal(panel.state.rosReady, true);
  assert.equal(fetchCalls.length, 2);
  panel.componentWillUnmount();
});

test('no saved bridge address or separate port 3000 is used by active Arm Mode', () => {
  assert.doesNotMatch(source, /armBridgeIp|AsyncStorage|:3000|CHECK BRIDGE/);
  assert.match(source, /this\.checkRos\(\)/);
  assert.match(source, /STOP REQUESTED/);
});

test('repeated shoulder taps send speed-only updates and cap at level 3', async () => {
  const { panel, commands } = createPanel();
  panel.componentDidMount();
  await flush();
  for (let i = 0; i < 4; i += 1) {
    panel.pressMotion('shoulder', 'POSITIVE', 'Shoulder Up');
  }
  await flush();
  assert.deepEqual(commands.map(command => [command.operation, command.speed]), [
    ['POSITIVE', 1], ['SPEED_ONLY', 2], ['SPEED_ONLY', 3]
  ]);
  assert.equal(panel.state.armSpeed, 3);
  panel.stopMotion();
  assert.equal(panel.state.armSpeed, 0);
  panel.pressMotion('shoulder', 'POSITIVE', 'Shoulder Up');
  await flush();
  assert.deepEqual(commands.at(-1).operation, 'POSITIVE');
  assert.equal(commands.at(-1).speed, 1);
  panel.componentWillUnmount();
});

test('direction reversal issues STOP before restarting at level 1', async () => {
  const { panel, commands } = createPanel();
  panel.componentDidMount();
  await flush();
  panel.pressMotion('shoulder', 'POSITIVE', 'Shoulder Up');
  panel.pressMotion('shoulder', 'POSITIVE', 'Shoulder Up');
  panel.pressMotion('shoulder', 'NEGATIVE', 'Shoulder Down');
  await flush();
  assert.deepEqual(commands.map(command => command.operation), [
    'POSITIVE', 'SPEED_ONLY', 'STOP', 'NEGATIVE'
  ]);
  assert.equal(commands.at(-1).speed, 1);
  panel.componentWillUnmount();
});

test('repeated gripper taps restart the finite-duration gripper pulse', async () => {
  const { panel, commands } = createPanel();
  panel.componentDidMount();
  await flush();
  panel.pressMotion('hand', 'POSITIVE', 'Gripper Open');
  panel.pressMotion('hand', 'POSITIVE', 'Gripper Open');
  panel.pressMotion('hand', 'POSITIVE', 'Gripper Open');
  await flush();
  assert.deepEqual(commands.map(command => [command.operation, command.speed]), [
    ['POSITIVE', 1], ['POSITIVE', 2], ['POSITIVE', 3]
  ]);
  panel.emergencyStop();
  assert.equal(panel.state.armSpeed, 0);
  panel.componentWillUnmount();
});
