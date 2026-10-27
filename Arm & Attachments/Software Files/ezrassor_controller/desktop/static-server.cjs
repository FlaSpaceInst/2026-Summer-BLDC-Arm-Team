'use strict';
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json'
};

function getAssetPath(root, requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0') || decoded.includes('\\') || decoded.split('/').includes('..')) {
    return null;
  }
  let requested = decoded;
  if (decoded === '/') {
    requested = '/index.html';
  }
  const file = path.resolve(root, '.' + requested);
  const relative = path.relative(root, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  return file;
}

function startStaticServer(root) {
  const base = path.resolve(root);
  if (!fs.existsSync(path.join(base, 'index.html'))) {
    throw new Error('Missing web export (index.html). Run desktop/build-windows.ps1 first.');
  }
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405);
      response.end();
      return;
    }
    const url = new URL(request.url, 'http://127.0.0.1');
    const asset = getAssetPath(base, url.pathname);
    if (!asset) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    fs.stat(asset, (err, stat) => {
      if (err || !stat.isFile()) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }
      const contentType = MIME[path.extname(asset).toLowerCase()] || 'application/octet-stream';
      response.writeHead(200, {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: http: https:; font-src 'self' data:; frame-src http: https:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'"
      });
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      const stream = fs.createReadStream(asset);
      stream.on('error', () => response.destroy());
      stream.pipe(response);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` });
    });
  });
}
module.exports = { startStaticServer, getAssetPath };
