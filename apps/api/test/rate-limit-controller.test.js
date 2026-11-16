import assert from 'node:assert/strict';
import test from 'node:test';
import { RateLimitController } from '../src/controllers/RateLimitController.js';

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

for (const { statusCode, error, message } of [
  { statusCode: 400, error: 'Bad Request', message: 'Unable to determine client Ip address' },
  { statusCode: 401, error: 'Unauthorized', message: 'Invalid API key' },
]) {
  test(`returns ${statusCode} request failures without labeling them as rate limits`, async () => {
    const controller = new RateLimitController({
      async check() {
        return { success: false, statusCode, error: message };
      },
    });
    const response = createResponse();

    await controller.check(
      { apiKey: 'test-key', ip: '127.0.0.1', correlationId: 'test-id' },
      response,
      (error) => {
        throw error;
      },
    );

    assert.equal(response.statusCode, statusCode);
    assert.equal(response.body.error, error);
    assert.equal(response.body.message, message);
    assert.equal(response.headers['Retry-After'], undefined);
  });
}
