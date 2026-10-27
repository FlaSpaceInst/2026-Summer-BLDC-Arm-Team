'use strict';

const { createApp } = require('../src/app');

function mockPort(name) {
  return {
    isOpen: true,
    write(payload, callback) {
      const value = Buffer.isBuffer(payload) ? '0x' + payload[0].toString(16).padStart(2, '0') : JSON.stringify(payload.trim());
      console.log(name + ' <- ' + value);
      callback(null);
    }
  };
}

createApp({
  arm: mockPort('ARM'),
  hand: mockPort('HAND'),
  wheels: mockPort('WHEELS')
}).listen(3000, '127.0.0.1', () => {
  console.log('Mock bridge at http://127.0.0.1:3000/health');
  console.log('No Arduino connections or motors are accessed.');
});
