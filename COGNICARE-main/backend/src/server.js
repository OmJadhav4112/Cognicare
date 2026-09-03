require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./utils/db');

// Initialize Firebase Admin SDK early
const admin = require('./config/firebaseAdmin');

// Rate limiting service
const { globalLimiter, authLimiter, endpointLimiters } = require('./services/rateLimitService');

// Warm-up and caching services
const warmupService = require('./services/warmupService');
const healthCheckService = require('./services/healthCheckService');

// Middleware
const { protect } = require('./middleware/auth');
const { roleBasedRateLimit, sensitiveOperationRateLimit } = require('./middleware/rateLimit');
const { trackHttpMetrics } = require('./middleware/monitoring');

// Route imports
const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patient');
const caregiverRoutes = require('./routes/caregiver');
const gameRoutes = require('./routes/games');
const aiRoutes = require('./routes/ai');
const contentRoutes = require('./routes/content');
const notificationRoutes = require('./routes/notifications');
const storageRoutes = require('./routes/storage');
const backupRoutes = require('./routes/backup');
const complianceRoutes = require('./routes/compliance');
const adminRoutes = require('./routes/admin');
const monitoringRoutes = require('./routes/monitoring');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
const allowedOrigins = (
  process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5176'
).split(',').map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any localhost origin in non-production environments
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS policy: origin ${origin} not allowed`));
  },
  credentials: true
}));

// Global rate limiting (applies to all requests)
app.use(globalLimiter);

// Monitoring middleware (track all requests)
app.use(trackHttpMetrics);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'DementiaCare+ API is running', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/patient', patientRoutes);
app.use('/api/caregiver', caregiverRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/metrics', monitoringRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`DementiaCare+ server running on port ${PORT}`);
  console.log(`Firebase Admin SDK initialized`);
  
  // Start warm-up service
  warmupService.start();
  
  // Start health check service
  healthCheckService.start();
  
  // Start dependency health checks (every 30 seconds)
  setInterval(async () => {
    const mongoose = require('mongoose');
    const monitoringService = require('./services/monitoringService');
    
    await monitoringService.checkDatabaseHealth(mongoose.connection);
    // Firebase and Redis checks are done asynchronously, non-blocking
  }, 30000);
  
  // Initial health check
  setTimeout(async () => {
    const mongoose = require('mongoose');
    const monitoringService = require('./services/monitoringService');
    
    await monitoringService.checkDatabaseHealth(mongoose.connection);
  }, 2000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  warmupService.stop();
  healthCheckService.stop();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;


