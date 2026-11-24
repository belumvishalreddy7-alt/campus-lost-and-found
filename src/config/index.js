'use strict';

require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campus_lost_found',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  dbDriver: process.env.DB_DRIVER === 'memory' ? 'memory' : 'mongo',
  seedOnStart: String(process.env.SEED_ON_START || 'true') === 'true',
  uploadDir: 'public/uploads',
  maxUploadBytes: 2 * 1024 * 1024,
  categories: [
    'Electronics',
    'Wallet & Cards',
    'Keys',
    'ID Card & Documents',
    'Books & Stationery',
    'Bags & Luggage',
    'Clothing & Accessories',
    'Sports Equipment',
    'Jewellery',
    'Other',
  ],
  campusLocations: [
    'Central Library',
    'Academic Block A',
    'Academic Block B',
    'Computer Science Lab',
    'Engineering Workshop',
    'Administration Building',
    'Cafeteria / Food Court',
    'Hostel Block A',
    'Hostel Block B',
    'Sports Complex',
    'Auditorium',
    'Bus Bay / Parking',
  ],
  itemStatuses: ['open', 'claimed', 'returned'],
  claimStatuses: ['pending', 'approved', 'rejected'],
  pageSize: 9,
  maxPageSize: 50,
};

if (config.env === 'production' && config.jwtSecret === 'dev-only-insecure-secret-change-me') {
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = config;
