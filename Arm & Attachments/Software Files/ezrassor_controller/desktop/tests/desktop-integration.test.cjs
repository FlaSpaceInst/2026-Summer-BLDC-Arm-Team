'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const src = path.join(__dirname, '../..');

test('desktop app routes original rover and arm calls through the restricted transport', () => {
    const rover = readFileSync(path.join(src, 'src/api/web-commands.js'), 'utf8');
    const connection = readFileSync(path.join(src, 'src/functionality/connection.js'), 'utf8');
    const arm = readFileSync(path.join(src, 'src/components/app/ArmControlPanel.js'), 'utf8');
    assert.match(rover, /import roverFetch/);
    assert.match(rover, /await roverFetch\(/);
    assert.match(connection, /await roverFetch\(/);
    assert.match(arm, /await roverFetch\(/);
    assert.doesNotMatch(arm, /heartbeat_timeout|\/heartbeat/);
});
