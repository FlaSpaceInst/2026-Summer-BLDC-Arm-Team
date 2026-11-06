'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const { once } = require('node:events');
const {
  createMockRosServer, splitAndValidate, JOINT_BYTES, SPEED_BYTES, WHEEL_BYTES
} = require('../mock_ros_server.cjs');

async function withServer(callback, options = {}) {
  const mock = createMockRosServer({ quiet: true, ...options });
  mock.server.listen(0, '127.0.0.1');
  await once(mock.server, 'listening');
  const baseUrl = `http://127.0.0.1:${mock.server.address().port}`;
  try {
    await callback(mock, baseUrl);
  } finally {
    mock.shutdown();
    await once(mock.server, 'close');
  }
}

async function requestJson(baseUrl, endpoint = '/', payload = {}) {
  const response = await fetch(baseUrl + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return { response, result: await response.json() };
}

function sent(mock, target) {
  return mock.state.events
    .filter((event) => event.category === 'serial-tx' && (!target || event.target === target))
    .map((event) => event.byte);
}

test('GET /, /health and CORS match the ROS controller interface', async () => {
  await withServer(async (mock, url) => {
    const home = await fetch(url + '/');
    assert.equal(home.status, 200);
    assert.deepEqual(await home.json(), { status: 200 });
    const health = await fetch(url + '/health');
    assert.deepEqual(await health.json(), {
      success: true, ready: true, armOpen: true, handOpen: true,
      wheelsOpen: true, baseEnabled: false,
      protocol: 'press-stop', serialProtocol: 'binary'
    });
    assert.equal(health.headers.get('access-control-allow-origin'), '*');
    const options = await fetch(url + '/', { method: 'OPTIONS' });
    assert.equal(options.status, 200);
  });
});

test('first wheel tap sends speed and direction; subsequent taps send only changed speed', async () => {
  await withServer(async (mock, url) => {
    for (const speed of [1, 2, 3, 3]) {
      const { response } = await requestJson(url, '/', { wheel_action: { linear_x: speed, angular_z: 0 } });
      assert.equal(response.status, 200);
    }
    assert.deepEqual(sent(mock, 'wheels'), [0x19, 0x01, 0x1a, 0x1b]);
    assert.deepEqual(mock.state.wheels, { direction: 'FWD', speed: 3, left: 3, right: 3 });
    const { result } = await requestJson(url, '/', { wheel_action: { linear_x: 0, angular_z: 0 } });
    assert.deepEqual(result, { status: 200 });
    assert.deepEqual(sent(mock, 'wheels'), [0x19, 0x01, 0x1a, 0x1b, 0x00]);
    assert.equal(mock.state.wheels.speed, 0);
  });
});

test('changing wheel direction issues STOP and then speed-1 reverse', async () => {
  await withServer(async (mock, url) => {
    await requestJson(url, '/', { wheel_action: { linear_x: 3, angular_z: 0 } });
    await requestJson(url, '/', { wheel_action: { linear_x: -1, angular_z: 0 } });
    assert.deepEqual(sent(mock, 'wheels'), [0x1b, 0x01, 0x00, 0x19, 0x02]);
    assert.deepEqual(mock.state.wheels, { direction: 'REV', speed: 1, left: -1, right: -1 });
    await requestJson(url, '/', { wheel_action: { linear_x: 0, angular_z: 2 } });
    assert.deepEqual(mock.state.wheels, { direction: 'LEFT', speed: 2, left: -2, right: 2 });
  });
});

test('arm speed, motion, speed-only update and STOP map to Arm serial bytes', async () => {
  await withServer(async (mock, url) => {
    const input = { shoulder_joint_speed: 1, shoulder_joint_action: 'POSITIVE' };
    assert.equal((await requestJson(url, '/', input)).response.status, 200);
    await requestJson(url, '/', { shoulder_joint_speed: 2 });
    await requestJson(url, '/', { shoulder_joint_speed: 3 });
    await requestJson(url, '/', { shoulder_joint_action: 'STOP' });
    assert.deepEqual(sent(mock, 'arm'), [0x1c, 0x0f, 0x1d, 0x1e, 0x11]);
    assert.deepEqual(mock.state.joints.shoulder_joint_action, { action: 'STOP', speed: 3 });
    await requestJson(url, '/', { forearm_joint_speed: 2, forearm_joint_action: 'NEGATIVE' });
    assert.deepEqual(sent(mock, 'arm').slice(-2), [0x20, 0x13]);
  });
});

test('gripper receives repeated timed movement pulses and stops automatically in mock', async () => {
  await withServer(async (mock, url) => {
    await requestJson(url, '/', { end_effector_speed: 1, end_effector_action: 'POSITIVE' });
    await requestJson(url, '/', { end_effector_speed: 2, end_effector_action: 'POSITIVE' });
    assert.deepEqual(sent(mock, 'hand'), [0x22, 0x09, 0x23, 0x09]);
    assert.equal(mock.state.joints.end_effector_action.action, 'POSITIVE');
    await new Promise((resolve) => setTimeout(resolve, 1070));
    assert.equal(mock.state.joints.end_effector_action.action, 'STOP');
    assert.ok(mock.state.events.some((event) => event.category === 'simulated-gripper-timeout'));
  });
});

test('arm health fails closed when Hand or Arm is disconnected; STOP is accepted', async () => {
  await withServer(async (mock, url) => {
    mock.setDeviceStatus('hand', false);
    const health = await (await fetch(url + '/health')).json();
    assert.equal(health.ready, false);
    assert.equal(health.handOpen, false);
    const blocked = await requestJson(url, '/', { end_effector_action: 'NEGATIVE' });
    assert.equal(blocked.response.status, 503);
    assert.equal(blocked.result.error, 'Hand Arduino is unavailable');
    assert.deepEqual(sent(mock, 'hand'), []);
    const stopped = await requestJson(url, '/', { end_effector_action: 'STOP' });
    assert.equal(stopped.response.status, 200);
    mock.setDeviceStatus('hand', true);
    mock.setDeviceStatus('arm', false);
    const armBlocked = await requestJson(url, '/', { forearm_joint_speed: 2 });
    assert.equal(armBlocked.response.status, 503);
    assert.equal(armBlocked.result.error, 'Arm Arduino is unavailable');
  });
});

test('base remains disabled by default and is available only when explicitly enabled', async () => {
  await withServer(async (mock, url) => {
    const blocked = await requestJson(url, '/', { plate_joint_action: 'POSITIVE' });
    assert.equal(blocked.response.status, 503);
    assert.equal((await fetch(url + '/health').then((res) => res.json())).baseEnabled, false);
    assert.deepEqual(sent(mock, 'wheels'), []);
    assert.equal((await requestJson(url, '/', { plate_joint_action: 'STOP' })).response.status, 200);
  });
  await withServer(async (mock, url) => {
    assert.equal((await fetch(url + '/health').then((res) => res.json())).baseEnabled, true);
    const moved = await requestJson(url, '/', { plate_joint_speed: 1, plate_joint_action: 'POSITIVE' });
    assert.equal(moved.response.status, 200);
    assert.deepEqual(sent(mock, 'wheels'), [0x25, 0x0c]);
  }, { baseEnabled: true });
});

test('POST /stop requests STOP for all arm joints and wheels', async () => {
  await withServer(async (mock, url) => {
    await requestJson(url, '/', { wheel_action: { linear_x: 1, angular_z: 0 } });
    await requestJson(url, '/', { shoulder_joint_action: 'POSITIVE' });
    const response = await requestJson(url, '/stop');
    assert.deepEqual(response.result, { success: true, accepted: true, stoppedConfirmed: false });
    assert.equal(mock.state.wheels.direction, 'STOP');
    assert.equal(mock.state.joints.shoulder_joint_action.action, 'STOP');
    assert.ok(sent(mock, 'wheels').includes(0x00));
    assert.ok(sent(mock, 'arm').includes(0x11));
    assert.ok(sent(mock, 'arm').includes(0x14));
    assert.ok(sent(mock, 'hand').includes(0x0b));
  });
});

test('invalid speed, mixed Twist, malformed JSON and unknown key are rejected without partial actuation', async () => {
  await withServer(async (mock, url) => {
    for (const payload of [
      { shoulder_joint_action: 'POSITIVE', shoulder_joint_speed: 4 },
      { shoulder_joint_action: 'POSITIVE', wheel_action: { linear_x: 1, angular_z: 1 } },
      { wheel_action: { linear_x: 4, angular_z: 0 } },
      { wheel_action: { linear_x: 'NaN', angular_z: 0 } },
      { made_up_key: true },
      { shoulder_joint_action: 'FORWARD' },
      { shoulder_joint_speed: '2' }
    ]) {
      const result = await requestJson(url, '/', payload);
      assert.equal(result.response.status, 400);
      assert.ok(result.result.error);
    }
    const badJson = await fetch(url + '/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops'
    });
    assert.equal(badJson.status, 400);
    assert.deepEqual(sent(mock), []);
  });
});

