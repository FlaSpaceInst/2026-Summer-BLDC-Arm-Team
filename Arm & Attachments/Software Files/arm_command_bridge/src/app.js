'use strict';

const http = require('node:http');
const { commandsFromRequest, CommandValidationError } = require('./commands');

const maxBodyBytes = 4096;

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(data));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let data = '';
    request.on('data', (chunk) => {
      data += chunk;
      if (Buffer.byteLength(data) > maxBodyBytes) {
        reject(new CommandValidationError('JSON body too large.'));
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new CommandValidationError('Invalid JSON.'));
      }
    });
    request.on('error', reject);
  });
}

function writeCommand(port, command) {
  if (!port || typeof port.write !== 'function' || port.isOpen === false) {
    return Promise.reject(new Error('Serial port is not available.'));
  }
  let payload = command;
  if (typeof command !== 'string') {
    payload = Buffer.from([command]);
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Serial write timed out.'));
      }
    }, 1000);
    try {
      port.write(payload, (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    } catch (error) {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    }
  });
}

function createApp(ports) {
  if (!ports || !ports.arm || !ports.hand) {
    throw new TypeError('Arm and hand serial ports are required.');
  }
  // Serialize movement requests so STOP cannot be overtaken by a later command.
  // Both the bridge and the UI preserve request order.
  let queue = Promise.resolve();

  async function stopWheels() {
    const failures = [];
    // Both commands use the same wheels serial connection. Keep their order.
    // Attempt drivetrain STOP even if base STOP fails.
    for (const command of ['ARM_STOP\n', 'STOP\n']) {
      try {
        await writeCommand(ports.wheels, command);
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) {
      throw new Error('Wheels STOP was not fully delivered.');
    }
  }

  async function allStop() {
    const operations = [
      writeCommand(ports.arm, 0x18),
      writeCommand(ports.hand, 0x0b)
    ];
    if (ports.wheels) {
      operations.push(stopWheels());
    }
    // A disconnected motor controller must not prevent attempts to stop others.
    const results = await Promise.allSettled(operations);
    if (results.some((result) => result.status === 'rejected')) {
      throw new Error('At least one STOP command could not be delivered.');
    }
    return { success: true, stopped: true };
  }

  const server = http.createServer(async (request, response) => {
    if (request.method === 'OPTIONS') {
      sendJson(response, 204, {});
      return;
    }
    if (request.method === 'GET' && request.url === '/health') {
      sendJson(response, 200, {
        success: true,
        armOpen: ports.arm.isOpen !== false,
        handOpen: ports.hand.isOpen !== false,
        wheelsOpen: !!ports.wheels && ports.wheels.isOpen !== false,
        baseEnabled: !!ports.wheels && ports.wheels.isOpen !== false,
        protocol: 'press-stop'
      });
      return;
    }
    if (request.method !== 'POST' || (request.url !== '/' && request.url !== '/stop')) {
      sendJson(response, 404, { success: false, error: 'Route not found.' });
      return;
    }

    let commands;
    try {
      if (request.url === '/stop') {
        commands = [{ type: 'allStop' }];
      } else {
        commands = commandsFromRequest(await readBody(request));
      }
    } catch (error) {
      sendJson(response, 400, { success: false, error: error.message });
      return;
    }

    const operation = queue.then(async () => {
      if (commands[0].type === 'allStop') {
        return allStop();
      }
      const item = commands[0];
      if (!ports[item.port]) {
        throw new Error(item.port + ' Arduino is not configured.');
      }
      await writeCommand(ports[item.port], item.command);
      return { success: true, joint: item.joint, action: item.action };
    });
    queue = operation.catch(() => {});

    try {
      sendJson(response, 200, await operation);
    } catch (error) {
      sendJson(response, 503, { success: false, error: error.message });
    }
  });
  return server;
}

module.exports = { createApp, writeCommand };
