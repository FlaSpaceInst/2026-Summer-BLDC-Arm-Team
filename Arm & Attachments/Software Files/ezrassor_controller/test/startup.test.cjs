'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const startupPath = path.join(__dirname, '../src/functionality/startup.js');
const splashPath = path.join(__dirname, '../src/components/app/Splash.js');

function loadStartup() {
  const source = fs.readFileSync(startupPath, 'utf8');
  const context = { Promise, setTimeout, clearTimeout };
  vm.runInNewContext(source.replace('export async function', 'async function') +
    '\nthis.getStartupRoute = getStartupRoute;', context);
  return context.getStartupRoute;
}

test('web startup opens connect screen without reading storage or contacting a rover', async () => {
  const getStartupRoute = loadStartup();
  let reads = 0;
  let checks = 0;
  const route = await getStartupRoute('web', () => {
    reads += 1;
    return Promise.resolve('192.168.10.1:8080');
  }, () => {
    checks += 1;
    return Promise.resolve(true);
  });
  assert.equal(route, 'IPConnect Screen');
  assert.equal(reads, 0);
  assert.equal(checks, 0);
});

test('native startup reaches controller if saved rover IP responds', async () => {
  const getStartupRoute = loadStartup();
  const route = await getStartupRoute('android',
    () => Promise.resolve('192.168.10.1:8080'),
    () => Promise.resolve(true));
  assert.equal(route, 'Controller Screen');
});

test('native startup falls back to connect screen if no saved IP', async () => {
  const getStartupRoute = loadStartup();
  const route = await getStartupRoute('android',
    () => Promise.resolve(null),
    () => Promise.resolve(true));
  assert.equal(route, 'IPConnect Screen');
});

test('native startup falls back to connect screen if rover is offline', async () => {
  const getStartupRoute = loadStartup();
  const route = await getStartupRoute('ios',
    () => Promise.resolve('192.168.10.1:8080'),
    () => Promise.resolve(false));
  assert.equal(route, 'IPConnect Screen');
});

test('native startup falls back when AsyncStorage rejects', async () => {
  const getStartupRoute = loadStartup();
  const route = await getStartupRoute('android',
    () => Promise.reject(new Error('storage unavailable')),
    () => Promise.resolve(true));
  assert.equal(route, 'IPConnect Screen');
});

test('native startup times out if AsyncStorage never resolves', async () => {
  const getStartupRoute = loadStartup();
  const start = Date.now();
  const route = await getStartupRoute('android',
    () => new Promise(() => {}),
    () => Promise.resolve(true), 20, 20);
  assert.equal(route, 'IPConnect Screen');
  assert.ok(Date.now() - start < 300);
});

test('native startup times out if IP reachability never resolves', async () => {
  const getStartupRoute = loadStartup();
  const route = await getStartupRoute('android',
    () => Promise.resolve('192.168.10.1:8080'),
    () => new Promise(() => {}), 20, 20);
  assert.equal(route, 'IPConnect Screen');
});

test('Splash screen uses effect instead of onLayout to trigger navigation', () => {
  const source = fs.readFileSync(splashPath, 'utf8');
  assert.match(source, /navigation\.replace\(route\)/);
  assert.doesNotMatch(source, /onLayoutRootView|onLayout=/);
  assert.match(source, /getStartupRoute\(/);
});
