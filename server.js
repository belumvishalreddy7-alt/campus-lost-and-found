'use strict';

const app = require('./src/app');
const config = require('./src/config');
const store = require('./src/store');
const { seedDatabase } = require('./src/utils/seedData');

async function start() {
  if (!config.mongoUri) {
  throw new Error('MONGO_URI is missing in Render Environment Variables');
}

console.log('[db] MongoDB URI configured:', {
  present: true,
  atlas: config.mongoUri.startsWith('mongodb+srv://'),
  environment: config.env
});

await store.connect(config.mongoUri);
  // eslint-disable-next-line no-console
  console.log(`[db] connected using "${store.driver}" driver`);

  if (config.seedOnStart) {
    const summary = await seedDatabase({ onlyIfEmpty: true });
    if (summary.seeded) {
      // eslint-disable-next-line no-console
      console.log(`[seed] inserted ${summary.items} items, ${summary.users} users, ${summary.claims} claims`);
    }
  }

  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Campus Lost and Found Portal running on http://localhost:${config.port} (${config.env})`);
  });

  const shutdown = async (signal) => {
    // eslint-disable-next-line no-console
    console.log(`\n[server] ${signal} received, shutting down`);
    server.close(async () => {
      await store.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
