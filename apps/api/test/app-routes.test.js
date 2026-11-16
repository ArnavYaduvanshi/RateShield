import assert from 'node:assert/strict';
import test from 'node:test';
import app from '../src/app.js';

test('mounts the rate limit endpoint and returns a correlation ID', async () => {
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/check`, {
      method: 'POST',
    });
    const body = await response.json();

    assert.equal(response.status, 401);
    assert.equal(body.message, 'Missing x-api-key header');
    assert.ok(response.headers.get('x-correlation-id'));
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
