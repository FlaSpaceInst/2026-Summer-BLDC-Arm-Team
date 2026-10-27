'use strict';
const http = require('node:http');
const https = require('node:https');
const net = require('node:net');

const MAX_BODY_BYTES = 16 * 1024;
const MAX_REPLY_BYTES = 128 * 1024;

// All app-to-rover requests are restricted to local/private addresses.
function validateRoverUrl(raw) {
  if (typeof raw !== 'string' || raw.length > 2048) {
    throw new Error('Invalid rover address.');
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Invalid rover address.');
  }
  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password || url.hash) {
    throw new Error('Rover URL must use HTTP(S) without credentials or fragments.');
  }
  let host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const version = net.isIP(host);
  let permitted = host === 'localhost' || host.endsWith('.local');
  if (version === 4) {
    const octets = host.split('.').map(Number);
    permitted = octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168) ||
      octets[0] === 127 ||
      (octets[0] === 169 && octets[1] === 254);
  } else if (version === 6) {
    permitted = host === '::1' || /^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host);
  }
  if (!permitted) {
    throw new Error('Only rover addresses on the local network are supported.');
  }
  return url;
}

function validateRequest(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid rover request.');
  }
  const url = validateRoverUrl(input.url);
  const method = input.method || 'GET';
  if (method !== 'GET' && method !== 'POST') {
    throw new Error('Unsupported rover request method.');
  }
  if (input.body !== undefined && typeof input.body !== 'string') {
    throw new Error('Rover request body must be a string.');
  }
  const body = input.body || '';
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    throw new Error('Rover request is too large.');
  }
  if (method === 'GET' && body.length) {
    throw new Error('GET requests cannot include a body.');
  }
  return { url, method, body, probe: input.probe === true };
}

// A non-CORS Node HTTP request, intentionally only available via the isolated preload bridge and validated IPC handler.
function requestRover(input, timeoutMs = 5000) {
  const { url, method, body, probe } = validateRequest(input);
  return new Promise((resolve, reject) => {
    let transport = http;
    if (url.protocol === 'https:') {
      transport = https;
    }
    const headers = { Accept: 'application/json' };
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    const request = transport.request(url, {
      method,
      headers
    }, (response) => {
      if (probe) {
        response.resume();
        resolve({ ok: true, status: response.statusCode || 0, body: '' });
        return;
      }
      let length = 0;
      const chunks = [];
      response.on('data', (chunk) => {
        length += chunk.length;
        if (length > MAX_REPLY_BYTES) {
          request.destroy(new Error('Rover response is too large.'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => {
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 300,
          status: response.statusCode || 0,
          body: Buffer.concat(chunks).toString('utf8')
        });
      });
      response.on('error', reject);
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error('Rover request timed out.')));
    request.on('error', reject);
    if (method === 'POST') {
      request.end(body);
    } else {
      request.end();
    }
  });
}
module.exports = { validateRoverUrl, validateRequest, requestRover };
