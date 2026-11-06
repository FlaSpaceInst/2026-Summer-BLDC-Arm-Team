'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { startStaticServer, getAssetPath } = require('../static-server.cjs');

test('path resolver rejects traversal and preserves web assets', () => {
  assert.equal(getAssetPath('/tmp/ui', '/index.html'), path.resolve('/tmp/ui/index.html'));
  assert.equal(getAssetPath('/tmp/ui', '/static/js/bundle.js'), path.resolve('/tmp/ui/static/js/bundle.js'));
  assert.equal(getAssetPath('/tmp/ui', '/../other'), null);
  assert.equal(getAssetPath('/tmp/ui', '/%2e%2e%2fother'), null);
  assert.equal(getAssetPath('/tmp/ui', '/a\\b'), null);
});

test('loopback server serves packaged UI and refuses write operations', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rerassor-static-'));
  writeFileSync(path.join(dir, 'index.html'), '<h1>Original RE-RASSOR</h1>');
  const { server, origin } = await startStaticServer(dir);
  try {
    assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
    const result = await fetch(origin + '/');
    assert.equal(result.status, 200);
    assert.match(await result.text(), /Original RE-RASSOR/);
    assert.equal(result.headers.get('x-content-type-options'), 'nosniff');
    const blocked = await fetch(origin + '/', { method: 'POST' });
    assert.equal(blocked.status, 405);
    const absent = await fetch(origin + '/missing.js');
    assert.equal(absent.status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    rmSync(dir, { recursive: true, force: true });
  }
});
