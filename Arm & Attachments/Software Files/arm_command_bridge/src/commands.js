'use strict';

const { SerialPort } = require('serialport');
const { createApp } = require('./app');

const serialPath = process.env.SERIAL_PORT;
const baudRate = Number(process.env.SERIAL_BAUD_RATE || 115200);
const httpPort = Number(process.env.HTTP_PORT || 3000);

if (!serialPath) {
  console.error('SERIAL_PORT is required (for example, /dev/ttyACM0 or COM3).');
  process.exit(1);
}

const serialPort = new SerialPort({ path: serialPath, baudRate });
serialPort.on('error', (error) => console.error(`Serial error: ${error.message}`));

createApp(serialPort).listen(httpPort, '0.0.0.0', () => {
  console.log(`Arm command bridge listening on port ${httpPort}.`);
});
