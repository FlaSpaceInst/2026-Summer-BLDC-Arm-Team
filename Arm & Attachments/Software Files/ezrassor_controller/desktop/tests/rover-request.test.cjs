'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const { validateRoverUrl, validateRequest, requestRover } = require('../rover-request.cjs');

test('only local rover destinations are accepted', () => {
  for (const host of ['192.168.10.1', '10.2.3.4', '172.20.0.4', 'localhost', 'rerassor.local', '127.0.0.1']) {
    assert.equal(validateRoverUrl(`http://${host}:3000/health`).hostname, host);
  }
  for (const bad of ['https://example.com/health', 'http://8.8.8.8:3000', 'file:///tmp/x',
    'http://user:secret@192.168.10.1:3000', 'http://172.32.1.2/', 'javascript:alert(1)']) {
    assert.throws(() => validateRoverUrl(bad));
  }
});

test('request validation rejects malformed and oversized commands', () => {
  assert.throws(() => validateRequest({ url: 'http://127.0.0.1:3000', method: 'DELETE' }));
  assert.throws(() => validateRequest({ url: 'http://127.0.0.1:3000', method: 'POST', body: 'x'.repeat(20000) }));
  assert.throws(() => validateRequest({ url: 'http://127.0.0.1:3000', method: 'GET', body: '{}' }));
  assert.equal(validateRequest({ url: 'http://192.168.10.1:3000/health' }).method, 'GET');
});

test('proxy returns bridge JSON and POST bodies without CORS', async () => {
  const server = http.createServer((req, res) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ success: true, method: req.method, body: data }));
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = `http://127.0.0.1:${server.address().port}`;
    const health = await requestRover({url: `${address}/health`});
    assert.equal(health.status, 200);
    assert.equal(JSON.parse(health.body).method, 'GET');
    const heartbeat = await requestRover({url: `${address}/heartbeat`, method:'POST', body:'{"hello":1}'});
    assert.equal(JSON.parse(heartbeat.body).body, '{"hello":1}');
    const probe = await requestRover({url: `${address}/`, probe: true});
    assert.equal(probe.ok, true);
  } finally {
    server.close();
  }
});

test('network requests fail closed when the rover server is absent', async () => {
  // Bind a temporary local port, close it, then test a connection failure.
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  await assert.rejects(() => requestRover({ url: `http://127.0.0.1:${port}/health` }, 250));
});
