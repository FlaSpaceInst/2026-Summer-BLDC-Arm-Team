'use strict';

/**
 * RE-RASSOR ROS 2 HTTP mock for local UI/desktop development.
 *
 * The API matches ezrassor_controller_server/__main__.py and arm_request.py
 * from the consolidated ROS 2 tree. 
 *
 * Run: node mock/mock_ros_server.cjs
 * Optional: MOCK_PORT=5001 node mock/mock_ros_server.cjs
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { URL } = require('node:url');

const ARM_FIELDS = [
  'shoulder_joint_action',
  'forearm_joint_action',
  'end_effector_action',
  'plate_joint_action'
];

const JOINT_BYTES = Object.freeze({
  shoulder_joint_action: { POSITIVE: 0x0f, NEGATIVE: 0x10, STOP: 0x11 },
  forearm_joint_action: { POSITIVE: 0x12, NEGATIVE: 0x13, STOP: 0x14 },
  end_effector_action: { POSITIVE: 0x09, NEGATIVE: 0x0a, STOP: 0x0b },
  plate_joint_action: { POSITIVE: 0x0c, NEGATIVE: 0x0d, STOP: 0x0e }
});

const SPEED_BYTES = Object.freeze({
  wheels: [0x19, 0x1a, 0x1b],
  shoulder_joint_action: [0x1c, 0x1d, 0x1e],
  forearm_joint_action: [0x1f, 0x20, 0x21],
  end_effector_action: [0x22, 0x23, 0x24],
  plate_joint_action: [0x25, 0x26, 0x27]
});

const WHEEL_BYTES = Object.freeze({ STOP: 0x00, FWD: 0x01, REV: 0x02, LEFT: 0x03, RIGHT: 0x04 });
const LEGACY_ACTION_FIELDS = new Set([
  'wheel_action', 'shoulder_action', 'front_arm_action', 'back_arm_action',
  'front_drum_action', 'back_drum_action', 'routine_action', 'target_coordinate'
]);
const LEGACY_ARM_ACTIONS = new Set(['LOWER', 'STOP', 'RAISE']);
const ROUTINE_ACTIONS = new Set(['AUTO_DRIVE', 'AUTO_DIG', 'AUTO_DUMP', 'AUTO_DOCK', 'FULL_AUTONOMY', 'STOP']);
const CAMERA_FRAME = fs.readFileSync(path.join(__dirname, 'mock_camera_frame.jpg'));
const MAX_EVENTS = 200;
const MAX_BODY_BYTES = 16384;
const GRIPPER_PULSE_MS = 1000; // Matches EFFECTOR_TIME_FULL in arduino_hand.ino.

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateSpeed(speed) {
  if (!Number.isInteger(speed) || speed < 1 || speed > 3) {
    throw new Error('Speed must be an integer preset (1, 2, or 3)');
  }
}

function splitAndValidate(payload) {
  if (!isObject(payload)) {
    throw new Error('Request body must be a JSON object');
  }

  const armActions = {};
  const roverActions = {};
  for (const [field, value] of Object.entries(payload)) {
    if (Object.hasOwn(JOINT_BYTES, field)) {
      if (!Object.hasOwn(JOINT_BYTES[field], value) || typeof value !== 'string') {
        throw new Error(`Invalid ${field}: ${JSON.stringify(value)}`);
      }
      armActions[field] = value;
    } else if (field.endsWith('_speed') && Object.hasOwn(JOINT_BYTES, field.slice(0, -6) + '_action')) {
      validateSpeed(value);
      armActions[field] = value;
    } else {
      roverActions[field] = value;
    }
  }

  for (const [field, value] of Object.entries(roverActions)) {
    if (!LEGACY_ACTION_FIELDS.has(field)) {
      throw new Error(`unknown key: ${field}`);
    }
    if (field === 'wheel_action') {
      if (!isObject(value) || !Object.hasOwn(value, 'linear_x') || !Object.hasOwn(value, 'angular_z')) {
        throw new Error('wheel_action must include linear_x and angular_z');
      }
      const linearX = Number(value.linear_x);
      const angularZ = Number(value.angular_z);
      if (!Number.isFinite(linearX) || !Number.isFinite(angularZ)) {
        throw new Error('Invalid wheel movement: coordinates must be finite');
      }
      if (linearX !== 0 && angularZ !== 0) {
        throw new Error('Simultaneous linear and angular wheel commands are unsupported');
      }
      const magnitude = Math.max(Math.abs(linearX), Math.abs(angularZ));
      if (magnitude !== 0) {
        validateSpeed(magnitude);
      }
    } else if (field === 'shoulder_action') {
      if (!isObject(value) || !['linear_x', 'linear_y', 'angular_y', 'angular_z'].every((key) => Object.hasOwn(value, key))) {
        throw new Error('shoulder_action must include linear_x, linear_y, angular_y and angular_z');
      }
    } else if (field === 'front_arm_action' || field === 'back_arm_action') {
      if (!LEGACY_ARM_ACTIONS.has(value)) {
        throw new Error(`Invalid ${field}`);
      }
    } else if (field === 'front_drum_action' || field === 'back_drum_action') {
      if (!isObject(value) || !Object.hasOwn(value, 'linear_x')) {
        throw new Error(`${field} must include linear_x`);
      }
    } else if (field === 'routine_action') {
      if (!ROUTINE_ACTIONS.has(value)) {
        throw new Error('Invalid routine_action');
      }
    } else if (field === 'target_coordinate') {
      if (!isObject(value) || !Object.hasOwn(value, 'x') || !Object.hasOwn(value, 'y')) {
        throw new Error('target_coordinate must include x and y');
      }
    }
  }
  return { armActions, roverActions };
}

function createMockRosServer(options = {}) {
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const verbose = options.quiet !== true;
  const state = {
    devices: { wheels: true, arm: true, hand: true },
    baseEnabled: options.baseEnabled === true,
    wheels: { direction: 'STOP', speed: 0, left: 0, right: 0 },
    joints: {
      shoulder_joint_action: { action: 'STOP', speed: 2 },
      forearm_joint_action: { action: 'STOP', speed: 2 },
      end_effector_action: { action: 'STOP', speed: 2 },
      plate_joint_action: { action: 'STOP', speed: 2 }
    },
    events: [],
    latestLegacyRequest: null
  };

  let pulseTimer = null;
  const streamIntervals = new Set();
  const cameraResponses = new Set();

  function record(category, detail) {
    const entry = { time: new Date(now()).toISOString(), category, ...detail };
    state.events.push(entry);
    if (state.events.length > MAX_EVENTS) {
      state.events.shift();
    }
    if (verbose) {
      if (entry.target && entry.hex) {
        console.log(`[${entry.time}] ${entry.target.padEnd(6)} TX ${entry.hex} ${entry.label}`);
      } else {
        console.log(`[${entry.time}] ${category}: ${JSON.stringify(detail)}`);
      }
    }
    return entry;
  }

  function sendBinary(target, value, label) {
    if (!state.devices[target]) {
      record('serial-rejected', { target, hex: '0x' + value.toString(16).padStart(2, '0'), label, reason: 'device offline' });
      return false;
    }
    record('serial-tx', { target, hex: '0x' + value.toString(16).padStart(2, '0'), byte: value, label });
    return true;
  }

  function setWheelState(direction, speed) {
    state.wheels.direction = direction;
    state.wheels.speed = speed;
    state.wheels.left = 0;
    state.wheels.right = 0;
    if (direction === 'FWD') {
      state.wheels.left = speed;
      state.wheels.right = speed;
    } else if (direction === 'REV') {
      state.wheels.left = -speed;
      state.wheels.right = -speed;
    } else if (direction === 'LEFT') {
      state.wheels.left = -speed;
      state.wheels.right = speed;
    } else if (direction === 'RIGHT') {
      state.wheels.left = speed;
      state.wheels.right = -speed;
    }
  }

  function stopWheel() {
    if (sendBinary('wheels', WHEEL_BYTES.STOP, 'wheel STOP')) {
      setWheelState('STOP', 0);
    }
  }

  function processWheel(action) {
    const linearX = Number(action.linear_x);
    const angularZ = Number(action.angular_z);
    let direction = 'STOP';
    if (linearX > 0) {
      direction = 'FWD';
    } else if (linearX < 0) {
      direction = 'REV';
    } else if (angularZ > 0) {
      direction = 'LEFT';
    } else if (angularZ < 0) {
      direction = 'RIGHT';
    }
    if (direction === 'STOP') {
      stopWheel();
      return;
    }

    if (state.wheels.direction !== 'STOP' && state.wheels.direction !== direction) {
      if (!sendBinary('wheels', WHEEL_BYTES.STOP, 'direction change STOP')) {
        return;
      }
      setWheelState('STOP', 0);
    }

    const speed = Math.max(Math.abs(linearX), Math.abs(angularZ));
    if (speed !== state.wheels.speed) {
      if (!sendBinary('wheels', SPEED_BYTES.wheels[speed - 1], `wheel speed ${speed}`)) {
        return;
      }
    }
    if (direction !== state.wheels.direction) {
      if (!sendBinary('wheels', WHEEL_BYTES[direction], `wheel ${direction}`)) {
        return;
      }
    }
    setWheelState(direction, speed);
  }

  function getHealth() {
    // Matches formatDriverHealth() in arm_request.py.
    return {
      success: true,
      ready: state.devices.arm && state.devices.hand,
      armOpen: state.devices.arm,
      handOpen: state.devices.hand,
      wheelsOpen: state.devices.wheels,
      baseEnabled: state.baseEnabled,
      protocol: 'press-stop',
      serialProtocol: 'binary'
    };
  }

  function checkArmReadiness(armActions) {
    for (const [field, value] of Object.entries(armActions)) {
      if (value === 'STOP') {
        continue;
      }
      let actionField = field;
      if (field.endsWith('_speed')) {
        actionField = field.slice(0, -6) + '_action';
      }
      if ((actionField === 'shoulder_joint_action' || actionField === 'forearm_joint_action') && !state.devices.arm) {
        return 'Arm Arduino is unavailable';
      }
      if (actionField === 'end_effector_action' && !state.devices.hand) {
        return 'Hand Arduino is unavailable';
      }
      if (actionField === 'plate_joint_action' && (!state.baseEnabled || !state.devices.wheels)) {
        return 'Base rotation is disabled or wheel Arduino unavailable';
      }
    }
    return null;
  }

  function processArm(armActions) {
    // Exact ROS serial driver ordering: shoulder, forearm, hand, base.
    for (const field of ARM_FIELDS) {
      const action = armActions[field];
      const speedField = field.slice(0, -7) + '_speed';
      const speed = armActions[speedField];
      if (action === undefined && speed === undefined) {
        continue;
      }
      if (field === 'plate_joint_action' && !state.baseEnabled) {
        // Existing ROS driver ignores base STOP while base rotation is disabled.
        continue;
      }
      let target = 'arm';
      if (field === 'end_effector_action') {
        target = 'hand';
      } else if (field === 'plate_joint_action') {
        target = 'wheels';
      }
      if (speed !== undefined && action !== 'STOP') {
        if (sendBinary(target, SPEED_BYTES[field][speed - 1], `${field} speed ${speed}`)) {
          state.joints[field].speed = speed;
        }
      }
      if (action !== undefined) {
        if (sendBinary(target, JOINT_BYTES[field][action], `${field} ${action}`)) {
          state.joints[field].action = action;
          if (field === 'end_effector_action') {
            clearTimeout(pulseTimer);
            pulseTimer = null;
            if (action !== 'STOP') {
              // The real gripper firmware stops the pulse after 1000ms.
              pulseTimer = setTimeout(() => {
                state.joints[field].action = 'STOP';
                record('simulated-gripper-timeout', { field, milliseconds: GRIPPER_PULSE_MS });
              }, GRIPPER_PULSE_MS);
            }
          }
        }
      }
    }
  }

  function emergencyStop() {
    // ROS HTTP /stop publishes arm STOP and a zero Twist;
    processArm({
      shoulder_joint_action: 'STOP',
      forearm_joint_action: 'STOP',
      end_effector_action: 'STOP',
      plate_joint_action: 'STOP'
    });
    stopWheel();
    return { success: true, accepted: true, stoppedConfirmed: false };
  }

  function setDeviceStatus(device, online) {
    if (!Object.hasOwn(state.devices, device)) {
      throw new Error(`Unknown simulated device: ${device}`);
    }
    state.devices[device] = online;
    // A lost USB connection is not proof that a running motor stopped.
    // Preserve the last commanded state
    record('device', { device, online });
  }

  function sendJson(response, status, body) {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    response.end(JSON.stringify(body));
  }

  function sendText(response, status, body) {
    response.writeHead(status, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    response.end(body);
  }

  async function readJson(request) {
    let size = 0;
    const chunks = [];
    for await (const chunk of request) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        throw new Error('Request exceeds 16 KB');
      }
      chunks.push(chunk);
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      throw new Error('Invalid JSON body');
    }
  }

  function streamMockCamera(request, response) {
    response.writeHead(200, {
      'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Access-Control-Allow-Origin': '*'
    });
    function writeFrame() {
      if (response.destroyed || response.writableEnded) {
        return;
      }
      response.write(`--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ${CAMERA_FRAME.length}\r\n\r\n`);
      response.write(CAMERA_FRAME);
      response.write('\r\n');
    }
    writeFrame();
    const interval = setInterval(writeFrame, 1000);
    streamIntervals.add(interval);
    cameraResponses.add(response);
    response.on('close', () => {
      clearInterval(interval);
      streamIntervals.delete(interval);
      cameraResponses.delete(response);
    });
  }

  const server = http.createServer(async (request, response) => {
    let pathname = '/';
    try {
      pathname = new URL(request.url, 'http://localhost').pathname;
      if (request.method === 'OPTIONS') {
        sendJson(response, 200, { status: 200 });
        return;
      }
      if (request.method === 'GET' && pathname === '/') {
        sendJson(response, 200, { status: 200 });
        return;
      }
      if (request.method === 'GET' && pathname === '/health') {
        sendJson(response, 200, getHealth());
        return;
      }
      if (request.method === 'GET' && pathname === '/mock/state') {
        sendJson(response, 200, {
          mock: true,
          health: getHealth(),
          devices: state.devices,
          wheels: state.wheels,
          joints: state.joints,
          latestLegacyRequest: state.latestLegacyRequest,
          recentEvents: state.events.slice(-30)
        });
        return;
      }
      if (request.method === 'GET' && pathname === '/video_feed') {
        streamMockCamera(request, response);
        return;
      }
      if (request.method === 'GET' && pathname === '/is_detection') {
        // Camera UI expects a JSON object; empty means no paver detected.
        sendJson(response, 200, {});
        return;
      }
      if (request.method === 'POST' && pathname === '/stop') {
        emergencyStop();
        sendJson(response, 200, { success: true, accepted: true, stoppedConfirmed: false });
        return;
      }
      if (request.method === 'POST' && pathname === '/') {
        let payload;
        try {
          payload = await readJson(request);
          const { armActions, roverActions } = splitAndValidate(payload);
          const readinessError = checkArmReadiness(armActions);
          if (readinessError) {
            sendJson(response, 503, { status: 503, error: readinessError });
            return;
          }
          if (Object.keys(armActions).length > 0) {
            processArm(armActions);
          }
          if (Object.keys(roverActions).length > 0) {
            state.latestLegacyRequest = roverActions;
            if (roverActions.wheel_action) {
              processWheel(roverActions.wheel_action);
            }
            // Other legacy ROS topics accept commands without Arduino serial emulation here
            for (const key of Object.keys(roverActions)) {
              if (key !== 'wheel_action') {
                record('legacy-ros-publish', { topicKey: key, payload: roverActions[key] });
              }
            }
          }
          sendJson(response, 200, { status: 200 });
        } catch (error) {
          sendJson(response, 400, { status: 400, error: error.message });
        }
        return;
      }
      sendJson(response, 404, { status: 404, error: 'Route not found' });
    } catch (error) {
      record('mock-error', { message: error.message });
      if (!response.headersSent) {
        sendJson(response, 500, { status: 500, error: 'Mock server error' });
      } else {
        response.end();
      }
    }
  });

  function shutdown() {
    clearTimeout(pulseTimer);
    for (const interval of streamIntervals) {
      clearInterval(interval);
    }
    streamIntervals.clear();
    for (const response of cameraResponses) {
      response.end();
    }
    cameraResponses.clear();
    server.close();
  }

  return { server, state, getHealth, setDeviceStatus, emergencyStop, shutdown };
}

if (require.main === module) {
  const portText = process.env.MOCK_PORT || '5000';
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('MOCK_PORT must be a TCP port between 1 and 65535');
    process.exit(1);
  }
  const host = process.env.MOCK_HOST || '127.0.0.1';
  const mock = createMockRosServer({ baseEnabled: process.env.MOCK_BASE_ENABLED === '1' });
  mock.server.on('error', (error) => {
    console.error(`Cannot start mock on ${host}:${port}: ${error.message}`);
    process.exitCode = 1;
  });
  mock.server.listen(port, host, () => {
    console.log('\nRE-RASSOR ROS 2 HTTP MOCK: SIMULATION ONLY');
    console.log(`Controller address: ${host}:${port}`);
    console.log(`Health: http://${host}:${port}/health`);
    console.log(`Debug state: http://${host}:${port}/mock/state`);
    console.log('Binary Arduino frames are LOGGED, never sent to real serial ports.');
    console.log('Commands: status | events | wheels off/on | arm off/on | hand off/on | quit');
    if (host !== '127.0.0.1' && host !== 'localhost') {
      console.warn('WARNING: mock is accessible from other devices on your network and has no authentication.');
    }
    console.log('');
  });

  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  terminal.on('line', (line) => {
    const command = line.trim().toLowerCase();
    if (command === 'quit' || command === 'exit') {
      terminal.close();
      mock.shutdown();
      return;
    }
    if (command === 'status') {
      console.log(JSON.stringify({ health: mock.getHealth(), wheels: mock.state.wheels, joints: mock.state.joints }, null, 2));
      return;
    }
    if (command === 'events') {
      console.log(JSON.stringify(mock.state.events.slice(-15), null, 2));
      return;
    }
    const tokens = command.split(/\s+/);
    if (tokens.length === 2 && Object.hasOwn(mock.state.devices, tokens[0]) && (tokens[1] === 'on' || tokens[1] === 'off')) {
      mock.setDeviceStatus(tokens[0], tokens[1] === 'on');
      return;
    }
    console.log('Unknown command. Use status, events, wheels off/on, arm off/on, hand off/on, or quit.');
  });
  process.on('SIGINT', () => {
    terminal.close();
    mock.shutdown();
  });
}

module.exports = { createMockRosServer, splitAndValidate, JOINT_BYTES, SPEED_BYTES, WHEEL_BYTES };
