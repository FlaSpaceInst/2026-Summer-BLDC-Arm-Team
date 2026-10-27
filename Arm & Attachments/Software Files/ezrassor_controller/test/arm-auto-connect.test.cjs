'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/app/ArmControlPanel.js'), 'utf8');

// Run the component's real connection methods without a native React renderer.
// The JSX render methods are excluded because no visual component is needed here.
function createPanel(options = {}) {
  const fetchCalls = [];
  const storedAddresses = [];
  const props = {
    roverIp: options.roverIp || '127.0.0.1:3000',
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

    executeRobotCommand() {
      return Promise.resolve();
    }

    allStop() {
      return Promise.resolve();
    }
  }

  const AsyncStorage = {
    getItem() {
      if (options.savedAddressPromise) {
        return options.savedAddressPromise;
      }
      return Promise.resolve(options.savedAddress || null);
    },
    setItem(key, value) {
      storedAddresses.push({ key, value });
      if (options.storageWriteFails) {
        return Promise.reject(new Error('Storage unavailable'));
      }
      return Promise.resolve();
    }
  };
  const fetch = (url, settings) => {
    fetchCalls.push({ url, settings });
    if (options.fetchImpl) {
      return options.fetchImpl(url, settings);
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ armOpen: true, handOpen: true, wheelsOpen: false, baseEnabled: false })
    });
  };

  const start = source.indexOf('export default class ArmControlPanel');
  const end = source.indexOf('  renderJoint(', start);
  assert.ok(start >= 0 && end > start);
  const classSource = source.slice(start, end)
    .replace('export default class ArmControlPanel', 'class ArmControlPanel') + '\n}\nthis.ArmControlPanel = ArmControlPanel;';

  const context = {
    React: { Component },
    AsyncStorage,
    EZARM,
    fetch,
    roverFetch: fetch,
    AbortController,
    setTimeout,
    clearTimeout,
    Robot: { PLATE:'plate', ALL:'all' },
    Operation: { STOP:'STOP' },
    getDefaultArmBridgeHost(roverIp) {
      if (!roverIp) {
        return '127.0.0.1:3000';
      }
      const hostname = roverIp.replace(/^https?:\/\//, '').split('/')[0].split(':')[0];
      return hostname + ':3000';
    }
  };

  vm.runInNewContext(classSource, context, { filename: 'ArmControlPanel.js' });
  return { panel: new context.ArmControlPanel(props), fetchCalls, storedAddresses };
}

async function flushPromises() {
  await new Promise((resolve) => setImmediate(resolve));
}

test('entering Arm Mode automatically checks the bridge and unlocks connected arm/hand', async () => {
  const { panel, fetchCalls } = createPanel();
  await panel.componentDidMount();
  await flushPromises();
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'http://127.0.0.1:3000/health');
  assert.equal(panel.state.bridgeReady, true);
  assert.equal(panel.state.statusMessage, 'ARM + HAND CONNECTED');
  assert.equal(panel.state.baseAvailable, false);
  panel.componentWillUnmount();
});

test('entering Arm Mode loads saved bridge address before connecting', async () => {
  const { panel, fetchCalls, storedAddresses } = createPanel({
    roverIp: '192.168.10.3:5000',
    savedAddress: '192.168.10.25:3000'
  });
  await panel.componentDidMount();
  await flushPromises();
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'http://192.168.10.25:3000/health');
  assert.equal(panel.armService.host, '192.168.10.25:3000');
  assert.deepEqual(storedAddresses, [{ key:'armBridgeIp', value:'192.168.10.25:3000' }]);
  panel.componentWillUnmount();
});

test('explicit mock port 3000 takes priority over a previous saved bridge IP', async () => {
  const { panel, fetchCalls } = createPanel({
    roverIp: '127.0.0.1:3000',
    savedAddress: '192.168.10.99:3000'
  });
  await panel.componentDidMount();
  await flushPromises();
  assert.equal(fetchCalls.length, 1);
  assert.equal(fetchCalls[0].url, 'http://127.0.0.1:3000/health');
  assert.equal(panel.state.bridgeReady, true);
  panel.componentWillUnmount();
});

