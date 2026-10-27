'use strict';

const { SerialPort } = require('serialport');
const { createApp } = require('./app');
const { readSerialConfiguration } = require('./config');

function openPort(path, label, baudRate) {
  if (!path) {
    return null;
  }
  const port = new SerialPort({ path, baudRate });
  port.on('open', () => console.log(label + ' Arduino connected on ' + path));
  port.on('close', () => console.error(label + ' Arduino disconnected from ' + path));
  port.on('error', (error) => console.error(label + ' serial error: ' + error.message));
  return port;
}

function main() {
  let config;
  try {
    config = readSerialConfiguration(process.env);
  } catch (error) {
    console.error(error.message);
    console.error('WHEELS_SERIAL_PORT is optional; leave it unset if the rover drive service owns the wheel Arduino.');
    process.exitCode = 1;
    return;
  }

  const ports = {
    arm: openPort(config.armPath, 'ARM', config.baudRate),
    hand: openPort(config.handPath, 'HAND', config.baudRate),
    wheels: openPort(config.wheelsPath, 'WHEELS', config.baudRate)
  };

  createApp(ports).listen(config.httpPort, '0.0.0.0', () => {
    console.log('RE-RASSOR arm bridge listening on port ' + config.httpPort);
    if (!ports.wheels) {
      console.log('Base rotation is disabled in this bridge. Rover drive service retains wheels serial ownership.');
    }
  });
}

if (require.main === module) {
  main();
}

module.exports = { main };
