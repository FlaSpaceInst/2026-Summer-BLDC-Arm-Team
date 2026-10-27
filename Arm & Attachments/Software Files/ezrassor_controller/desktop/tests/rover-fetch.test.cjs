'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const source = readFileSync(path.join(__dirname, '../../src/api/rover-fetch.js'), 'utf8');

test('desktop requests use IPC and preserve normal fetch semantics', async () => {
    const roverFetch = (await import('data:text/javascript,' + encodeURIComponent(source))).default;
    const previousWindow = globalThis.window;
    const previousFetch = globalThis.fetch;
    try {
        const calls = [];
        globalThis.window = {
            reRassorDesktop: {
                request: async (details) => {
                    calls.push(details);
                    return { ok: true, status: 200, body: '{"armOpen":true,"handOpen":true}' };
                }
            }
        };
        const response = await roverFetch('http://192.168.10.3:3000/health');
        assert.equal(response.ok, true);
        assert.equal((await response.json()).armOpen, true);
        const command = await roverFetch('http://192.168.10.3:3000/', {
            method: 'POST',
            body: '{"shoulder_joint_action":"POSITIVE"}'
        });
        assert.equal(command.status, 200);
        assert.equal(calls[1].method, 'POST');
        assert.match(calls[1].body, /shoulder_joint_action/);
        assert.equal(calls.length, 2);
    } finally {
        globalThis.window = previousWindow;
        globalThis.fetch = previousFetch;
    }
});

test('browser and mobile clients still use fetch without IPC', async () => {
    const roverFetch = (await import('data:text/javascript,' + encodeURIComponent(source))).default;
    const previousWindow = globalThis.window;
    const previousFetch = globalThis.fetch;
    try {
        globalThis.window = {};
        let urlCalled = '';
        globalThis.fetch = async (url) => {
            urlCalled = url;
            return { ok: true, status: 200 };
        };
        const response = await roverFetch('http://127.0.0.1:3000/health');
        assert.equal(response.ok, true);
        assert.equal(urlCalled, 'http://127.0.0.1:3000/health');
    } finally {
        globalThis.window = previousWindow;
        globalThis.fetch = previousFetch;
    }
});

test('an already aborted request never reaches IPC', async () => {
    const roverFetch = (await import('data:text/javascript,' + encodeURIComponent(source))).default;
    const previousWindow = globalThis.window;
    let called = false;
    try {
        globalThis.window = { reRassorDesktop: { request: async () => { called = true; } } };
        const controller = new AbortController();
        controller.abort();
        await assert.rejects(roverFetch('http://127.0.0.1:3000/health', { signal: controller.signal }));
        assert.equal(called, false);
    } finally {
        globalThis.window = previousWindow;
    }
});