test('offline preview never probes or enables physical motor controls', async () => {
  const { panel, fetchCalls } = createPanel({ offlineMode: true });
  await panel.componentDidMount();
  await flushPromises();
  assert.equal(fetchCalls.length, 0);
  assert.equal(panel.state.bridgeReady, false);
  assert.match(panel.state.statusMessage, /OFFLINE PREVIEW/);
  panel.componentWillUnmount();
});

test('both Arduino connections must be open to enable controls', async () => {
  const { panel } = createPanel({ fetchImpl: async () => ({
    ok: true,
    json: async () => ({ armOpen: true, handOpen: false, wheelsOpen: false })
  }) });
  await panel.componentDidMount();
  await flushPromises();
  assert.equal(panel.state.bridgeReady, false);
  assert.match(panel.state.statusMessage, /disconnected/);
  panel.componentWillUnmount();
});

test('base movement remains disabled unless separately authorized by bridge', async () => {
  const { panel } = createPanel({ fetchImpl: async () => ({
    ok: true,
    json: async () => ({ armOpen: true, handOpen: true, wheelsOpen: true, baseEnabled: false })
  }) });
  await panel.componentDidMount();
  await flushPromises();
  assert.equal(panel.state.bridgeReady, true);
  assert.equal(panel.state.baseAvailable, false);
  panel.componentWillUnmount();
});

test('storage write failure does not undo a valid connection', async () => {
  const { panel } = createPanel({ storageWriteFails: true });
  await panel.componentDidMount();
  await flushPromises();
  assert.equal(panel.state.bridgeReady, true);
  panel.componentWillUnmount();
});

test('a stale check cannot enable controls after address is changed', async () => {
  let resolveFetch;
  const { panel } = createPanel({ fetchImpl: () => new Promise((resolve) => {
    resolveFetch = resolve;
  }) });
  await panel.componentDidMount();
  panel.bridgeCheckId += 1;
  panel.setState({ bridgeIp:'192.168.10.100:3000', bridgeReady:false });
  resolveFetch({ ok:true, json:async () => ({ armOpen:true, handOpen:true }) });
  await flushPromises();
  assert.equal(panel.state.bridgeReady, false);
  panel.componentWillUnmount();
});

test('a check result after unmount cannot reenable controls', async () => {
  let resolveFetch;
  const { panel } = createPanel({ fetchImpl: () => new Promise((resolve) => {
    resolveFetch = resolve;
  }) });
  await panel.componentDidMount();
  panel.componentWillUnmount();
  resolveFetch({ ok:true, json:async () => ({ armOpen:true, handOpen:true }) });
  await flushPromises();
  assert.equal(panel.state.bridgeReady, false);
});

test('updated rover host is checked when there is no saved arm bridge', async () => {
  const { panel, fetchCalls } = createPanel({ roverIp:'192.168.10.3:5000' });
  await panel.componentDidMount();
  await flushPromises();
  // Recreate the situation where the rover address becomes available after mount.
  panel.savedBridgeIp = false;
  const previousProps = panel.props;
  panel.props = { ...panel.props, roverIp:'192.168.10.5:5000' };
  panel.componentDidUpdate(previousProps);
  await flushPromises();
  assert.equal(fetchCalls.at(-1).url, 'http://192.168.10.5:3000/health');
  assert.equal(panel.state.bridgeReady, true);
  panel.componentWillUnmount();
});

test('bridge check is on-entry only, with no movement heartbeat interval', () => {
  assert.match(source, /this\.checkBridge\(bridgeIp\)/);
  assert.doesNotMatch(source, /setInterval\s*\(/);
  assert.doesNotMatch(source, /\/heartbeat/i);
  assert.match(source, /this\.bridgeCheckId \+= 1; this\.addressEdited = true/);
});
