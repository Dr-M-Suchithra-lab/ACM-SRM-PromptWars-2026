/**
 * Test for /healthz endpoint
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { Socket } = require('net');
const app = require('../src/app');

function testHealthz() {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    Object.defineProperty(socket, 'remoteAddress', { value: '127.0.0.1' });
    const req = new http.IncomingMessage(socket);
    req.ip = '127.0.0.1';
    req.url = '/healthz';
    req.method = 'GET';
    req.headers = { host: 'localhost' };

    let raw = '';
    const res = new http.ServerResponse(req);
    res.write = (chunk) => {
      if (chunk) raw += chunk.toString();
      return true;
    };
    res.end = (chunk) => {
      if (chunk) raw += chunk.toString();
      resolve({ status: res.statusCode, data: JSON.parse(raw) });
    };

    try {
      app(req, res);
      req.emit('end');
    } catch (err) {
      reject(err);
    }
  });
}

describe('Server Health Endpoint', () => {
  it('GET /healthz returns status 200 OK with timestamp and active industry', async () => {
    const res = await testHealthz();
    assert.equal(res.status, 200);
    assert.equal(res.data.status, 'ok');
    assert.ok(res.data.timestamp);
    assert.ok(typeof res.data.uptimeSeconds === 'number');
    assert.ok(res.data.activeIndustry);
  });
});

