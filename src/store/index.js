'use strict';

/**
 * Data-store selector.
 *  - mongo  (default): MongoDB via Mongoose - the production path.
 *  - memory (DB_DRIVER=memory): in-memory arrays, used by the offline test suite.
 */
const config = require('../config');

const store = config.dbDriver === 'memory' ? require('./memory') : require('./mongo');

module.exports = store;
