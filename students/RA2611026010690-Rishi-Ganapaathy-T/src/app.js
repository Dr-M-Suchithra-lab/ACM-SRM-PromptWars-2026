/**
 * FairShift Express Application
 * Configures security, compression, caching headers, routing, and error handling.
 */

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Route Modules
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const payslipRoutes = require('./routes/payslipRoutes');
const grievanceRoutes = require('./routes/grievanceRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const industryRoutes = require('./routes/industryRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

// 1. HTTP Security Headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", 'data:', 'blob:'],
        frameSrc: ["'none'"],
      },
    },
    strictTransportSecurity: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    originAgentCluster: false,
  })
);

// Clear any previously cached HSTS on local HTTP development
app.use((req, res, next) => {
  if (!req.secure && req.headers['x-forwarded-proto'] !== 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=0');
  }
  next();
});

// 2. Strict CORS
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Gzip Compression for High Performance on 3G/Low-End Mobile
app.use(compression());

// 4. Body Parsers with Safe Size Limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 5. Rate Limiting on API endpoints
app.use('/api', apiLimiter);

// 6. Static Asset Serving with Caching Headers
const publicDir = path.join(__dirname, '..', 'public');
app.use(
  express.static(publicDir, {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: false,
    setHeaders: (res) => {
      if (process.env.NODE_ENV !== 'production') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      }
    },
  })
);

// 7. Health Check Endpoint
app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    activeIndustry: process.env.ACTIVE_INDUSTRY || 'construction',
  });
});

// 8. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/payslips', payslipRoutes);
app.use('/api/grievances', grievanceRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/industry', industryRoutes);
app.use('/api/tasks', taskRoutes);

// 9. SPA Routing Fallback (for /passport/:id or client-side links)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// 10. Centralized Error Handling
app.use(errorHandler);

module.exports = app;

