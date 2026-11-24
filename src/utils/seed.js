'use strict';

/** CLI entry point: `npm run seed` - fills the configured database with sample data. */
const config = require('../config');
const store = require('../store');
const { seedDatabase } = require('./seedData');

(async () => {
  try {
    await store.connect(config.mongoUri);
    const summary = await seedDatabase({ onlyIfEmpty: false });
    // eslint-disable-next-line no-console
    console.log(
      `Seeded database with ${summary.items} items, ${summary.users} users and ${summary.claims} claims using the "${store.driver}" driver.`
    );
    await store.disconnect();
    process.exit(0);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Seeding failed:', err.message);
    process.exit(1);
  }
})();
