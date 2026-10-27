'use strict';

// Configure distinct USB serial connections. The rover drive service remains the
// sole owner of the wheels Arduino unless WHEELS_SERIAL_PORT is explicitly set.
function readSerialConfiguration(env) {
  const armPath = (env.ARM_SERIAL_PORT || '').trim();
  const handPath = (env.HAND_SERIAL_PORT || '').trim();
  const wheelsPath = (env.WHEELS_SERIAL_PORT || '').trim();

  if (!armPath || !handPath) {
    throw new Error('ARM_SERIAL_PORT and HAND_SERIAL_PORT are required.');
  }

  const configuredPaths = [armPath, handPath];
  if (wheelsPath) {
    configuredPaths.push(wheelsPath);
  }
  const comparablePaths = configuredPaths.map((path) => {
    if (/^COM[0-9]+$/i.test(path)) {
      return path.toUpperCase();
    }
    return path;
  });
  if (new Set(comparablePaths).size !== comparablePaths.length) {
    throw new Error('Every Arduino must have a different serial device path.');
  }

  const baudRate = Number(env.SERIAL_BAUD_RATE || 115200);
  const httpPort = Number(env.HTTP_PORT || 3000);
  if (!Number.isInteger(baudRate) || baudRate <= 0) {
    throw new Error('SERIAL_BAUD_RATE must be a positive integer.');
  }
  if (!Number.isInteger(httpPort) || httpPort < 1 || httpPort > 65535) {
    throw new Error('HTTP_PORT must be between 1 and 65535.');
  }

  return { armPath, handPath, wheelsPath, baudRate, httpPort };
}

module.exports = { readSerialConfiguration };
