const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { env } = require('./config/env');
const { connectDB, isDbConnected } = require('./config/db');
const { errorHandler } = require('./middlewares/error.middleware');

// Route files
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const classRoutes = require('./routes/class.routes');
const notificationRoutes = require('./routes/notification.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const adminRoutes = require('./routes/admin.routes');
const attendanceRoutes = require('./routes/attendance.routes');
const leaveRoutes = require('./routes/leave.routes');
const aiRoutes = require('./routes/ai.routes');
const assignmentRoutes = require('./routes/assignment.routes');

const demoRoutes = require('./routes/demo.routes');

// Connect to database only when NOT in demo mode
if (!env.DEMO_MODE) {
  connectDB();
} else {
  console.log('----------------------------------------------------');
  console.log('🚀 ClassNova is running in DEMO MODE (In-Memory)');
  console.log('   - MongoDB Atlas connection: Skipped');
  console.log('   - Storage: Isolated in-memory synthetic mock store');
  console.log('   - Notice: Demo changes are temporary and not persistent');
  console.log('----------------------------------------------------');
}

const app = express();

// Body parser
app.use(express.json());

// Security middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(cors({ origin: env.CLIENT_URL }));

// Health check endpoint (for pinging server and db/demo status)
app.get('/api/health', (req, res) => {
  const dbConnected = isDbConnected();
  res.status(env.DEMO_MODE || dbConnected ? 200 : 503).json({
    success: true,
    status: env.DEMO_MODE ? 'demo_mode' : (dbConnected ? 'healthy' : 'database_unavailable'),
    mode: env.DEMO_MODE ? 'demo' : 'production_or_dev',
    database: env.DEMO_MODE ? 'mock_isolated_store' : (dbConnected ? 'connected' : 'disconnected'),
    timestamp: new Date().toISOString()
  });
});

if (env.DEMO_MODE) {
  // Mount demo routes directly on /api
  app.use('/api', demoRoutes);
} else {
  // Normal mode: Guard database-dependent API routes when MongoDB connection is unavailable
  app.use('/api', (req, res, next) => {
    // Allow health endpoint through
    if (req.path === '/health') {
      return next();
    }
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Database service is currently unavailable. Please verify MongoDB Atlas connection and IP whitelist in Network Access.',
        code: 'DATABASE_UNAVAILABLE'
      });
    }
    next();
  });

  // Mount standard routers
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/classes', classRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/leaves', leaveRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/assignments', assignmentRoutes);
}

// Error handler middleware
app.use(errorHandler);

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
