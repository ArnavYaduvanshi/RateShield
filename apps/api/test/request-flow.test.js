import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { HandlerChainFactory } from '../src/factories/HandlerChainFactory.js';

function createRequestFlow({ client, rateResult }) {
  let checkedRequest;
  const repository = {
    async findByApiKey(apiKey) {
      return apiKey === client.apiKey ? client : null;
    },
  };
  const limiterFactory = {
    createLimiter() {
      return {
        async isAllowed(request) {
          checkedRequest = request;
          return rateResult;
        },
      };
    },
  };
  const chain = new HandlerChainFactory(repository, limiterFactory).buildChain();

  return {
    chain,
    getCheckedRequest: () => checkedRequest,
  };
}

function createClient(apiKey) {
  return {
    apiKey,
    clientName: 'Test client',
    planId: 'free',
    algorithm: 'token_bucket',
    customLimits: null,
  };
}

test('validates the API key and passes the extracted IP to the limiter', async () => {
  const apiKey = randomUUID();
  const flow = createRequestFlow({
    client: createClient(apiKey),
    rateResult: { allowed: true, remaining: 4, resetAt: 123 },
  });

  const result = await flow.chain.handle({
    headers: {
      'x-api-key': apiKey,
      'x-forwarded-for': '203.0.113.8, 10.0.0.1',
    },
    connectionIp: '127.0.0.1',
    userId: 'user-1',
  });

  assert.equal(result.success, true);
  assert.equal(result.remaining, 4);
  assert.equal(flow.getCheckedRequest().ip, '203.0.113.8');
  assert.equal(flow.getCheckedRequest().userId, 'user-1');
});

test('rejects requests without a client IP before checking the API key', async () => {
  let repositoryCalls = 0;
  const apiKey = randomUUID();
  const repository = {
    async findByApiKey() {
      repositoryCalls++;
      return createClient(apiKey);
    },
  };
  const chain = new HandlerChainFactory(repository, {
    createLimiter() {
      throw new Error('Limiter should not run');
    },
  }).buildChain();

  const result = await chain.handle({ headers: { 'x-api-key': apiKey } });

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 400);
  assert.equal(repositoryCalls, 0);
});

test('rejects an unknown API key without calling the limiter', async () => {
  const apiKey = randomUUID();
  const flow = createRequestFlow({
    client: createClient(randomUUID()),
    rateResult: { allowed: true, remaining: 4, resetAt: 123 },
  });

  const result = await flow.chain.handle({
    headers: { 'x-api-key': apiKey },
    connectionIp: '127.0.0.1',
  });

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 401);
  assert.equal(flow.getCheckedRequest(), undefined);
});

test('returns a rate-limit denial from the selected limiter', async () => {
  const apiKey = randomUUID();
  const flow = createRequestFlow({
    client: createClient(apiKey),
    rateResult: {
      allowed: false,
      remaining: 0,
      resetAt: 123,
      deniedBy: 'plan',
    },
  });

  const result = await flow.chain.handle({
    headers: { 'x-api-key': apiKey },
    connectionIp: '127.0.0.1',
  });

  assert.equal(result.success, false);
  assert.equal(result.statusCode, 429);
  assert.equal(result.deniedBy, 'plan');
  assert.equal(result.remaining, 0);
});
