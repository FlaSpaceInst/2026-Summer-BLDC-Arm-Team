'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function serverFixture(t, options = {}) {
  const writes = [];
  const makePort = (name) => ({
    isOpen: true,
    write(data, callback) {
      let value = data;
      if (Buffer.isBuffer(data)) {
        value = data[0];
      }
      writes.push({ name, data: value });
      if (options.fail === name) {
        callback(new Error('Mock serial failure'));
        return;
      }
      setTimeout(() => callback(null), options.delay || 0);
    }
  });
  const ports = { arm:makePort('arm'),hand:makePort('hand'),wheels:makePort('wheels') };
  if (options.noWheels) {
    ports.wheels = null;
  }
  const server = createApp(ports);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  }));
  return { base: 'http://127.0.0.1:' + server.address().port, writes };
}
async function post(base, body, path = '/') {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return { status:response.status, json:await response.json() };
}

test('health indicates all three ports with no heartbeat/latch fields', async (t) => {
  const fixture = await serverFixture(t);
  const result = await (await fetch(fixture.base + '/health')).json();
  assert.equal(result.protocol, 'press-stop');
  assert.equal(result.wheelsOpen, true);
  assert.equal(result.armOpen, true);
  assert.equal(result.handOpen, true);
  assert.equal(Object.hasOwn(result, 'latched'), false);
});
test('press and release shoulder route to arm', async (t) => {
  const fixture = await serverFixture(t);
  assert.equal((await post(fixture.base, {shoulder_joint_action:'POSITIVE'})).status, 200);
  assert.equal((await post(fixture.base, {shoulder_joint_action:'STOP'})).status, 200);
  assert.deepEqual(fixture.writes, [{name:'arm',data:0x0f},{name:'arm',data:0x11}]);
});
test('gripper goes exclusively to hand', async (t) => {
  const fixture = await serverFixture(t);
  await post(fixture.base, {end_effector_action:'POSITIVE'});
  await post(fixture.base, {end_effector_action:'STOP'});
  assert.deepEqual(fixture.writes, [{name:'hand',data:0x09},{name:'hand',data:0x0b}]);
});
test('base direction and stop use textual wheels protocol', async (t) => {
  const fixture = await serverFixture(t);
  await post(fixture.base, {plate_joint_action:'NEGATIVE'});
  await post(fixture.base, {plate_joint_action:'STOP'});
  assert.deepEqual(fixture.writes, [{name:'wheels',data:'ARM_CCW\n'},{name:'wheels',data:'ARM_STOP\n'}]);
});
test('global STOP reaches all boards', async (t) => {
  const fixture = await serverFixture(t);
  const result = await post(fixture.base, {}, '/stop');
  assert.equal(result.status, 200);
  assert.deepEqual(fixture.writes.map((item) => item.name), ['arm','hand','wheels','wheels']);
});
test('global STOP attempts remaining ports when one fails', async (t) => {
  const fixture = await serverFixture(t, {fail:'hand'});
  const result = await post(fixture.base, {}, '/stop');
  assert.equal(result.status, 503);
  assert.deepEqual(fixture.writes.map((item) => item.name), ['arm','hand','wheels','wheels']);
});
test('movement POST missing wheels port returns 503', async (t) => {
  const fixture = await serverFixture(t, {noWheels:true});
  assert.equal((await post(fixture.base, {plate_joint_action:'POSITIVE'})).status, 503);
  assert.equal(fixture.writes.length, 0);
});
test('bad command returns 400 and does not send serial', async (t) => {
  const fixture = await serverFixture(t);
  assert.equal((await post(fixture.base, {partial_autonomy:'PICKUP'})).status, 400);
  assert.equal(fixture.writes.length, 0);
});
test('requests are ordered including release and reverse', async (t) => {
  const fixture = await serverFixture(t, {delay:15});
  const results = await Promise.all([
    post(fixture.base, {shoulder_joint_action:'POSITIVE'}),
    post(fixture.base, {shoulder_joint_action:'STOP'}),
    post(fixture.base, {shoulder_joint_action:'NEGATIVE'})
  ]);
  assert.ok(results.every((result) => result.status === 200));
  assert.deepEqual(fixture.writes.map((item) => item.data), [0x0f,0x11,0x10]);
});

test('global STOP with no wheels port still reaches arm and hand', async (t) => {
  const fixture = await serverFixture(t, {noWheels:true});
  const result = await post(fixture.base, {}, '/stop');
  assert.equal(result.status, 200);
  assert.deepEqual(fixture.writes, [
    {name:'arm',data:0x18},
    {name:'hand',data:0x0b}
  ]);
});

test('health disables base when wheels Arduino port is closed', async (t) => {
  const fixture = await serverFixture(t, {noWheels:true});
  const response = await fetch(fixture.base + '/health');
  const health = await response.json();
  assert.equal(health.baseEnabled, false);
  assert.equal(health.wheelsOpen, false);
  assert.equal(health.armOpen, true);
  assert.equal(health.handOpen, true);
});

test('hand write failure is reported without redirecting gripper writes to arm', async (t) => {
  const fixture = await serverFixture(t, {fail:'hand'});
  const result = await post(fixture.base, {end_effector_action:'POSITIVE'});
  assert.equal(result.status, 503);
  assert.deepEqual(fixture.writes, [{name:'hand',data:0x09}]);
});