test('read-only /mock/state shows wheel directions, simulated serial events and no fake hardware confirmation', async () => {
  await withServer(async (mock, url) => {
    await requestJson(url, '/', { wheel_action: { linear_x: 0, angular_z: -2 } });
    const response = await fetch(url + '/mock/state');
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.mock, true);
    assert.deepEqual(data.wheels, { direction: 'RIGHT', speed: 2, left: 2, right: -2 });
    assert.deepEqual(data.recentEvents.filter((event) => event.category === 'serial-tx').map((event) => event.byte), [0x1a, 0x04]);
  });
});

test('camera endpoint produces multipart JPEG and detection endpoint returns empty JSON', async () => {
  await withServer(async (mock, url) => {
    const abort = new AbortController();
    const response = await fetch(url + '/video_feed', { signal: abort.signal });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /multipart\/x-mixed-replace/);
    abort.abort();
    const detection = await fetch(url + '/is_detection');
    assert.deepEqual(await detection.json(), {});
  });
});

test('command-byte map agrees with consolidated ROS 2 protocol', () => {
  assert.equal(WHEEL_BYTES.FWD, 0x01);
  assert.equal(WHEEL_BYTES.REV, 0x02);
  assert.equal(WHEEL_BYTES.LEFT, 0x03);
  assert.equal(WHEEL_BYTES.RIGHT, 0x04);
  assert.equal(JOINT_BYTES.shoulder_joint_action.STOP, 0x11);
  assert.equal(JOINT_BYTES.forearm_joint_action.STOP, 0x14);
  assert.equal(JOINT_BYTES.end_effector_action.STOP, 0x0b);
  assert.deepEqual(SPEED_BYTES.wheels, [0x19, 0x1a, 0x1b]);
  assert.deepEqual(SPEED_BYTES.plate_joint_action, [0x25, 0x26, 0x27]);
  assert.deepEqual(splitAndValidate({ shoulder_joint_speed: 2 }), {
    armActions: { shoulder_joint_speed: 2 }, roverActions: {}
  });
});

test('a device disconnect reports unavailable without claiming an active motor has stopped', async () => {
  await withServer(async (mock, url) => {
    await requestJson(url, '/', { wheel_action: { linear_x: 2, angular_z: 0 } });
    mock.setDeviceStatus('wheels', false);
    assert.equal(mock.getHealth().wheelsOpen, false);
    assert.equal(mock.state.wheels.direction, 'FWD');
    const response = await requestJson(url, '/', { wheel_action: { linear_x: 3, angular_z: 0 } });
    assert.equal(response.response.status, 200);
    assert.equal(mock.state.wheels.speed, 2);
    assert.ok(mock.state.events.some((event) => event.category === 'serial-rejected'));
  });
});
