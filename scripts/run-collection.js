'use strict';

/**
 * Replays the exported Postman collection against a running instance and executes each
 * request's test script, so the collection can be verified without the Postman GUI.
 *
 *   npm run test:collection                     # boots an in-memory server, seeds, replays
 *   BASE_URL=https://your-app.example npm run test:collection   # replays against a live URL
 *
 * Requires chai (dev dependency) for the assertion API used in the collection scripts.
 */
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

const fs = require('fs');
const path = require('path');
const chai = require('chai');

const collectionPath = path.join(__dirname, '..', 'postman', 'Campus_Lost_and_Found.postman_collection.json');
const environmentPath = path.join(__dirname, '..', 'postman', 'Local.postman_environment.json');

const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));

async function startLocalServer() {
  process.env.DB_DRIVER = process.env.DB_DRIVER || 'memory';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'collection-runner-secret';
  process.env.SEED_ON_START = 'false';

  const app = require('../src/app');
  const store = require('../src/store');
  const { seedDatabase } = require('../src/utils/seedData');

  await store.connect();
  await seedDatabase({ reset: true });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  return {
    baseUrl: `http://127.0.0.1:${server.address().port}`,
    close: async () => {
      server.close();
      await store.disconnect();
    },
  };
}

const resolveVars = (text, vars) =>
  String(text ?? '')
    .replace(/\{\{\$timestamp\}\}/g, String(Date.now()))
    .replace(/\{\{([^}]+)\}\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : ''));

async function main() {
  const local = process.env.BASE_URL ? null : await startLocalServer();

  const vars = {};
  environment.values.forEach((entry) => {
    vars[entry.key] = entry.value;
  });
  collection.variable.forEach((entry) => {
    if (!(entry.key in vars)) vars[entry.key] = entry.value;
  });
  vars.baseUrl = process.env.BASE_URL || local.baseUrl;

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (const folder of collection.item) {
    console.log(`\n== ${folder.name} ==`);
    for (const request of folder.item) {
      const url = resolveVars(request.request.url.raw, vars);
      const headers = {};
      request.request.header.forEach((header) => {
        headers[header.key] = resolveVars(header.value, vars);
      });

      const init = { method: request.request.method, headers };
      if (request.request.body && request.request.body.mode === 'raw') {
        init.body = resolveVars(request.request.body.raw, vars);
      }

      const response = await fetch(url, init);
      let json = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }

      const results = [];
      const pm = {
        response: {
          code: response.status,
          json: () => json,
          to: { have: { status: (code) => chai.expect(response.status, 'status').to.equal(code) } },
        },
        expect: chai.expect,
        collectionVariables: {
          get: (key) => vars[key],
          set: (key, value) => {
            vars[key] = value;
          },
        },
        test: (name, fn) => {
          try {
            fn();
            results.push(true);
          } catch (error) {
            results.push(false);
            failures.push(`${request.name} :: ${name} -> ${error.message}`);
          }
        },
      };

      const scripts = request.event
        .filter((event) => event.listen === 'test')
        .flatMap((event) => event.script.exec);

      const AsyncFunction = Object.getPrototypeOf(async function noop() {}).constructor;
      try {
        await new AsyncFunction('pm', scripts.join('\n'))(pm);
      } catch (error) {
        results.push(false);
        failures.push(`${request.name} :: script error -> ${error.message}`);
      }

      const okCount = results.filter(Boolean).length;
      passed += okCount;
      failed += results.length - okCount;
      const mark = okCount === results.length ? 'PASS' : 'FAIL';
      console.log(
        `${mark}  ${request.request.method.padEnd(6)} ${request.request.url.raw.replace('{{baseUrl}}', '')} -> ${response.status}  (${okCount}/${results.length} assertions)`
      );
    }
  }

  console.log(`\nAssertions: ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach((failure) => console.log(` - ${failure}`));
  }

  if (local) await local.close();
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error('Collection run failed:', error.message);
  process.exit(1);
});
