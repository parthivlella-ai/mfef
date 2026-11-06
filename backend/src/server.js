const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { connectDB, getDbStatus } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route files
const authRoutes = require('./routes/authRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Load environment variables
dotenv.config();

// Connect to MongoDB Database (Atlas in production or local in dev)
connectDB();

const app = express();

// Parse allowed CORS origins from CLIENT_URL (supports comma-separated list)
const rawClientUrl = process.env.CLIENT_URL || '';
const customOrigins = rawClientUrl
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

// CORS Configuration for Local, Vercel, Render, and Mobile clients
const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests with no origin (curl, mobile, Postman, health probes)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/+$/, '');

    // Allow development, wildcard, local ports, Vercel, Render, or configured domains
    const isAllowed =
      process.env.NODE_ENV !== 'production' ||
      customOrigins.includes('*') ||
      customOrigins.includes(cleanOrigin) ||
      cleanOrigin.endsWith('.onrender.com') ||
      cleanOrigin.endsWith('.vercel.app') ||
      cleanOrigin.endsWith('.netlify.app') ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin);

    if (isAllowed) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

// Allow Chrome Private Network Access (PNA) for cross-port / localhost development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});

app.use(cors(corsOptions));
// Handle preflight OPTIONS requests across all routes
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Root endpoint for platform health and verification
app.get('/', (req, res) => {
  res.json({
    success: true,
    appName: 'MediTrack API',
    description: 'Smart Medicine Inventory and Expiry Management System API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    healthCheck: '/api/health',
    timestamp: new Date().toISOString(),
  });
});

// System Health & Diagnostics endpoint (used by Render Health Check & Dev Monitor)
app.get('/api/health', (req, res) => {
  const dbStatus = getDbStatus();
  res.status(200).json({
    status: 'online',
    appName: 'MediTrack API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: dbStatus,
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

let server;
// Start standalone HTTP listener only when executed directly (node server.js), not when required by Vercel serverless / tests
if (require.main === module && !process.env.VERCEL) {
  server = app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` MediTrack API Server running on port ${PORT}`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Health check: http://127.0.0.1:${PORT}/api/health`);
    console.log(` Allowed Origins: Localhost, 127.0.0.1, Vercel, Render`);
    console.log(`====================================================`);
  });
}

// Graceful shutdown handling for container restarts
const handleShutdown = (signal) => {
  console.log(`[Server] ${signal} signal received. Closing HTTP server gracefully...`);
  if (server) {
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      mongoose.connection.close(false).then(() => {
        console.log('[Server] MongoDB connection closed.');
        process.exit(0);
      }).catch(() => process.exit(0));
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
});

module.exports = app;
