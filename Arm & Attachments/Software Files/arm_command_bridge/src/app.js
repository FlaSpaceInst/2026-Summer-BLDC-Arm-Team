'use strict';

const express = require('express');
const { CommandValidationError, commandsFromRequest } = require('./commands');

function writeCommand(serialPort, command) {
  return new Promise((resolve, reject) => {
    try {
      serialPort.write(Buffer.from([command]), (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    } catch (error) {
      reject(error);
    }
  });
}

function createApp(serialPort) {
  if (!serialPort || typeof serialPort.write !== 'function') {
    throw new TypeError('A serial port with a write method is required.');
  }

  const app = express();
  app.use(express.json({ limit: '4kb' }));

  app.get('/health', (request, response) => {
    response.status(200).json({ success: true, serialOpen: serialPort.isOpen !== false });
  });

  // The controller currently posts its arm JSON to the host root, e.g. http://IP:3000/.
  app.post('/', async (request, response, next) => {
    try {
      const commands = commandsFromRequest(request.body);
      for (const command of commands) {
        await writeCommand(serialPort, command);
      }
      response.status(200).json({ success: true, commands });
    } catch (error) {
      next(error);
    }
  });

  app.use((error, request, response, next) => {
    if (error instanceof CommandValidationError || error instanceof SyntaxError) {
      response.status(400).json({ success: false, error: error.message });
      return;
    }

    response.status(503).json({ success: false, error: 'Unable to write the arm command to serial.' });
  });

  return app;
}

module.exports = { createApp };
