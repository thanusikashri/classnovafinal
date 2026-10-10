const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const { env } = require('./config/env');
const connectDB = require('./config/db');
const { errorHandler } = require('./middlewares/error.middleware');

// Route files
const authRoutes = require('./routes/auth.routes');

// Connect to database
connectDB();

const app = express();

// Body parser
app.use(express.json());

// Security middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(cors({ origin: env.CLIENT_URL }));

// Mount routers
app.use('/api/auth', authRoutes);

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
