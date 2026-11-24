'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const { notFound, errorHandler } = require('./middleware/error');
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const claimRoutes = require('./routes/claims');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');

const app = express();

app.use(
  helmet({
    // Allow the local page and CDN-free assets to render; images come from /uploads.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: config.env === 'production' ? config.clientOrigins : true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
if (config.env !== 'test') app.use(morgan('dev'));

// Static frontend + uploaded images
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    service: 'Campus Lost and Found Portal API',
    driver: config.dbDriver,
    time: new Date().toISOString(),
  });
});

app.get('/api/meta', (req, res) => {
  res.json({
    success: true,
    categories: config.categories,
    locations: config.campusLocations,
    statuses: config.itemStatuses,
    claimStatuses: config.claimStatuses,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// SPA-ish fallback for the static pages: unknown non-API GET returns the 404 page
app.use('/api', notFound);
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.status(404).sendFile(path.join(__dirname, '..', 'public', '404.html'));
  }
  return next();
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
